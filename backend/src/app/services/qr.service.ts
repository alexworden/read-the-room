import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  private readonly logger = new Logger(QRService.name);

  async generateQRCode(meetingId: string): Promise<string> {
    const protocol = process.env.RTR_WEB_PROTOCOL;
    const host = process.env.RTR_WEB_HOST;
    
    if (!protocol || !host) {
      throw new Error('Web configuration not set. Required environment variables: RTR_WEB_PROTOCOL, RTR_WEB_HOST');
    }
    
    // Only include port in URL if explicitly set in environment
    const url = process.env.RTR_WEB_PORT
      ? `${protocol}://${host}:${process.env.RTR_WEB_PORT}/join/${meetingId}`
      : `${protocol}://${host}/join/${meetingId}`;
      
    this.logger.log(`Generated QR code URL: ${url}`);
    return QRCode.toDataURL(url);
  }
}
