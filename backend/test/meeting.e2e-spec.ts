import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { DatabaseService } from '../src/app/services/database.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Meeting API (e2e)', () => {
  let app: INestApplication;
  let httpServer: any;
  let dbService: DatabaseService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer();
    dbService = moduleFixture.get<DatabaseService>(DatabaseService);

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../src/app/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await dbService.query(schema);

    // Clean up database before each test
    await dbService.query('DELETE FROM reactions');
    await dbService.query('DELETE FROM comments');
    await dbService.query('DELETE FROM status_updates');
    await dbService.query('DELETE FROM attendee_current_status');
    await dbService.query('DELETE FROM attendees');
    await dbService.query('DELETE FROM meetings');
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Meeting Management', () => {
    it('should create a new meeting', async () => {
      const response = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      expect(response.body).toHaveProperty('meetingCode');
      expect(response.body).toHaveProperty('meetingUuid');
      expect(response.body).toHaveProperty('title', 'Test Meeting');
    });

    it('should create a new meeting with correct code format', async () => {
      const response = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      expect(response.body).toHaveProperty('meetingCode');
      expect(response.body.meetingCode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      expect(response.body).toHaveProperty('meetingUuid');
      expect(response.body).toHaveProperty('title', 'Test Meeting');
    });

    it('should get meeting details', async () => {
      // First create a meeting
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      // Then get its details
      const response = await request(httpServer)
        .get(`/meetings/${meetingCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('meetingCode', meetingCode);
      expect(response.body).toHaveProperty('meetingUuid');
      expect(response.body).toHaveProperty('title', 'Test Meeting');
    });

    it('should return 404 for non-existent meeting', async () => {
      await request(httpServer)
        .get('/meetings/non-existent')
        .expect(404);
    });
  });

  describe('Attendee Management', () => {
    it('should add an attendee to a meeting', async () => {
      // First create a meeting
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      // Then add an attendee
      const response = await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('meetingUuid');
      expect(response.body).toHaveProperty('name', 'Test Attendee');
    });

    it('should fail to add attendee to non-existent meeting', async () => {
      await request(httpServer)
        .post('/meetings/non-existent/attendees')
        .send({ name: 'Test Attendee' })
        .expect(404);
    });

    it('should get meeting attendees', async () => {
      // First create a meeting
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      // Add an attendee
      await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      // Get attendees
      const response = await request(httpServer)
        .get(`/meetings/${meetingCode}/attendees`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('name', 'Test Attendee');
    });
  });

  describe('Reaction Management', () => {
    it('should add a reaction and get reaction counts', async () => {
      // Create meeting and attendee
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      const attendeeResponse = await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      const attendeeId = attendeeResponse.body.id;

      // Add a reaction
      await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees/${attendeeId}/reactions`)
        .send({
          type: 'agree'
        })
        .expect(201);

      // Get reaction counts
      const response = await request(httpServer)
        .get(`/meetings/${meetingCode}/reactions`)
        .expect(200);

      expect(response.body).toHaveProperty('agree', 1);
      expect(response.body).toHaveProperty('disagree', 0);
    });

    it('should cancel previous opposite reaction', async () => {
      // Create meeting and attendee
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      const attendeeResponse = await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      const attendeeId = attendeeResponse.body.id;

      // Add agree reaction
      await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees/${attendeeId}/reactions`)
        .send({
          type: 'agree'
        })
        .expect(201);

      // Add disagree reaction (should cancel agree)
      await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees/${attendeeId}/reactions`)
        .send({
          type: 'disagree'
        })
        .expect(201);

      // Get reaction counts
      const response = await request(httpServer)
        .get(`/meetings/${meetingCode}/reactions`)
        .expect(200);

      expect(response.body).toHaveProperty('agree', 0);
      expect(response.body).toHaveProperty('disagree', 1);
    });
  });

  describe('Attendee Status Management', () => {
    it('should update attendee status', async () => {
      // Create meeting and attendee
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      const attendeeResponse = await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      const attendeeId = attendeeResponse.body.id;

      // Update attendee status
      const response = await request(httpServer)
        .put(`/meetings/${meetingCode}/attendees/${attendeeId}/status`)
        .send({
          status: 'CONFUSED',
          context: 'Test context',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail to update status for non-existent meeting', async () => {
      await request(httpServer)
        .put('/meetings/non-existent/attendees/attendee-id/status')
        .send({
          status: 'CONFUSED',
          context: 'Test context',
        })
        .expect(404);
    });

    it('should fail to update status for non-existent attendee', async () => {
      // Create meeting
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;
      const nonExistentAttendeeId = '00000000-0000-0000-0000-000000000000'; // Valid UUID that doesn't exist

      await request(httpServer)
        .put(`/meetings/${meetingCode}/attendees/${nonExistentAttendeeId}/status`)
        .send({
          status: 'CONFUSED',
          context: 'Test context',
        })
        .expect(404);
    });
  });

  describe('Heartbeat Management', () => {
    it('should update attendee heartbeat', async () => {
      // Create meeting and attendee
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      const attendeeResponse = await request(httpServer)
        .post(`/meetings/${meetingCode}/attendees`)
        .send({ name: 'Test Attendee' })
        .expect(201);

      const attendeeId = attendeeResponse.body.id;

      // Update attendee heartbeat
      const response = await request(httpServer)
        .put(`/meetings/${meetingCode}/attendees/${attendeeId}/heartbeat`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail to update heartbeat for non-existent meeting', async () => {
      await request(httpServer)
        .put('/meetings/non-existent/attendees/attendee-id/heartbeat')
        .expect(404);
    });

    it('should fail to update heartbeat for non-existent attendee', async () => {
      // Create meeting
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;
      const nonExistentAttendeeId = '00000000-0000-0000-0000-000000000000'; // Valid UUID that doesn't exist

      await request(httpServer)
        .put(`/meetings/${meetingCode}/attendees/${nonExistentAttendeeId}/heartbeat`)
        .expect(404);
    });
  });

  describe('Stats Management', () => {
    it('should get meeting stats', async () => {
      // Create meeting and attendee
      const createResponse = await request(httpServer)
        .post('/meetings')
        .send({ title: 'Test Meeting' })
        .expect(201);

      const meetingCode = createResponse.body.meetingCode;

      // Get meeting stats
      const response = await request(httpServer)
        .get(`/meetings/${meetingCode}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('engaged');
      expect(response.body).toHaveProperty('confused');
      expect(response.body).toHaveProperty('inactive');

      // Verify the values are numbers
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.engaged).toBe('number');
      expect(typeof response.body.confused).toBe('number');
      expect(typeof response.body.inactive).toBe('number');
    });

    it('should return 404 for non-existent meeting', async () => {
      await request(httpServer)
        .get('/meetings/non-existent/stats')
        .expect(404);
    });
  });
});
