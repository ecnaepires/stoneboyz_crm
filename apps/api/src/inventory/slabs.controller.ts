import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  archiveSlabSchema,
  createSlabSchema,
  cutSlabSchema,
  findMaterialSchema,
  listSlabsSchema,
  updateSlabSchema,
} from "@stoneboyz/domain";
import * as multer from "multer";
import * as path from "path";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { Roles } from "../auth/roles.decorator.js";
import { StorageService } from "../storage/storage.service.js";
import { SlabsService } from "./slabs.service.js";

const memStorage = multer.memoryStorage();

const slabIdSchema = z.string().uuid();
const releaseToShopSchema = z.object({ reason: z.string().min(1) });

const parseLimit = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? value : parsed;
};

const formatZodError = (error: z.ZodError): Record<string, string[]> =>
  z.flattenError(error).fieldErrors;

const badRequest = (details: Record<string, string[]>): BadRequestException => {
  return new BadRequestException({
    code: "VALIDATION_ERROR",
    message: "Request validation failed",
    details,
  });
};

@Controller("inventory/slabs")
export class SlabsController {
  constructor(
    private readonly slabsService: SlabsService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async list(@Query() query: Record<string, unknown>) {
    const parsedQuery = listSlabsSchema.safeParse({
      ...query,
      limit: parseLimit(query["limit"]),
    });

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.slabsService.list(parsedQuery.data);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() actorUserId: string) {
    const parsedBody = createSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.slabsService.create({ ...parsedBody.data, actorUserId });
  }

  @Get("find-material")
  async findMaterial(@Query() query: Record<string, unknown>) {
    const parsedQuery = findMaterialSchema.safeParse(query);

    if (!parsedQuery.success) {
      throw badRequest(formatZodError(parsedQuery.error));
    }

    return this.slabsService.findMaterial(parsedQuery.data);
  }

  @Get(":slabId")
  async getById(@Param("slabId") slabId: string) {
    return this.slabsService.getById(this.parseSlabId(slabId));
  }

  @Patch(":slabId")
  async update(
    @Param("slabId") slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string,
  ) {
    const parsedBody = updateSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.slabsService.update(this.parseSlabId(slabId), {
      ...parsedBody.data,
      actorUserId,
    });
  }

  @Delete(":slabId")
  @HttpCode(200)
  async archive(
    @Param("slabId") slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string,
  ) {
    const parsedBody = archiveSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.slabsService.archive(this.parseSlabId(slabId), {
      ...parsedBody.data,
      actorUserId,
    });
  }

  @Post(":slabId/cut")
  @HttpCode(200)
  async cut(
    @Param("slabId") slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string,
  ) {
    const parsedBody = cutSlabSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.slabsService.cut(this.parseSlabId(slabId), {
      ...parsedBody.data,
      actorUserId,
      remnants: parsedBody.data.remnants?.map((remnant) => ({
        ...remnant,
        actorUserId,
      })),
    });
  }

  @Post(":slabId/release-to-shop")
  @HttpCode(200)
  @Roles("admin", "inventory_manager")
  async releaseToShop(
    @Param("slabId") slabId: string,
    @Body() body: unknown,
    @CurrentUser() actorUserId: string,
  ) {
    const parsedBody = releaseToShopSchema.safeParse(body);

    if (!parsedBody.success) {
      throw badRequest(formatZodError(parsedBody.error));
    }

    return this.slabsService.releaseToShop(
      this.parseSlabId(slabId),
      actorUserId,
      parsedBody.data.reason,
    );
  }

  @Post(":slabId/images")
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memStorage,
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param("slabId") slabId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() _actorUserId: string,
  ) {
    if (!file)
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "No image file provided",
        details: {},
      });

    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Only jpg, jpeg, png, and webp images are allowed",
        details: {},
      });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const url = await this.storageService.uploadFile(
      filename,
      file.buffer,
      file.mimetype,
    );
    const slab = await this.slabsService.addImageUrl(
      this.parseSlabId(slabId),
      url,
    );
    if (!slab) throw new NotFoundException("Slab not found");
    return slab;
  }

  @Delete(":slabId/images")
  @HttpCode(200)
  async deleteImage(
    @Param("slabId") slabId: string,
    @Body("url") url: string,
    @CurrentUser() _actorUserId: string,
  ) {
    if (!url)
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "url is required",
        details: {},
      });
    const slab = await this.slabsService.removeImageUrl(
      this.parseSlabId(slabId),
      url,
    );
    if (!slab) throw new NotFoundException("Slab not found");
    return slab;
  }

  private parseSlabId(slabId: string): string {
    const parsedSlabId = slabIdSchema.safeParse(slabId);

    if (!parsedSlabId.success) {
      throw badRequest({ slabId: ["Invalid UUID"] });
    }

    return parsedSlabId.data;
  }
}
