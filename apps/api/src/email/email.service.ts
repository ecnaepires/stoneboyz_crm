import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Resend } from 'resend';

interface SendQuotePdfOptions {
  customerName: string;
  pdfBuffer: Buffer;
  quoteNumber: string;
  to: string;
}

@Injectable()
export class EmailService {
  private readonly resendApiKey = process.env.RESEND_API_KEY;
  private readonly fromEmail = process.env.RESEND_FROM_EMAIL;
  private readonly resend = this.resendApiKey ? new Resend(this.resendApiKey) : null;

  async sendQuotePdf(options: SendQuotePdfOptions): Promise<void> {
    if (!this.resend || !this.fromEmail) {
      throw new InternalServerErrorException({
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'Email sending is not configured'
      });
    }

    const sanitizedQuoteNumber = options.quoteNumber.replace(/[^a-zA-Z0-9-_]+/g, '_');
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: [options.to],
      subject: `Quote ${options.quoteNumber} from Stoneboyz`,
      html: `<p>Hello,</p><p>Please find attached quote ${options.quoteNumber} for ${options.customerName}.</p>`,
      attachments: [
        {
          filename: `${sanitizedQuoteNumber}.pdf`,
          content: options.pdfBuffer.toString('base64')
        }
      ]
    });

    if (error) {
      throw new InternalServerErrorException({
        code: 'EMAIL_SEND_FAILED',
        message: error.message
      });
    }
  }
}
