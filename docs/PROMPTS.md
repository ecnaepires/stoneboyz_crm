# PROMPTS.md

Reusable prompts for AI sessions. Copy-paste exact text to get consistent results.

---

## Session Start (always use this)

```text
You are working on Stoneboyz CRM, a B2B CRM system.
Read CLAUDE.md and docs/CODEBASE_RULES.md before doing anything.
Do not write code until you confirm you understand the module boundaries and naming conventions.
If a spec file exists for the area you're working in, read it first.
```

---

## Adding a New Module

```text
I want to add the [module name] module.
Before writing code:
1. Create docs/specs/modules/[module-name].md with: purpose, entities, business rules, open questions
2. Update docs/specs/api/openapi.yaml with any new endpoints
3. Update docs/specs/events/catalog.v1.yaml if this module emits events
4. Show me the spec for review before implementation
Do not write implementation code until I approve the spec.
```

---

## Adding an API Endpoint

```text
Add endpoint: [METHOD] /[path]
Before writing code:
1. Add to docs/specs/api/openapi.yaml and show me the YAML block first
2. Define shared types and enums in packages/domain
3. Define request/response Zod schemas in packages/domain
4. Write the NestJS controller and service
5. Write integration tests in tests/integration/
Follow docs/CODEBASE_RULES.md naming and error format.
```

---

## Adding a Migration

```text
Add a migration for: [description of change]
Rules:
- New file only, never edit existing migrations
- Filename: [timestamp]_[snake_case_description].sql
- Include rollback SQL in a comment at top
- Add foreign keys with explicit ON DELETE policy
- Show me the SQL before creating the file
```

---

## Bug Fix

```text
Bug: [description]
Reproduce: [steps]
Before fixing:
1. Find the root cause and show me where it is
2. Explain why it happens
3. Propose fix
4. Write a test that would have caught this
Then implement.
```

---

## Code Review

```text
Review [file or PR].
Check against docs/CODEBASE_RULES.md:
- Module boundary violations
- Missing types or any usage
- Error handling gaps
- Missing tests
- Naming convention violations
- Spec not updated when it should be
Report findings as: [file:line] [severity: HIGH/MED/LOW] [problem] - [fix]
```

---

## Regenerate API Client

```text
The OpenAPI spec changed. Regenerate packages/api-client from docs/specs/api/openapi.yaml.
Do not edit any generated file by hand.
After regeneration, check if apps/web imports anything that changed shape.
```

---

## Add Moraware-Parity Workflow

```text
Add Moraware-parity workflow: [workflow name].
Before writing code:
1. Read docs/moraware-countergo-audit.md and docs/specs/moraware-parity-roadmap.md.
2. Update the relevant module spec with entities, business rules, invalid states, and acceptance scenario.
3. Update OpenAPI, event catalog, DB invariants, and scripts/check-spec-sync.mjs if contract/schema/events change.
4. Add domain/unit tests for pure measurement, pricing, or transition logic.
5. Add integration tests against real PostgreSQL.
6. Add browser/E2E coverage if user workflow UI changes.
Do not implement until spec and harness plan are clear.
```
