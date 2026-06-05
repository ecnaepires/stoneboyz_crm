CREATE TABLE IF NOT EXISTS slab_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slab_id uuid NOT NULL REFERENCES slabs(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  from_project_id uuid,
  to_project_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slab_audit_events_action_check
    CHECK (action IN ('reserved', 'released', 'reassigned', 'released_to_shop', 'cut'))
);

CREATE INDEX IF NOT EXISTS slab_audit_events_slab_id_created_at_idx
  ON slab_audit_events (slab_id, created_at);
