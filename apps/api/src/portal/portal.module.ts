import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database.module.js";
import { PortalController } from "./portal.controller.js";
import { PortalService } from "./portal.service.js";

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
  ],
  providers: [PortalService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class PortalModule {}
