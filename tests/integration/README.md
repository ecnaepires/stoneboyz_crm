# Integration Tests

Integration tests run the real API against a real PostgreSQL test database.

Rules:
- Do not mock PostgreSQL.
- Use a separate test database, never development or production data.
- Reset database before each test file or test suite.
- Run migrations before tests.
- Seed only the data each test needs.

First customer tests:
- `GET /customers` returns seeded customers
- `GET /customers` supports cursor pagination
- `POST /customers` creates a customer
- `GET /customers/{customerId}` returns a customer
- Invalid request data returns typed validation errors

Going forward, Moraware-parity integration tests must cover:
- quote areas, drawing revisions, generated price lines, overrides, and manual items
- quote accept -> production job creation/attach
- fabrication activity schedule/status/assignee/duration changes
- job checklist and order-area form definitions/responses
- calendar filters, batch updates, and packet preview endpoints when added
