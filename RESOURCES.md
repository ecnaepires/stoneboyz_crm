# Coding With This CRM Resources

## Knowledge

- [Price List Builder Design](./docs/superpowers/specs/2026-06-03-price-list-builder-design.md)
  Source of truth for the feature we are building.
- [Domain Glossary](./CONTEXT.md)
  Project language for CRM concepts such as Price List, Price Group, Price Item, Charge Method, and Measurement Basis.
- [Domain price-list types](./packages/domain/src/price-lists/price-list.types.ts)
  Current TypeScript shape for Price Lists and Price List Items.
- [Price list dashboard page](./apps/web/src/app/price-lists/[id]/page.tsx)
  Current UI that needs simplification.
- [Price list actions](./apps/web/src/app/price-lists/_actions.ts)
  Current server actions that send form data from the UI to the API.

## Wisdom

- Pairing directly in this repo.
  Best feedback loop for this mission: read one small file, change one small thing, run one check.
