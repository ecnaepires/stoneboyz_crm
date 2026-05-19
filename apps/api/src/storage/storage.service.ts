import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null = null;
  private readonly bucket: string | null = null;
  private readonly publicUrl: string | null = null;
  private readonly appUrl: string;

  constructor() {
    this.appUrl = process.env.APP_URL ?? 'http://localhost:3001';

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicUrl = process.env.R2_PUBLIC_URL;

    if (accountId && accessKeyId && secretAccessKey && bucket && publicUrl) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
      this.publicUrl = publicUrl.replace(/\/$/, '');
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
