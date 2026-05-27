ALTER TABLE attachments
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN category TYPE text USING category::text,
  ALTER COLUMN category SET DEFAULT 'other',
  ALTER COLUMN attachable_type TYPE text USING attachable_type::text;

UPDATE attachments
SET category = CASE category
  WHEN 'template' THEN 'template_doc'
  WHEN 'photo' THEN 'other'
  WHEN 'document' THEN 'other'
  ELSE category
END;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_category_check;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_category_check CHECK (
    category IN (
      'before_photo',
      'after_photo',
      'damage_photo',
      'signed_contract',
      'template_doc',
      'design_reference',
      'drawing',
      'invoice',
      'other'
    )
  );

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_attachable_type_check;

ALTER TABLE attachments
  ADD CONSTRAINT attachments_attachable_type_check CHECK (
    attachable_type IN ('job', 'quote', 'order', 'customer', 'activity', 'issue')
  );
