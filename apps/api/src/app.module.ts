import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "./auth/roles.guard.js";
import { SessionAuthGuard } from "./auth/session-auth.guard.js";
import { CustomerAddressesController } from "./customers/customer-addresses.controller.js";
import { CustomerAddressesRepository } from "./customers/customer-addresses.repository.js";
import { CustomerAddressesService } from "./customers/customer-addresses.service.js";
import { CustomerContactsController } from "./customers/customer-contacts.controller.js";
import { CustomerContactsRepository } from "./customers/customer-contacts.repository.js";
import { CustomerContactsService } from "./customers/customer-contacts.service.js";
import { CustomerNotesController } from "./customers/customer-notes.controller.js";
import { CustomerNotesRepository } from "./customers/customer-notes.repository.js";
import { CustomerNotesService } from "./customers/customer-notes.service.js";
import { ActivityNotesModule } from "./activity-notes/activity-notes.module.js";
import { ActivityTypesModule } from "./activity-types/activity-types.module.js";
import { AssigneesModule } from "./assignees/assignees.module.js";
import { CustomersController } from "./customers/customers.controller.js";
import { CustomersRepository } from "./customers/customers.repository.js";
import { CustomersService } from "./customers/customers.service.js";
import { JobNotesModule } from "./job-notes/job-notes.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { ReportsModule } from "./reports/reports.module.js";
import { PipelineModule } from "./pipeline/pipeline.module.js";
import { ProjectPipelineListener } from "./pipeline/project-pipeline.listener.js";
import { PortalModule } from "./portal/portal.module.js";
import { databaseProvider } from "./database.provider.js";
import { EmailModule } from "./email/email.module.js";
import { EventsModule } from "./events/events.module.js";
import { InventoryModule } from "./inventory/inventory.module.js";
import { HealthController } from "./health.controller.js";
import { ProjectsController } from "./projects/projects.controller.js";
import { ProjectsRepository } from "./projects/projects.repository.js";
import { ProjectsService } from "./projects/projects.service.js";
import { OrdersController } from "./orders/orders.controller.js";
import { OrdersRepository } from "./orders/orders.repository.js";
import { OrdersService } from "./orders/orders.service.js";
import { PriceListItemsRepository } from "./price-lists/price-list-items.repository.js";
import { PriceListsModule } from "./price-lists/price-lists.module.js";
import { QuoteAreasController } from "./quotes/quote-areas.controller.js";
import { QuoteAreasRepository } from "./quotes/quote-areas.repository.js";
import { QuoteAreasService } from "./quotes/quote-areas.service.js";
import { QuoteMeasurementsController } from "./quotes/quote-measurements.controller.js";
import { QuoteMeasurementsRepository } from "./quotes/quote-measurements.repository.js";
import { QuoteMeasurementsService } from "./quotes/quote-measurements.service.js";
import {
  QuotePricingController,
  QuotePricingSelectionsController,
} from "./quotes/quote-pricing.controller.js";
import { QuotePricingRepository } from "./quotes/quote-pricing.repository.js";
import { QuotePricingSelectionsRepository } from "./quotes/quote-pricing-selections.repository.js";
import { QuotePricingService } from "./quotes/quote-pricing.service.js";
import { QuoteDrawingController } from "./quotes/quote-drawing.controller.js";
import { QuoteDrawingRepository } from "./quotes/quote-drawing.repository.js";
import { QuoteDrawingService } from "./quotes/quote-drawing.service.js";
import { QuotesController } from "./quotes/quotes.controller.js";
import { QuotesRepository } from "./quotes/quotes.repository.js";
import { QuotesService } from "./quotes/quotes.service.js";
import { QuoteNotesModule } from "./quote-notes/quote-notes.module.js";
import { ScheduledEventsModule } from "./scheduling/scheduled-events.module.js";
import { UsersModule } from "./users/users.module.js";
import { AttachmentsModule } from "./attachments/attachments.module.js";
import { IssuesModule } from "./issues/issues.module.js";
import { JobActivitiesModule } from "./job-activities/job-activities.module.js";
import { JobTemplatesModule } from "./job-templates/job-templates.module.js";
import { PhasesModule } from "./phases/phases.module.js";
import { TagsModule } from "./tags/tags.module.js";
import { CalendarViewsModule } from "./calendar-views/calendar-views.module.js";
import { ShopSettingsModule } from "./shop-settings/shop-settings.module.js";

@Module({
  imports: [
    ActivityNotesModule,
    ActivityTypesModule,
    AssigneesModule,
    CalendarViewsModule,
    AttachmentsModule,
    DashboardModule,
    EmailModule,
    EventsModule,
    InventoryModule,
    IssuesModule,
    JobActivitiesModule,
    JobNotesModule,
    JobTemplatesModule,
    PhasesModule,
    PipelineModule,
    PortalModule,
    PriceListsModule,
    QuoteNotesModule,
    ReportsModule,
    ScheduledEventsModule,
    ShopSettingsModule,
    TagsModule,
    UsersModule,
  ],
  controllers: [
    HealthController,
    CustomersController,
    CustomerContactsController,
    CustomerAddressesController,
    CustomerNotesController,
    ProjectsController,
    QuotesController,
    QuoteAreasController,
    QuoteMeasurementsController,
    QuotePricingSelectionsController,
    QuotePricingController,
    QuoteDrawingController,
    OrdersController,
  ],
  providers: [
    databaseProvider,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    CustomersRepository,
    CustomersService,
    CustomerContactsRepository,
    CustomerContactsService,
    CustomerAddressesRepository,
    CustomerAddressesService,
    CustomerNotesRepository,
    CustomerNotesService,
    ProjectsRepository,
    ProjectsService,
    QuotesRepository,
    QuotesService,
    QuoteAreasRepository,
    QuoteAreasService,
    QuoteMeasurementsRepository,
    QuoteMeasurementsService,
    PriceListItemsRepository,
    QuotePricingRepository,
    QuotePricingSelectionsRepository,
    QuotePricingService,
    QuoteDrawingRepository,
    QuoteDrawingService,
    OrdersRepository,
    OrdersService,
    ProjectPipelineListener,
  ],
})
export class AppModule {}
