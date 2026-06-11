# Activity types are shop-defined data with behavior flags, not a code enum

The product is built to be sold to fabrication shops migrating from Moraware, where every shop defines its own activity types ("Tearout", "Service Call", "Sealing"). A hardcoded enum (`template, fabrication, install, …`) would force our vocabulary on theirs — exactly the migration friction we refuse to create. We decided each Shop owns a catalog of Activity Types, where each type carries behavior flags instead of code branching on its name: display color, optional Pipeline Stage mapping, whether it carries Activity Square Footage into Day Subtotals, whether Autoscheduling chains through it, and a default duration. New Shops are seeded with the standard Moraware-like set so day one feels familiar; Stone Boyz's current types become its seed data, not the system's skeleton.

## Considered Options

Keeping the existing fixed enum was rejected because upcoming features (Day Subtotals, Job List View columns, Run Order) would all be built on top of it, making the later retrofit a rebuild of all three. The cost accepted in exchange: every new feature must express type-specific behavior as a flag on the type, never as `if type === 'fabrication'`.

## Consequences

The current `AppointmentType` enum in the API spec becomes the seed catalog. Pipeline Stage mapping, subtotal participation, and autoschedule chaining move from implicit name-based logic to explicit per-type configuration. The same shop-owns-the-vocabulary principle is the declared direction for activity statuses, status colors, and custom display fields, but those are separate later decisions.
