import type { ProjectSortBy, ProjectStatus } from './project.constants.js';
import type { SortDirection } from '../customers/customer.constants.js';

export interface Project {
  id: string;
  customerId: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  ownerUserId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  actorUserId: string;
  customerId: string;
  title: string;
  description?: string | undefined;
  status?: ProjectStatus | undefined;
  ownerUserId: string;
}

export interface UpdateProjectInput {
  actorUserId: string;
  customerId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  status?: ProjectStatus | undefined;
  ownerUserId?: string | undefined;
}

export interface ArchiveProjectInput {
  actorUserId: string;
}

export interface ListProjectsInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  status?: ProjectStatus | undefined;
  customerId?: string | undefined;
  ownerUserId?: string | undefined;
  sortBy?: ProjectSortBy | undefined;
  sortDirection?: SortDirection | undefined;
  includeArchived?: boolean | undefined;
}
