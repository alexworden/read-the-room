import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { AttendeeStatus } from '../src/app/models/meeting.model';

describe('MeetingController (e2e)', () => {
  let app: INestApplication;
  let meetingId: string;
  let attendeeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /meetings', () => {
    it('should create a meeting', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Test Meeting',
        attendees: [],
        transcription: [],
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();

      meetingId = response.body.id;
    });

    it('should fail to create a meeting without title', () => {
      return request(app.getHttpServer())
        .post('/api/meetings')
        .send({})
        .expect(400);
    });
  });

  describe('GET /meetings/:id', () => {
    it('should get meeting details', () => {
      return request(app.getHttpServer())
        .get(`/api/meetings/${meetingId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(meetingId);
          expect(res.body.title).toBe('Test Meeting');
        });
    });

    it('should return 404 for non-existent meeting', () => {
      return request(app.getHttpServer())
        .get('/api/meetings/non-existent')
        .expect(404);
    });
  });

  describe('POST /meetings/:id/attendees', () => {
    it('should add an attendee', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/meetings/${meetingId}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Attendee',
        currentStatus: AttendeeStatus.ENGAGED,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.statusHistory).toHaveLength(1);
      expect(response.body.statusHistory[0]).toMatchObject({
        status: AttendeeStatus.ENGAGED,
        context: 'Initial status',
      });

      attendeeId = response.body.id;
    });

    it('should fail to add attendee to non-existent meeting', () => {
      return request(app.getHttpServer())
        .post('/api/meetings/non-existent/attendees')
        .send({ name: 'Test Attendee' })
        .expect(404);
    });
  });

  describe('PUT /meetings/:id/attendees/:attendeeId/status', () => {
    it('should update attendee status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/meetings/${meetingId}/attendees/${attendeeId}/status`)
        .send({ 
          status: AttendeeStatus.CONFUSED,
          context: 'Test context'
        })
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify the status was updated
      const meetingResponse = await request(app.getHttpServer())
        .get(`/api/meetings/${meetingId}`)
        .expect(200);

      const attendee = meetingResponse.body.attendees.find(a => a.id === attendeeId);
      expect(attendee.currentStatus).toBe(AttendeeStatus.CONFUSED);
      expect(attendee.statusHistory).toHaveLength(2);
      expect(attendee.statusHistory[1]).toMatchObject({
        status: AttendeeStatus.CONFUSED,
        context: 'Test context',
      });
    });

    it('should fail to update status for non-existent meeting', () => {
      return request(app.getHttpServer())
        .put(`/api/meetings/non-existent/attendees/${attendeeId}/status`)
        .send({ 
          status: AttendeeStatus.CONFUSED,
          context: 'Test context'
        })
        .expect(404);
    });

    it('should fail to update status for non-existent attendee', () => {
      return request(app.getHttpServer())
        .put(`/api/meetings/${meetingId}/attendees/non-existent/status`)
        .send({ 
          status: AttendeeStatus.CONFUSED,
          context: 'Test context'
        })
        .expect(404);
    });
  });

  describe('PUT /meetings/:id/attendees/:attendeeId/heartbeat', () => {
    it('should update attendee heartbeat', () => {
      return request(app.getHttpServer())
        .put(`/api/meetings/${meetingId}/attendees/${attendeeId}/heartbeat`)
        .expect(200)
        .expect({ success: true });
    });

    it('should fail to update heartbeat for non-existent meeting', () => {
      return request(app.getHttpServer())
        .put(`/api/meetings/non-existent/attendees/${attendeeId}/heartbeat`)
        .expect(404);
    });

    it('should fail to update heartbeat for non-existent attendee', () => {
      return request(app.getHttpServer())
        .put(`/api/meetings/${meetingId}/attendees/non-existent/heartbeat`)
        .expect(404);
    });
  });

  describe('GET /meetings/:id/stats', () => {
    it('should get meeting stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/meetings/${meetingId}/stats`)
        .expect(200);

      expect(response.body).toEqual({
        [AttendeeStatus.ENGAGED]: 0,
        [AttendeeStatus.CONFUSED]: 1,
        [AttendeeStatus.IDEA]: 0,
        [AttendeeStatus.DISAGREE]: 0,
      });
    });

    it('should return 404 for non-existent meeting', () => {
      return request(app.getHttpServer())
        .get('/api/meetings/non-existent/stats')
        .expect(404);
    });
  });

  describe('POST /meetings/:id/transcription', () => {
    it('should add transcription', async () => {
      await request(app.getHttpServer())
        .post(`/api/meetings/${meetingId}/transcription`)
        .send({ text: 'Test transcription' })
        .expect(201);

      // Verify transcription was added
      const response = await request(app.getHttpServer())
        .get(`/api/meetings/${meetingId}`)
        .expect(200);

      expect(response.body.transcription).toContain('Test transcription');
    });

    it('should fail to add transcription to non-existent meeting', () => {
      return request(app.getHttpServer())
        .post('/api/meetings/non-existent/transcription')
        .send({ text: 'Test transcription' })
        .expect(404);
    });
  });
});
