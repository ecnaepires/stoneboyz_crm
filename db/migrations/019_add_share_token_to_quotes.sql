ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS quotes_share_token_idx ON quotes(share_token);
