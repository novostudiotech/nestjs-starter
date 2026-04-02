[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![NestJS](https://img.shields.io/badge/NestJS-11-ea2845.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-339933.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/novostudiotech/nestjs-starter/pulls)

# NestJS Starter Boilerplate

**The modern NestJS starter -- production-ready from day one.**

- **Session-based auth out of the box** -- Better Auth with Email OTP, not another Passport + JWT tutorial project
- **Zod 4 for everything** -- runtime validation, static types, env config, and API contracts from a single source of truth
- **Real E2E tests** -- Playwright with auto-generated type-safe API client, not just Supertest wrappers
- **Ships with observability** -- structured logging (Pino), Prometheus metrics, health checks, and Sentry error tracking

---

## Why This Boilerplate?

Most NestJS starters are demo projects dressed up as boilerplates. They use outdated patterns, skip auth entirely, and leave you to figure out production concerns on your own. This one is different.

| Area | Typical NestJS starters | This starter |
|------|------------------------|--------------|
| **Auth** | Passport + JWT (stateless, no revocation) | Better Auth (session-based + Email OTP) |
| **Validation** | class-validator + class-transformer | Zod 4 (runtime + static types, single schema) |
| **Linting** | ESLint + Prettier (slow, conflicts) | Biome (10x faster, lint + format in one tool) |
| **E2E Testing** | Supertest (manual assertions) | Playwright (fixtures, parallel, auto-generated API client) |
| **Email** | Nodemailer (raw HTML) | Resend + React Email (component-based templates) |
| **Logging** | console.log or Winston | Pino (structured JSON, 5-10x faster) |
| **Config** | dotenv + manual parsing | Zod-validated env with type inference |
| **Error handling** | Basic exception filter | Structured error codes, i18n-ready, Sentry integration |

---

## Features

### Auth & Security
- [x] **Better Auth 1.4** -- session-based authentication with Email OTP
- [x] **Helmet** -- secure HTTP headers with strict CSP
- [x] **Rate limiting** and CORS configuration
- [x] **Sensitive data redaction** via fast-redact (logs, errors)
- [x] **TruffleHog** secret scanning in CI

### Database
- [x] **PostgreSQL 16+** with TypeORM 0.3
- [x] **Auto-migrations** on startup (fail-fast)
- [x] **UUIDv7 primary keys** (time-sortable, better index locality)

### API & Validation
- [x] **Zod 4** for request validation, env config, and type inference
- [x] **Swagger/OpenAPI** auto-generated from code
- [x] **Structured error responses** with error codes for i18n

### Email & Notifications
- [x] **Resend** transactional email delivery
- [x] **React Email** component-based templates with live preview
- [x] Multi-channel notification system (extensible)

### Testing
- [x] **Playwright** E2E tests with fixture system (`useAuthenticatedApi`, `useDb`)
- [x] **Auto-generated API client** from OpenAPI spec (Orval)
- [x] **Jest** unit tests for business logic
- [x] Separate test database with `.env.test`

### DevOps & Tooling
- [x] **Biome** -- linting and formatting (replaces ESLint + Prettier)
- [x] **Docker** + Docker Compose for local development
- [x] **Husky** + commitlint + lint-staged for quality gates
- [x] **Conventional Commits** enforced via Git hooks
- [x] **pnpm** for fast, disk-efficient package management

### Observability
- [x] **Pino** structured logging with request correlation IDs
- [x] **Prometheus metrics** at `/metrics`
- [x] **Health checks** at `/health` (database, memory, disk)
- [x] **Sentry** error tracking (optional, 5xx only)

---

## Quick Start

```bash
git clone git@github.com:novostudiotech/nestjs-starter.git my-project
cd my-project
pnpm install
pnpm init-project        # Interactive setup wizard
pnpm dev                 # http://localhost:3000
```

The setup wizard configures your project name, database, `.env` file, and auth secret automatically.

After initialization:

```bash
pnpm install
cp .env.example .env     # Edit with your values
pnpm dev
```

The application will be available at:
- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`
- Metrics: `http://localhost:3000/metrics`

---

## Project Structure

```text
src/
├── app/                  # System infrastructure
│   ├── config/           # Zod-validated environment configuration
│   ├── db/               # Database utilities, decorators, migrations
│   ├── dto/              # Base DTOs and error response schemas
│   ├── filters/          # Global exception handling + Sentry
│   ├── health/           # Health check endpoints
│   ├── metrics/          # Prometheus metrics
│   └── swagger/          # OpenAPI utilities
├── auth/                 # Better Auth integration (session + Email OTP)
├── notifications/        # Multi-channel notification system
│   └── channels/
│       └── email/        # Resend + React Email
│           ├── templates/       # TSX email templates
│           └── _components/     # Reusable email components
├── products/             # Example module (delete before use)
└── main.ts               # Bootstrap with security middleware

e2e/                      # Playwright E2E tests with fixtures
docs/                     # Comprehensive documentation
scripts/                  # Init wizard and utilities
```

---

## Principles

### Production-first
Everything here is designed to run in production environments. No experimental features, no half-baked integrations. Every dependency and configuration choice has been battle-tested.

### Minimal surface area
Only essential setup is included. No bloat, no kitchen sink. You get structured logging, type-safe validation, API documentation, and quality tooling -- nothing more, nothing less.

### Explicit over implicit
Configuration and behavior are visible and easy to reason about. No magic, no hidden abstractions. If something happens, you know where and why.

### Long-term maintainability
The project should still make sense after months or years. Clear patterns, consistent conventions, and well-documented decisions ensure the codebase remains approachable.

---

## Example Module

This boilerplate includes a `Products` module (`src/products/`) as a **demonstration example** showing:
- Zod validation with various data types (strings, numbers, booleans, enums, arrays, nested objects)
- Different authorization decorators (`@AllowAnonymous()` for public routes, protected routes requiring authentication)
- Query parameter validation (pagination, filtering, sorting)
- Body parser testing (POST/PUT/PATCH with JSON)
- Error handling patterns (400, 401, 404)
- Complete E2E test coverage

> **Important:** This module is for demonstration purposes only. **Delete it before starting your actual development** to avoid confusion and keep your codebase clean.

---

## Documentation

### Getting Started
- **[Setup Guide](SETUP.md)** -- Quick start and installation
- **[Docker Setup](docs/docker.md)** -- Docker and Docker Compose guide

### Development
- **[Zod Validation](docs/zod-validation.md)** -- Type-safe request validation
- **[Error Handling](docs/error-handling.md)** -- Error codes, i18n, and Sentry tracking
- **[E2E Testing](docs/e2e-tests.md)** -- End-to-end API testing
- **[E2E Fixtures](docs/e2e-fixtures.md)** -- Test data management
- **[Swagger](docs/swagger.md)** -- API documentation
- **[Working with Patches](docs/working-with-patches.md)** -- Package patches

### Operations
- **[Monitoring](docs/monitoring.md)** -- Health checks and metrics
- **[Conventional Commits](docs/conventional-commits.md)** -- Commit standards

---

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Start dev | `pnpm dev` |
| Edit email templates | `pnpm dev:email` |
| Run E2E tests | `pnpm test:e2e` |
| Run unit tests | `pnpm test:unit` |
| Lint code | `pnpm lint` |
| Type check | `pnpm exec tsc --noEmit` |
| Generate migration | `pnpm migration:generate src/app/db/migrations/Name` |
| Generate API client | `pnpm test:e2e:generate-api` |
| Build | `pnpm build` |
| Start prod | `pnpm start:prod` |

---

## Commit Standards

This project enforces [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history:

```bash
# format: <type>(<scope>): <subject>

feat(auth): add JWT token refresh
fix(users): resolve email validation bug
docs(readme): update installation steps
```

Commitlint validates all commit messages automatically via Git hooks.

---

## License

[MIT licensed](LICENSE).

---

<p align="center">
  Built by <a href="https://novostudio.tech"><strong>Novo Studio</strong></a> -- we build AI-powered software for startups and scale-ups.
</p>
