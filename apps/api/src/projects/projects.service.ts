import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  canTransitionProjectStatus,
  isForward,
  statusFromStage,
} from "@stoneboyz/domain";
import type {
  ArchiveProjectInput,
  CreateProjectInput,
  ListProjectsInput,
  Project,
  UpdateProjectInput,
  UpdateProjectStageInput,
} from "@stoneboyz/domain";
import type { DatabaseError } from "pg";
import { EventBus } from "../events/event-bus.js";
import {
  buildProjectArchivedPayload,
  buildProjectCreatedPayload,
  buildProjectStageChangedPayload,
  buildProjectStatusChangedPayload,
  buildProjectUpdatedPayload,
} from "./project-events.js";
import {
  InvalidProjectCursorError,
  ProjectsRepository,
} from "./projects.repository.js";

interface PaginatedProjectsResponse {
  data: Project[];
  nextCursor: string | null;
  hasMore: boolean;
}

const FOREIGN_KEY_VIOLATION_CODE = "23503";

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === "object" && error !== null && "code" in error;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async list(input: ListProjectsInput): Promise<PaginatedProjectsResponse> {
    try {
      return await this.projectsRepository.list({
        ...input,
        limit: input.limit ?? 25,
        sortBy: input.sortBy ?? "updatedAt",
        sortDirection: input.sortDirection ?? "desc",
      });
    } catch (error) {
      if (error instanceof InvalidProjectCursorError) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: { cursor: ["Invalid cursor"] },
        });
      }

      throw error;
    }
  }

  async create(input: CreateProjectInput): Promise<Project> {
    try {
      const project = await this.projectsRepository.create(input);
      this.eventBus.emit(
        "project.created",
        buildProjectCreatedPayload(project, input.actorUserId),
      );
      return project;
    } catch (error) {
      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "Customer or Job Template not found",
        });
      }

      throw error;
    }
  }

  async getById(projectId: string): Promise<Project> {
    const project = await this.projectsRepository.findById(projectId);

    if (project === null) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    return project;
  }

  async update(projectId: string, input: UpdateProjectInput): Promise<Project> {
    try {
      let previousStatus: Project["status"] | undefined;

      if (input.status !== undefined) {
        const current = await this.projectsRepository.findById(projectId);

        if (current === null) {
          throw new NotFoundException({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        if (!canTransitionProjectStatus(current.status, input.status)) {
          throw new BadRequestException({
            code: "INVALID_STATUS_TRANSITION",
            message: `Cannot transition project status from ${current.status} to ${input.status}`,
            details: { from: current.status, to: input.status },
          });
        }

        previousStatus = current.status;
      }

      const project = await this.projectsRepository.update(projectId, input);

      if (project === null) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const changedFields = Object.keys(input).filter((key) => {
        const typedKey = key as keyof UpdateProjectInput;
        return typedKey !== "actorUserId" && input[typedKey] !== undefined;
      });

      this.eventBus.emit(
        "project.updated",
        buildProjectUpdatedPayload(projectId, input.actorUserId, changedFields),
      );

      if (
        input.status !== undefined &&
        previousStatus !== undefined &&
        previousStatus !== input.status
      ) {
        this.eventBus.emit(
          "project.status_changed",
          buildProjectStatusChangedPayload(
            projectId,
            input.actorUserId,
            previousStatus,
            input.status,
          ),
        );
      }

      return project;
    } catch (error) {
      if (isDatabaseError(error) && error.code === FOREIGN_KEY_VIOLATION_CODE) {
        throw new NotFoundException({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      throw error;
    }
  }

  async setStage(
    projectId: string,
    input: UpdateProjectStageInput,
    source: "manual" | "auto" = "manual",
  ): Promise<Project> {
    const current = await this.projectsRepository.findByIdAnyState(projectId);

    if (current === null) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    if (current.archivedAt !== null) {
      throw new ConflictException({
        code: "PROJECT_ARCHIVED",
        message: "Cannot change the stage of an archived project",
      });
    }

    if (input.stage === current.pipelineStage) {
      return current;
    }

    if (
      !isForward(current.pipelineStage, input.stage) &&
      source === "manual" &&
      input.allowBackward !== true
    ) {
      throw new ConflictException({
        code: "BACKWARD_STAGE_NOT_ALLOWED",
        message: `Cannot move stage backward from ${current.pipelineStage} to ${input.stage} without allowBackward`,
        details: { from: current.pipelineStage, to: input.stage },
      });
    }

    const status = statusFromStage(input.stage);
    const project = await this.projectsRepository.updateStage(projectId, {
      stage: input.stage,
      status,
    });

    if (project === null) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    this.eventBus.emit(
      "project.stage_changed",
      buildProjectStageChangedPayload(
        projectId,
        input.actorUserId,
        current.pipelineStage,
        input.stage,
        source,
      ),
    );

    return project;
  }

  async archive(
    projectId: string,
    input: ArchiveProjectInput,
  ): Promise<Project> {
    const project = await this.projectsRepository.archive(projectId, input);

    if (project === null) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Customer or Job Template not found",
      });
    }

    this.eventBus.emit(
      "project.archived",
      buildProjectArchivedPayload(
        projectId,
        project.customerId,
        input.actorUserId,
      ),
    );

    return project;
  }
}
