import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Pool } from 'pg';

import { DATABASE_POOL } from '../database.provider.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

type RequestWithAuth = {
  headers: {
    authorization?: string | string[];
    cookie?: string | string[];
  };
  user?: {
    id: string;
    role: string;
  };
};

type SessionRow = {
  userId: string;
  expiresAt: Date;
  role: string;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_POOL) private readonly database: Pool,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.resolveSessionToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    const result = await this.database.query<SessionRow>(
      `
        SELECT session."userId", session."expiresAt", "user".role
        FROM session
        INNER JOIN "user" ON "user".id = session."userId"
        WHERE session.token = $1
      `,
      [token]
    );
    const session = result.rows[0];

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException();
    }

    request.user = { id: session.userId, role: session.role };
    return true;
  }

  private resolveSessionToken(request: RequestWithAuth): string | undefined {
    const bearerToken = this.resolveBearerToken(request.headers.authorization);
    if (bearerToken) {
      return bearerToken;
    }

    return this.resolveCookieToken(request.headers.cookie);
  }

  private resolveBearerToken(header: string | string[] | undefined): string | undefined {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      return undefined;
    }

    const [scheme, token] = value.split(/\s+/, 2);
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private resolveCookieToken(header: string | string[] | undefined): string | undefined {
    const value = Array.isArray(header) ? header.join('; ') : header;
    if (!value) {
      return undefined;
    }

    for (const cookie of value.split(';')) {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();
      if (!name.startsWith('better-auth.session_token')) {
        continue;
      }

      const encodedValue = cookie.slice(separatorIndex + 1).trim();
      const decodedValue = decodeURIComponent(encodedValue);
      return decodedValue.split('.', 1)[0];
    }

    return undefined;
  }
}
