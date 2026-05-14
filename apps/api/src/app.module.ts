import { Module } from '@nestjs/common';
import { CustomerAddressesController } from './customers/customer-addresses.controller.js';
import { CustomerAddressesRepository } from './customers/customer-addresses.repository.js';
import { CustomerAddressesService } from './customers/customer-addresses.service.js';
import { CustomerContactsController } from './customers/customer-contacts.controller.js';
import { CustomerContactsRepository } from './customers/customer-contacts.repository.js';
import { CustomerContactsService } from './customers/customer-contacts.service.js';
import { CustomerNotesController } from './customers/customer-notes.controller.js';
import { CustomerNotesRepository } from './customers/customer-notes.repository.js';
import { CustomerNotesService } from './customers/customer-notes.service.js';
import { CustomersController } from './customers/customers.controller.js';
import { CustomersRepository } from './customers/customers.repository.js';
import { CustomersService } from './customers/customers.service.js';
import { EventsModule } from './events/events.module.js';
import { HealthController } from './health.controller.js';
import { ProjectsController } from './projects/projects.controller.js';
import { ProjectsRepository } from './projects/projects.repository.js';
import { ProjectsService } from './projects/projects.service.js';
import { QuotesController } from './quotes/quotes.controller.js';
import { QuotesRepository } from './quotes/quotes.repository.js';
import { QuotesService } from './quotes/quotes.service.js';
import { ScheduledEventsModule } from './scheduling/scheduled-events.module.js';

@Module({
  imports: [EventsModule, ScheduledEventsModule],
  controllers: [
    HealthController,
    CustomersController,
    CustomerContactsController,
    CustomerAddressesController,
    CustomerNotesController,
    ProjectsController,
    QuotesController
  ],
  providers: [
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
    QuotesService
  ]
})
export class AppModule {}
