import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { UsersService } from './users.service.js';

const userIdSchema = z.string().uuid();
const updateRoleSchema = z.object({
  role: z.enum(['admin', 'estimator', 'installer'])
});

const formatZodError = (error: z.ZodError): Record<string, string[]> => z.flattenError(error).fieldErrors;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get()
  @Roles('admin')
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Patch(':userId/role')
  @Roles('admin')
  async updateRole(@Param('userId') userId: string, @Body() body: unknown) {
    const parsedUserId = userIdSchema.safeParse(userId);
    if (!parsedUserId.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { userId: ['Invalid UUID'] }
      });
    }

    const parsedBody = updateRoleSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formatZodError(parsedBody.error)
      });
    }

    return this.usersService.updateRole(parsedUserId.data, parsedBody.data.role);
  }
}
