# ReadTheRoom Technical Design

## Overview

ReadTheRoom is a real-time meeting feedback application that enables participants to provide anonymous feedback during meetings. The application consists of a web frontend and a backend API server with real-time WebSocket communication.

## Technology Stack

### Frontend
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: TypeScript
- **Real-time Communication**: Socket.IO client
- **Package Manager**: npm
- **Testing**: Jest with React Testing Library

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (without ORM)
- **Real-time Communication**: Socket.IO server
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest with e2e tests
- **Package Manager**: npm

### Development Tools
- **Monorepo Management**: Nx
- **Code Formatting**: Prettier
- **Linting**: ESLint
- **Editor Config**: EditorConfig
- **Version Control**: Git
- **CI/CD**: GitHub Actions

## Project Structure

```
readtheroom/
├── backend/                  # NestJS backend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── controllers/ # HTTP endpoints
│   │   │   ├── gateways/    # WebSocket handlers
│   │   │   ├── models/      # Data models
│   │   │   ├── repositories/# Database access
│   │   │   ├── services/    # Business logic
│   │   │   ├── types/      # TypeScript types
│   │   │   └── schema.sql  # Database schema
│   │   └── main.ts         # Application entry
├── backend-e2e/             # Backend integration tests
├── web/                     # React frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # React components
│   │   │   ├── services/   # API clients
│   │   │   ├── types/     # TypeScript types
│   │   │   └── utils/     # Utility functions
│   └── package.json
├── mobile/                  # Mobile application (React Native)
├── scripts/                 # Development scripts
└── package.json            # Root package.json
```

## Database Design

### Tables
1. **meetings**
   - `meeting_uuid`: UUID (Primary Key)
   - `meeting_code`: VARCHAR(50) (Unique)
   - `title`: VARCHAR(255)
   - `qr_code`: TEXT
   - Timestamps: created_at, updated_at

2. **attendees**
   - `id`: UUID (Primary Key)
   - `meeting_uuid`: UUID (Foreign Key)
   - `name`: VARCHAR(255)
   - Timestamps: created_at, updated_at

3. **attendee_current_status**
   - `id`: UUID (Primary Key)
   - `attendee_id`: UUID (Foreign Key)
   - `meeting_uuid`: UUID (Foreign Key)
   - `status`: VARCHAR(50)
   - `last_heartbeat`: TIMESTAMP
   - Timestamps: created_at, updated_at

4. **status_updates**
   - Records historical status changes
   - Used for analytics and timeline views

5. **reactions**
   - Stores real-time meeting reactions
   - Linked to attendees and meetings

6. **comments**
   - Stores meeting feedback and comments
   - Linked to attendees and meetings

### Key Design Decisions
- Uses UUIDs for all primary keys
- Maintains referential integrity with foreign keys
- Includes timestamps for auditing
- No complex ORM relationships

## Architecture Details

### Layer Separation

1. **Controller Layer** (`/controllers`)
   - Handles HTTP routing and request validation
   - Translates between meeting_code and meeting_uuid
   - Returns standardized HTTP responses
   - Example: `meeting.controller.ts`

2. **Service Layer** (`/services`)
   - Implements business logic
   - Manages WebSocket state
   - Handles data transformations
   - Example: `meeting.service.ts`, `meeting-state.service.ts`

3. **Data Access Layer** (`/repositories`)
   - Direct SQL queries
   - Transaction management
   - No ORM abstractions
   - Example: `meeting.repository.ts`

### Real-time Architecture

1. **WebSocket Gateway**
   - Handles Socket.IO events
   - Uses meeting UUIDs for room management
   - Maintains connection state
   - Example: `meeting.gateway.ts`

2. **Meeting State Service**
   - In-memory state management
   - Attendee presence tracking
   - Real-time statistics
   - Heartbeat monitoring

## Development Workflow

### Getting Started
1. Clone the repository
2. Copy `.env.example` to `.env`
3. Run `npm install` at root
4. Start PostgreSQL database
5. Run database migrations
6. Use `start-backend.sh` and `start-frontend.sh`

### Development Scripts
- `start-backend.sh`: Starts NestJS server
- `start-frontend.sh`: Starts React dev server
- Both include environment setup

### Testing
1. **Backend Tests**
   - Integration tests in `backend-e2e/`
   - Uses real database instance
   - Covers API endpoints and WebSocket events

2. **Frontend Tests**
   - Component tests with React Testing Library
   - Integration tests in `web-e2e/`

## Security Considerations

1. **Identification**
   - Internal UUIDs for security
   - Human-readable codes for sharing
   - No sequential IDs

2. **Database**
   - Parameterized queries
   - No direct SQL injection risks
   - Foreign key constraints

3. **API**
   - Input validation
   - Rate limiting (TODO)
   - CORS configuration

## Maintenance Guidelines

1. **Adding Features**
   - Follow existing layer separation
   - Add e2e tests for new endpoints
   - Update TypeScript types

2. **Database Changes**
   - Add to `schema.sql`
   - Use UUIDs for new tables
   - Maintain foreign key relationships

3. **WebSocket Events**
   - Document in gateway files
   - Consider state management impact
   - Test real-time behavior

## Monitoring and Debugging

1. **Logging**
   - Structured logging in services
   - WebSocket event logging
   - Error tracking (TODO)

2. **Performance**
   - Database query monitoring
   - WebSocket connection tracking
   - Memory usage for state service

3. **Metrics (TODO)**
   - API response times
   - WebSocket event latency
   - Database performance

## Future Considerations

1. **Scaling**
   - WebSocket server clustering
   - Database read replicas
   - Redis for state management

2. **Features**
   - Meeting recording
   - Analytics dashboard
   - Mobile app enhancement

3. **Infrastructure**
   - Container orchestration
   - CDN integration
   - Monitoring stack
