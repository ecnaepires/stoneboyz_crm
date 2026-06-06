# Physical Damage Zone Separate From Photo Damage Mark

Slab Layout will warn when a Job piece is placed over a damaged area of a slab. Damage was already captured in Phase 1 as a `Damage Mark` — shape points drawn on a slab photo, in photo pixel space. We will **not** reuse Damage Marks to drive layout warnings. Instead we introduce a `Damage Zone`: a region of unusable surface expressed in physical slab inches, authored directly on the layout board. Damage Mark stays a photo-space visual record; Damage Zone is the physical-space geometric input.

**Considered Options**

- Reuse Damage Mark with a `space: photo | physical` flag: one concept, but blurs two genuinely different things (a visual annotation vs. a planning geometry) and invites code that treats pixel coordinates as inches.
- Calibrate the photo into slab inches and project Damage Marks onto the slab plane: no new authoring UI, but slab intake photos are not orthographic or scaled, so the projection is unreliable and would produce false warnings — worse than none.
- Add a distinct Damage Zone in physical inches: a second small data type and authoring tool, but each damage representation stays honest about its coordinate space and purpose.

**Consequences**

Damage is captured in two places for two reasons; the slab detail keeps photo Damage Marks for visual record, and the layout board owns Damage Zones for fit warnings. A Damage Mark may later *seed* a Damage Zone, but there is no automatic link in the first slice. Anyone reading the model must not assume the two are interchangeable or share coordinates.
