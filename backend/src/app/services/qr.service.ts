import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);

  async generateQRCode(meetingId: string): Promise<string> {
    const protocol = process.env.RTR_WEB_PROTOCOL || 'http';
    const host = process.env.RTR_WEB_HOST || 'localhost';
    const port = process.env.RTR_WEB_PORT || '4200';
    
    // Always include port in development for local network access
    const url = `${protocol}://${host}:${port}/join/${meetingId}`;
    this.logger.log(`Generated QR code URL: ${url}`);
      
    return QRCode.toDataURL(url);
  }
}
