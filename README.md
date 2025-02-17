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
- **Database**: PostgreSQL with direct queries (no ORM)
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

   # Run the database setup script which creates both development and production databases
   cd backend
   ./scripts/setup-db.sh
   ```

   The setup script creates two databases:
   - `readtheroom_dev`: Used for development and testing
   - `readtheroom`: Used for production

   By default:
   - The development server uses `readtheroom_dev`
   - Tests use `readtheroom_dev`
   - Production uses `readtheroom`

3. Environment Variables
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the .env file if you need to change any URLs or database settings
   ```

   Database configuration can be customized using these environment variables:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=readtheroom_dev  # For development
   # DB_DATABASE=readtheroom    # For production
   ```

## Database Management

### Initial Setup
```bash
# From the project root
cd backend
npm run db:setup
```

This script will:
1. Drop and recreate both development (`readtheroom_dev`) and production (`readtheroom`) databases
2. Apply the latest schema from `backend/src/app/schema.sql`
3. Create necessary tables, indexes, and triggers

### Resetting the Database
If you need to reset the database (e.g., after schema changes):
```bash
cd backend
npm run db:setup
```

This will drop all tables and recreate them with the latest schema. Note that this will delete all existing data.

### Database Structure
The application uses PostgreSQL with the following main tables:
- `meetings`: Stores meeting information
- `attendees`: Stores meeting participant data
- `attendee_current_status`: Tracks current status of each attendee
- `status_updates`: Historical record of status changes
- `comments`: Stores meeting comments and feedback

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

## Running the Application

The application includes convenient startup scripts that handle environment configuration:

1. Start the Backend
   ```bash
   ./start-backend.sh
   ```
   This script configures the backend to run on your local network IP address and starts the NestJS server.

2. Start the Frontend
   ```bash
   ./start-frontend.sh
   ```
   This script configures the frontend with the correct environment variables and starts the development server.

Both scripts automatically detect your local network IP address and configure the application accordingly, making it accessible from other devices on your network.

## Environment Variables

The application uses environment variables prefixed with `RTR_` for configuration:

- `RTR_WEB_HOST`: Local machine IP address
- `RTR_API_HOST`: Backend server IP
- `RTR_WEB_PORT`: Frontend port (default 4200)
- `RTR_API_PORT`: Backend port (default 3000)
- `RTR_WEB_PROTOCOL`: Web protocol (default http)
- `RTR_API_PROTOCOL`: API protocol (default http)

These variables are automatically set by the startup scripts, but can be overridden if needed.

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
   This will use the `readtheroom_dev` database by default.

4. Run tests:
   ```bash
   npm test
   ```
   Tests will use the `readtheroom_dev` database.

### Web Application

The web application is built with React and uses Socket.IO for real-time communication. It's managed through NX workspace.

1. Navigate to the web directory:
   ```bash
   cd web
   ```

2. Install web dependencies:
   ```bash
   npm install
   ```

3. Start the development server from the root directory:
   ```bash
   npx nx serve web
   ```
   This will start the web app at http://localhost:4200

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
   - The recommended way to start the services is using the provided scripts:
     ```bash
     ./start-backend.sh   # Starts the backend service
     ./start-frontend.sh  # Starts the frontend service
     ```
   - These scripts automatically configure environment variables and network settings
   - Alternatively, you can start services manually:
     - Backend: `cd backend && npm run start:dev`
     - Frontend: `cd web && npx nx serve web`
   - Both services must be running for the application to work

2. **Package Installation**
   - If you encounter peer dependency conflicts when installing new packages, use the `--legacy-peer-deps` flag:
     ```bash
     npm install --save-dev <package-name> --legacy-peer-deps
     ```
   - This is particularly useful when installing TypeScript type definitions (@types packages)

3. **Debugging**
   - Backend logs are available in the terminal running the backend service
   - Frontend logs can be viewed in the browser's developer console
   - Socket.IO connection status is logged in both backend and frontend

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

# Deployment

To deploy the application to production, set the following environment variables. These are the variables used by Railway to deploy the application:

```bash
NODE_ENV=production
RTR_API_PROTOCOL=https
RTR_API_HOST=readtheroom-api.railway.app
RTR_WEB_PROTOCOL=https
RTR_WEB_HOST=readtheroom.railway.app
RTR_ALLOWED_ORIGINS=https://readtheroom.railway.app