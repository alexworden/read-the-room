import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);

  async generateQRCode(meetingId: string): Promise<string> {
    const protocol = process.env.RTR_WEB_PROTOCOL || 'http';
    const host = process.env.RTR_WEB_HOST || 'localhost';
    const port = process.env.RTR_WEB_PORT;
    
    // Only include port if specified and not running in production
    const baseUrl = port && process.env.NODE_ENV !== 'production' 
      ? `${protocol}://${host}:${port}` 
      : `${protocol}://${host}`;
    
    const url = `${baseUrl}/join/${meetingId}`;
    this.logger.log(`Generated QR code URL: ${url}`);
      
    return QRCode.toDataURL(url);
  }
}
