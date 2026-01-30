# Work OS Backend - Phase 0

Backend foundation for AI-first Work Management System.

## Tech Stack

- Node.js + TypeScript
- Express
- Prisma ORM
- Supabase PostgreSQL
- dotenv

## Project Structure

```
/src
  /app
    server.ts          # Express app setup
  /config
    env.ts            # Environment configuration
  /db
    prisma.ts         # Prisma client singleton
  /routes
    health.ts         # Health check endpoints
  index.ts            # Server bootstrap
/prisma
  schema.prisma       # Prisma schema
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
PORT=3000
```

Replace with your Supabase PostgreSQL connection string.

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Start Development Server

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio

## API Endpoints

### GET /health

Basic health check.

**Response:**
```json
{
  "status": "ok",
  "service": "work-os-backend"
}
```

### GET /health/db

Database connectivity check.

**Response (Success):**
```json
{
  "database": "connected"
}
```

**Response (Failure - 500):**
```json
{
  "database": "disconnected",
  "error": "Unable to connect to database"
}
```

## Phase 0 Scope

This phase implements ONLY:
- ✅ Backend server initialization
- ✅ Prisma + Supabase connection
- ✅ Health check endpoints
- ✅ Clean project structure
- ✅ Environment configuration

NOT included in Phase 0:
- ❌ AI logic
- ❌ SQL execution APIs
- ❌ Authentication
- ❌ Business logic
- ❌ GTWY integration

## Verification

After starting the server, verify:

1. Server starts: `http://localhost:3000`
2. Health check: `http://localhost:3000/health`
3. Database check: `http://localhost:3000/health/db`

All endpoints should return 200 OK with appropriate JSON responses.
