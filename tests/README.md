# Tests

Test directories:
- `tests/integration/`: API and database behavior against real PostgreSQL test DB
- `tests/e2e/`: browser-level workflows

Root `pnpm test` runs the Vitest suite.
Use `pnpm test:spec` for spec consistency checks.
Feature code must add real tests in the matching directory.

Moraware-parity features need both contract and workflow proof:
- domain/unit tests for measurement, pricing, and transition rules
- integration tests for API + PostgreSQL behavior
- e2e/browser tests for quote, drawing, pricing, job, fabrication, form, and calendar flows
