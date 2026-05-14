# API App

This package will host the NestJS API.

Current state:
- package scaffold exists
- TypeScript config exists
- NestJS runtime dependencies installed
- minimal app module exists
- `GET /api/v1/health` exists

Next steps before endpoint implementation:
1. Add application persistence pattern for PostgreSQL repositories
2. Create customer module, repository, service, and controller
3. Wire integration tests for customer list/create/get
4. Return typed error responses from request validation
