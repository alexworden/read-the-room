# Read The Room

A real-time meeting engagement tracking application that uses AI to transcribe conversations and monitor participant engagement levels.

## Features

- Real-time audio transcription using OpenAI Whisper
- Live engagement tracking with participant feedback
- Cross-platform support (Web and Mobile)
- Real-time updates using Socket.IO
- QR code generation for easy meeting access
- Live participant status updates (Engaged, Confused, Have an Idea, Disagree)
- Real-time meeting statistics

## Tech Stack

- **Frontend**:
  - Web: React.js with Tailwind CSS
  - Mobile: React Native (Expo)
- **Backend**: NestJS (TypeScript)
- **Real-time Communication**: Socket.IO
- **AI Integration**: OpenAI Whisper API
- **State Management**: In-memory with NestJS services

## Prerequisites

- Node.js (v18 or later)
- npm package manager
- PostgreSQL installed and running
- OpenAI API key (for transcription features)
- NX workspace CLI (`npm install -g nx`)

## Environment Setup

1. OpenAI API Key
   ```bash
   # Add this to your ~/.zshrc file
   export READ_THE_ROOM_OPENAI_KEY=your_openai_api_key_here
   
   # Then reload your shell
   source ~/.zshrc
   ```

2. Database Setup
   ```bash
   # Install PostgreSQL if not already installed
   brew install postgresql@15
   brew services start postgresql@15

   # Run the database setup script
   ./scripts/setup-db.sh
   ```

3. Environment Variables
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the .env file if you need to change any URLs
   ```

## Project Structure

```
readtheroom/
├── backend/           # NestJS backend server
├── web/              # React web application
└── shared/           # Shared types and utilities
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ReadTheRoom.git
   cd ReadTheRoom
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Backend Server

The backend server is built with NestJS and provides RESTful APIs and Socket.IO endpoints.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run start:dev
   ```
   This will start the server in watch mode at http://localhost:3000

4. Run tests:
   ```bash
   # Run unit tests
   npm run test

   # Run tests in watch mode
   npm run test:watch

   # Run end-to-end tests
   npm run test:e2e
   ```

### Web Application

The web app is built with React, Vite, and managed through NX workspace.

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install web dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx nx serve web
   ```
   This will start the web app at http://localhost:4200

4. Build for production:
   ```bash
   npx nx build web
   ```

5. Run tests:
   ```bash
   npx nx test web
   ```

## API Endpoints

The backend server provides the following endpoints:

### Meetings
- `POST /api/meetings` - Create a new meeting
- `GET /api/meetings/:id` - Get meeting details
- `GET /api/meetings/:id/stats` - Get meeting statistics
- `GET /api/meetings/:id/qr` - Get meeting QR code
- `POST /api/meetings/:id/attendees` - Add an attendee to a meeting
- `PUT /api/meetings/:id/attendees/:attendeeId/status` - Update attendee status
- `PUT /api/meetings/:id/attendees/:attendeeId/heartbeat` - Update attendee heartbeat
- `POST /api/meetings/:id/transcription` - Add transcription to meeting

### Socket.IO Events

The application uses Socket.IO for real-time communication. Here are the main events:

#### Client -> Server
- `heartbeat` - Send attendee heartbeat
- `status` - Update attendee status

#### Server -> Client
- `transcription` - Receive new transcription
- `stats` - Receive updated meeting statistics

## Development Tips

1. **Running Both Services**
   - Start the backend first: `cd backend && npm run start:dev`
   - Start the web app second: `cd web && npx nx serve web`
   - Both services must be running for the application to work

2. **Debugging**
   - Backend logs are available in the terminal running the backend service
   - Frontend logs can be viewed in the browser's developer console
   - Socket.IO connection status is logged in both backend and frontend

3. **Common Issues**
   - If the backend fails to start due to port 3000 being in use, kill the existing process and try again
   - If Socket.IO connection fails, ensure both servers are running and check CORS settings
   - Clear browser cache if you encounter stale data or connection issues

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
