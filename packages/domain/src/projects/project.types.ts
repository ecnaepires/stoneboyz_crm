import type { ProjectSortBy, ProjectStatus } from './project.constants.js';
import type { SortDirection } from '../customers/customer.constants.js';

export interface Project {
  id: string;
  customerId: string;
  jobNumber: string;
  title: string;
  description: string | null;
  jobAddress: ProjectJobAddress | null;
  status: ProjectStatus;
  ownerUserId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectJobAddress {
  line1?: string | null | undefined;
  line2?: string | null | undefined;
  city?: string | null | undefined;
  region?: string | null | undefined;
  postalCode?: string | null | undefined;
  country?: string | null | undefined;
  contactName?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
}

export interface CreateProjectInput {
  actorUserId: string;
  customerId: string;
  title: string;
  description?: string | undefined;
  jobAddress?: ProjectJobAddress | undefined;
  copyFromCustomerPrimary?: boolean | undefined;
  status?: ProjectStatus | undefined;
  ownerUserId: string;
  jobTemplateId?: string | undefined;
}

export interface UpdateProjectInput {
  actorUserId: string;
  customerId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  jobAddress?: ProjectJobAddress | null | undefined;
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
