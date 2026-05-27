import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const ROLE_VALUES = ['admin', 'salesperson', 'templater', 'cutter', 'fabricator', 'installer', 'service_tech'] as const;

export type Role = typeof ROLE_VALUES[number];

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
