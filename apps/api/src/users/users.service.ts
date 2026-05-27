import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { ROLE_VALUES, type Role } from '../auth/roles.decorator.js';
import { DATABASE_POOL } from '../database.provider.js';

type UserRole = Role;

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: Date;
};

const validRoles = new Set<UserRole>(ROLE_VALUES);

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_POOL) private readonly database: Pool) {}

  async listUsers() {
    const result = await this.database.query<UserRow>(`
      SELECT id, email, name, role, "createdAt" AS created_at
      FROM "user"
      ORDER BY "createdAt" ASC, id ASC
    `);

    return result.rows.map((user) => this.mapUser(user));
  }

  async updateRole(userId: string, role: string) {
    if (!validRoles.has(role as UserRole)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { role: [`Role must be one of ${ROLE_VALUES.join(', ')}`] }
      });
    }

    const result = await this.database.query<UserRow>(
      `
        UPDATE "user"
        SET role = $2
        WHERE id = $1
        RETURNING id, email, name, role, "createdAt" AS created_at
      `,
      [userId, role]
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    }

    return this.mapUser(user);
  }

  async getMe(userId: string) {
    const result = await this.database.query<UserRow>(
      `
        SELECT id, email, name, role, "createdAt" AS created_at
        FROM "user"
        WHERE id = $1
      `,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    }

    return this.mapUser(user);
  }

  private mapUser(user: UserRow) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at.toISOString()
    };
  }
}
