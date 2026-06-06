import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Returns a trimmed env value, or null if it is empty or an obvious
 * placeholder (e.g. `your-cloudflare-account-id`, `pub-xxxx.r2.dev`).
 * Keeps unfilled template values from masquerading as real config.
 */
function realEnv(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower.startsWith('your-') || lower.includes('xxxx')) return null;
  return v;
}

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | null = null;
  private readonly publicUrl: string | null = null;
  private readonly appUrl: string;

  constructor() {
    this.appUrl = process.env.APP_URL ?? 'http://localhost:3001';

    const vars = {
      R2_ACCOUNT_ID: realEnv(process.env.R2_ACCOUNT_ID),
      R2_ACCESS_KEY_ID: realEnv(process.env.R2_ACCESS_KEY_ID),
      R2_SECRET_ACCESS_KEY: realEnv(process.env.R2_SECRET_ACCESS_KEY),
      R2_BUCKET_NAME: realEnv(process.env.R2_BUCKET_NAME),
      R2_PUBLIC_URL: realEnv(process.env.R2_PUBLIC_URL),
    };

    const present = Object.entries(vars).filter(([, v]) => v !== null);
    const missing = Object.entries(vars).filter(([, v]) => v === null);

    // Partial config is always a mistake — fail loud at boot, not mid-upload.
    if (present.length > 0 && missing.length > 0) {
      throw new Error(
        `[StorageService] R2 partially configured. Set all five R2_* vars to enable R2, ` +
          `or leave all blank for local disk. Missing/placeholder: ${missing
            .map(([k]) => k)
            .join(', ')}`,
      );
    }

    if (present.length === 5) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${vars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: vars.R2_ACCESS_KEY_ID as string,
          secretAccessKey: vars.R2_SECRET_ACCESS_KEY as string,
        },
      });
      this.bucket = vars.R2_BUCKET_NAME;
      this.publicUrl = (vars.R2_PUBLIC_URL as string).replace(/\/$/, '');
      console.log('[StorageService] R2 storage active');
    } else {
      console.log('[StorageService] R2 not configured — using local disk fallback');
    }
  }

  async uploadFile(filename: string, buffer: Buffer, contentType: string): Promise<string> {
    if (this.s3 && this.bucket && this.publicUrl) {
      const key = `slabs/${filename}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );
      return `${this.publicUrl}/${key}`;
    }

    // Local disk fallback
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'slabs');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return `${this.appUrl}/uploads/slabs/${filename}`;
  }
}
