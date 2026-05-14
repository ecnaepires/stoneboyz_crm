import { Provider } from '@nestjs/common';
import { Pool } from 'pg';

export const DATABASE_POOL = Symbol('DATABASE_POOL');

const DEFAULT_DATABASE_URL =
  'postgresql://stoneboyz_test:stoneboyz_test@localhost:5433/stoneboyz_crm_test';

export const databaseProvider: Provider = {
  provide: DATABASE_POOL,
  useFactory: (): Pool => {
    return new Pool({
      connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
    });
  }
};

