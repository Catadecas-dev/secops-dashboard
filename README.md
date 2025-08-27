# SecOps Dashboard

A production-ready, enterprise-grade Security Operations Dashboard built with Next.js 14, featuring comprehensive incident management, role-based access control, and enterprise security patterns.

## Architecture

This application follows a **modular layered monolith** architecture with strict module boundaries:

- **Auth Module**: Authentication, authorization (RBAC), session management, audit logging
- **Incidents Module**: Incident lifecycle management, business rules, policies
- **Comments Module**: Comment management and threading
- **Shared Modules**: Validation (Zod), errors, caching, observability, rate limiting

## Features

### Core Functionality
- **Incident Management**: Create, view, update, and track security incidents
- **Role-Based Access Control**: CLIENT_USER, CLIENT_ADMIN, ANALYST roles with granular permissions
- **Real-time Comments**: Add comments and collaborate on incident resolution
- **Advanced Search**: Full-text search with PostgreSQL tsvector + GIN indexing
- **Filtering & Pagination**: Filter by status, severity with cursor-based pagination

### Security Features
- **Authentication**: Cookie-based DB sessions with absolute & idle timeouts
- **CSRF Protection**: Token validation on all state-changing operations
- **Rate Limiting**: Token bucket algorithm in Redis for login and API endpoints
- **Input Validation**: Zod schemas with strict validation and unknown field rejection
- **Object-Level Authorization**: Granular access control on all [id] routes
- **Security Headers**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy
- **Audit Logging**: Comprehensive append-only audit trail

### Enterprise Features
- **Caching**: Redis-based caching with event-driven invalidation
- **Observability**: OpenTelemetry traces/metrics, structured JSON logging
- **Health Checks**: `/internal/healthz` and `/internal/readyz` endpoints
- **Database**: PostgreSQL with Prisma ORM, transactions, FTS indexing
- **Session Management**: Secure session rotation, cleanup, multi-device support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Sessions**: Redis with ioredis
- **Authentication**: Custom implementation with secure sessions
- **Validation**: Zod schemas
- **UI**: React with Tailwind CSS and Radix UI components
- **Testing**: Jest (unit)
- **Deployment**: Docker with multi-stage builds

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (for local development)

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd secops-dashboard
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
```
The default values in `.env` are configured for the Docker setup and should work out of the box.

### 3. Start the Application
This command will build the Docker images, start all services (application, database, Redis), and apply database migrations automatically.
```bash
docker-compose up -d --build
```

### 4. Seed the Database
After the application has started, run this command to populate the database with demo data.
```bash
npm run db:seed
```

Your SecOps Dashboard is now running at `http://localhost:3000`.

### Demo Credentials
- **Admin**: `admin@secops.com` / `SecurePass123!`
- **Analyst**: `analyst@secops.com` / `AnalystPass123!`
- **User**: `user@secops.com` / `UserPass123!`

### Stopping the Environment
```bash
docker-compose down
```

## Testing

### Unit Tests
```bash
npm test
npm run test:watch
```

### Coverage
```bash
npm test -- --coverage
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Incidents
- `GET /api/incidents` - List/search incidents (with pagination)
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/[id]` - Get incident details
- `PATCH /api/incidents/[id]` - Update incident

### Comments
- `GET /api/incidents/[id]/comments` - Get incident comments
- `POST /api/incidents/[id]/comments` - Add comment

### Health
- `GET /api/internal/healthz` - Health check
- `GET /api/internal/readyz` - Readiness check

## Security Model

### Role Hierarchy
- **ANALYST**: Full access to all incidents and operations
- **CLIENT_ADMIN**: Manage incidents within organization, limited status transitions
- **CLIENT_USER**: View/update own incidents, limited operations

### Status Transitions
- **Analysts**: Any transition allowed
- **Client Admins**: OPEN↔IN_PROGRESS, IN_PROGRESS→RESOLVED
- **Users**: IN_PROGRESS→RESOLVED (own incidents only)

### Rate Limits
- **Login**: 5 attempts per 15 minutes per IP
- **API Writes**: 30 requests per minute per user
- **API Reads**: 100 requests per minute per user

## Monitoring & Observability

### Metrics
- HTTP request duration and count
- Authentication attempts
- Incident operations
- Cache hit/miss rates

### Logging
- Structured JSON logs with request correlation
- User actions and security events
- Performance metrics and errors


## Configuration

Key environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Authentication
AUTH_SECRET=your-secret-key
SESSION_MAX_AGE=86400
SESSION_UPDATE_AGE=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5


```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built for enterprise security operations**
