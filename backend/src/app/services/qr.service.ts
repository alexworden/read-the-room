import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRService {
  async generateQRCode(meetingId: string): Promise<string> {
    const url = `http://localhost:4200/meeting/${meetingId}`;
    return QRCode.toDataURL(url);
  }
}
