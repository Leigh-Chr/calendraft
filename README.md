# Calendraft

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun&logoColor=white)](https://bun.sh/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Calendraft** is a web platform designed to simplify the management, editing, and creation of **.ics** format calendars.

The goal is to offer a modern and intuitive experience that allows users to work easily with calendar files — without complex tools, without configuration, and without particular technical skills.

## Features

### Calendar Management
- **Import .ics files** - Import your calendars from any source
- **Import into existing calendar** - Add events from a .ics file to an existing calendar
- **Create empty calendars** - Create new calendars to organize your events
- **Merge calendars** - Combine multiple calendars into one with automatic duplicate detection
- **Export .ics** - Export your modified calendars in .ics format compatible with Google Calendar, Apple Calendar, Outlook, etc.
- **Clean duplicates** - Automatically remove duplicate events in a calendar

### Visualization and Navigation
- **List view** - Display all your events in a list with sorting and filters
- **Calendar view** - Visualize your events in an interactive monthly view (react-big-calendar)
- **Date filters** - Quickly filter by: Today, This week, This month, or All
- **Search** - Search for events by keyword in the title
- **Sort** - Sort by date, name, or duration

### Event Management
- **Create events** - Add new events with title, dates, description, and location
- **Edit events** - Edit all details of an existing event
- **Delete events** - Delete events individually
- **Create from calendar view** - Click on a time slot to create an event with pre-filled dates

### Authentication and Storage
- **Anonymous mode** - Use the application without creating an account (data stored locally in the browser)
- **Authentication** - Account option to save in the cloud (Better-Auth)
- **Synchronization** - Authenticated users can access their calendars from any device

## Tech Stack

- **TypeScript** - Type safety end-to-end
- **TanStack Router** - Type-safe routing
- **TailwindCSS** - Modern and responsive UI
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight and performant server framework
- **tRPC** - Type-safe APIs end-to-end
- **Bun** - Runtime and package manager
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database
- **Better-Auth** - Authentication
- **Biome** - Linting and formatting
- **PWA** - Progressive Web App support
- **Turborepo** - Optimized monorepo
- **Sentry** - Error and performance monitoring

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (version 1.3.1 or higher)
- [Docker](https://www.docker.com/) (optional, for local PostgreSQL)

### Installation

1. Clone the repository and install dependencies:

```bash
bun install
```

### Database Configuration

This project uses PostgreSQL with Prisma.

#### Option 1: PostgreSQL with Docker (recommended)

```bash
# Start PostgreSQL locally
docker compose -f docker-compose.dev.yml up -d

# Configure the environment variable in apps/server/.env
DATABASE_URL="postgresql://calendraft:calendraft_dev@localhost:5432/calendraft_dev"
```

#### Option 2: Existing PostgreSQL

```env
# In apps/server/.env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

#### Initialize the database

```bash
# Generate Prisma client and push schema
bun run db:push

# (Optional) Seed database with test data (development only)
bun run db:seed

# (Optional) Open Prisma Studio
bun run db:studio
```

### Environment Configuration

Create a `.env` file in `apps/server`:

```env
# PostgreSQL database (required)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Backend server port (default: 3000)
PORT=3000

# Frontend URL for CORS (default: http://localhost:3001)
CORS_ORIGIN=http://localhost:3001

# Better-Auth configuration (optional for anonymous mode)
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

```

Create a `.env` file in `apps/web`:

```env
# Backend server URL (default: http://localhost:3000)
VITE_SERVER_URL=http://localhost:3000
```

### Starting

Launch the application in development mode:

```bash
bun run dev
```

This starts:
- The backend server on [http://localhost:3000](http://localhost:3000)
- The web application on [http://localhost:3001](http://localhost:3001)

Or launch them separately:

```bash
# Backend only
bun run dev:server

# Frontend only
bun run dev:web
```

## Docker

The project is fully dockerized to facilitate deployment.

### 🚀 Quick Start

#### Option 1: Development (PostgreSQL Docker + Local Apps)

```bash
# 1. Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 2. Initialize the database
bun run db:push

# 3. Launch apps locally (hot reload)
bun run dev
```

#### Option 2: Full Production (Everything in Docker)

```bash
# 1. Configure environment
cp docker.env.example .env
# Edit .env with your values

# 2. Build and start
docker-compose up -d --build

# 3. View logs
docker-compose logs -f
```

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 |
| `server` | 3000 | Backend API (Bun + Hono) |
| `web` | 3001 | Frontend (Nginx) |

📖 **Complete guide**: See [DOCKER.md](./DOCKER.md) for all commands and troubleshooting.

## Production

To deploy in production, consult the complete guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Production Checklist

- [ ] Environment variables configured (see `apps/server/.env.example`)
- [ ] `CORS_ORIGIN` defined (required, do not use `*`)
- [ ] `BETTER_AUTH_SECRET` generated (min 32 characters)
- [ ] Database initialized
- [ ] Build completed (`bun run build`)
- [ ] SSL/TLS certificate configured
- [ ] Health check accessible (`/health`)

### Critical Environment Variables

**Backend** (`apps/server/.env`):
- `CORS_ORIGIN`: Frontend URL (required in production)
- `BETTER_AUTH_SECRET`: Secret key for authentication (required)
- `NODE_ENV=production`: Production mode

**Frontend** (`apps/web/.env`):
- `VITE_SERVER_URL`: Backend API URL

### Security

- Rate limiting: 100 requests/minute per IP
- HTTP security headers configured automatically
- Input validation (max file size: 5MB)
- Anonymous user limitations: 10 calendars, 500 events/calendar
- Authenticated user limitations: 100 calendars, 2,000 events/calendar




## Project Structure

```
calendraft/
├── apps/
│   ├── web/           # Frontend application (React + TanStack Router)
│   └── server/        # API server (Hono)
├── packages/
│   ├── api/           # tRPC routers
│   ├── auth/          # Better-Auth configuration
│   ├── core/          # Business logic and shared types
│   ├── db/            # Prisma client and schemas
│   ├── ics-utils/     # ICS parsing and generation
│   ├── react-utils/   # React hooks and utilities
│   └── schemas/       # Zod validation schemas
```

## User Guide

### Anonymous Mode (without account)

1. Open the application in your browser
2. An anonymous ID is automatically generated and stored in localStorage
3. Your calendars are saved on the server but linked to your anonymous ID
4. You can use all features without creating an account

**⚠️ Important - Anonymous Mode Limitations:**
- Your calendars are linked to your browser via an anonymous ID stored in localStorage
- If you clear browser data or use private browsing, you will lose access to your calendars
- Anonymous calendars not accessed for 60 days are automatically deleted
- For permanent backup and multi-device access, create an account

### Authenticated Mode (with account)

1. Create an account via the login page
2. Your calendars are saved on the server
3. You can access your calendars from any device

### Typical Workflow

1. **Import a calendar**: Click on "Import a .ics file" from the home page
2. **Create an empty calendar**: Click on "Create a calendar" to start from scratch
3. **Add events**: In the calendar view, click on "Add an event" or click directly on a time slot in the month view
4. **Edit/Delete**: Use the edit and delete buttons in the list view
5. **Merge**: Select multiple calendars and merge them into one
6. **Clean up**: Remove duplicates from a calendar with the "Clean up" button
7. **Export**: Download your modified calendar in .ics format

## Available Scripts

- `bun run dev` - Start all applications in development mode
- `bun run build` - Compile all applications for production
- `bun run dev:web` - Start only the web application
- `bun run dev:server` - Start only the backend server
- `bun run check-types` - Check TypeScript types in all applications
- `bun run db:push` - Push schema changes to the database
- `bun run db:studio` - Open Prisma Studio to visualize the database
- `bun run db:generate` - Generate Prisma client
- `bun run db:migrate` - Apply database migrations
- `bun run db:seed` - Seed database with test data (development only)
- `bun run check` - Run formatting and linting with Biome
- `cd apps/web && bun run generate-pwa-assets` - Generate PWA assets

## Troubleshooting

### Backend server won't start

- Check that port 3000 is not already in use
- Make sure the database is properly configured: `bun run db:push`
- Check the terminal logs for errors

### Frontend cannot connect to backend

- Check that `VITE_SERVER_URL` in `apps/web/.env` points to `http://localhost:3000`
- Make sure the backend server is started (`bun run dev:server`)
- Check the browser console for CORS errors

### Data doesn't persist (anonymous mode)

- Check that localStorage is enabled in your browser
- Data is stored locally, it will not be available on another browser or device
- For multi-device persistence, create an account

### ICS parsing errors

- Check that the .ics file is valid and conforms to RFC 5545 format
- Some optional fields may be ignored, but start and end dates are required

## Sentry MCP (Model Context Protocol)

For advanced integration with AI assistants (like Cursor, Claude, etc.), you can add the official Sentry MCP server. This allows the AI to directly access Sentry errors to help you debug them.

### Sentry MCP Configuration

Add this configuration to your MCP configuration file (e.g., `.cursor/mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/sse"
    }
  }
}
```

Or for authentication-enabled configuration:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server-stdio"]
    }
  }
}
```

### Sentry MCP Features

Once configured, the AI assistant will be able to:
- List Sentry issues for your project
- Analyze stack traces and errors
- Propose fixes based on actual errors
- Correlate errors with source code

For more information: [github.com/getsentry/sentry-mcp](https://github.com/getsentry/sentry-mcp)

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file - Overview and quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Package architecture and dependency diagram |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete production deployment guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Project contribution guide |
| [SECURITY.md](SECURITY.md) | Security policy and vulnerability reporting |

### Package Documentation

| Package | Description |
|---------|-------------|
| [@calendraft/core](packages/core/README.md) | Business logic and shared types |
| [@calendraft/ics-utils](packages/ics-utils/README.md) | ICS file parsing and generation |
| [@calendraft/react-utils](packages/react-utils/README.md) | React hooks and utilities |
| [@calendraft/api](packages/api/README.md) | tRPC API and routers |
| [@calendraft/auth](packages/auth/README.md) | Better-Auth configuration |
| [@calendraft/db](packages/db/README.md) | Prisma client and DB schemas |
| [@calendraft/schemas](packages/schemas/README.md) | Zod validation schemas |

## Contributing

Contributions are welcome! See the [contribution guide](CONTRIBUTING.md) to get started.

## License

This project is licensed under MIT - see the [LICENSE](LICENSE) file for details.
