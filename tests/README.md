# Tests

Test directories:
- `tests/integration/`: API and database behavior against real PostgreSQL test DB
- `tests/e2e/`: browser-level workflows

Root `pnpm test` runs the Vitest suite.
Use `pnpm test:spec` for spec consistency checks.
Feature code must add real tests in the matching directory.
