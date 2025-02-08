# Read The Room

A real-time meeting engagement tracking application that uses AI to transcribe conversations and monitor participant engagement levels.

## Features

- 🎙️ Real-time audio transcription using OpenAI Whisper
- 📊 Live engagement tracking with participant feedback
- 📱 Cross-platform support (Web and Mobile)
- 🔄 Real-time updates using WebSocket
- 📷 QR code generation for easy meeting access

## Tech Stack

- **Frontend**:
  - Web: React.js with Tailwind CSS
  - Mobile: React Native (Expo)
- **Backend**: NestJS (TypeScript)
- **Real-time Communication**: Socket.IO
- **AI Integration**: OpenAI Whisper API

## Prerequisites

- Node.js (v18 or later)
- Yarn package manager
- OpenAI API key
- For iOS development: CocoaPods

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ReadTheRoom.git
   cd ReadTheRoom
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to `.env`

4. Start the development servers:

   Backend:
   ```bash
   yarn nx serve backend
   ```

   Web App:
   ```bash
   yarn nx serve web
   ```

   Mobile App:
   ```bash
   yarn nx serve mobile
   ```

## Project Structure

- `/backend` - NestJS backend server
- `/web` - React web application
- `/mobile` - React Native mobile application
- `/shared` - Shared types and utilities

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
