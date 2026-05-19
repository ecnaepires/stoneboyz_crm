ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'estimator';

UPDATE "user" SET role = 'admin' WHERE role = 'estimator';
