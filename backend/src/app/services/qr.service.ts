import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  constructor(private readonly configService: ConfigService) {}

  async generateMeetingQR(meetingId: string): Promise<string> {
    const webUrl = this.configService.get<string>('WEB_URL') || 'http://localhost:4200';
    const meetingUrl = `${webUrl}/join/${meetingId}`;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(meetingUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#111827',
          light: '#FFFFFF',
        },
      });
      
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }
}
