# CLAUDE.md

This file provides context for Claude Code when working with this repository.

## Project Overview

**NestJS Starter Boilerplate** — production-ready backend template with TypeScript, PostgreSQL, and comprehensive CI/CD.

## Quick Reference

| Stack | Details |
|-------|---------|
| Framework | NestJS 11, TypeScript 5.7 (strict) |
| Database | PostgreSQL 16+, TypeORM 0.3 |
| Validation | **Zod 4.2** via nestjs-zod (NOT class-validator) |
| Auth | Better Auth 1.4 (session-based + Email OTP) |
| Testing | Playwright (E2E), Jest (unit) |
| Linting | Biome |
| Package Manager | pnpm 10+ |

## Code Conventions

### Import Paths
```typescript
// ✅ External packages
import { Injectable } from '@nestjs/common';

// ✅ Internal modules — use #/ prefix
import { User } from '#/app/db/entities/user.entity';
import { AuthService } from '#/auth/auth.service';

// ❌ Bad — relative paths
import { User } from '../../../app/db/entities/user.entity';
```

### Validation (Zod only)
```typescript
// ✅ Correct
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
export class CreateUserDto extends createZodDto(schema) {}

// ❌ Wrong — class-validator
import { IsEmail } from 'class-validator';
```

### Controllers
```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }
}
```

## Project Structure

```
src/
├── app/              # Infrastructure (filters, config, db, health, metrics)
├── auth/             # Authentication (Better Auth)
├── notifications/    # Multi-channel notifications
├── products/         # ⚠️ DEMO MODULE — delete before use
└── main.ts

e2e/                  # Playwright E2E tests
docs/                 # Documentation
```

## Commands

```bash
# Development
pnpm dev              # Start with hot reload
pnpm lint             # Biome lint + format
pnpm exec tsc --noEmit  # Type check

# Testing
pnpm test:unit        # Jest unit tests
pnpm test:e2e         # Playwright E2E tests

# Database
pnpm migration:generate src/app/db/migrations/Name
pnpm migration:run
```

## Review Checklist

When reviewing PRs, verify:

- [ ] TypeScript strict mode (no unjustified `any`)
- [ ] Zod for validation (NOT class-validator)
- [ ] `#/` import paths for internal modules
- [ ] Swagger decorators on controllers
- [ ] E2E tests for new API endpoints
- [ ] No hardcoded secrets
- [ ] Conventional Commits format

## Critical Rules

1. **Never use class-validator** — use Zod + nestjs-zod
2. **Never commit .env files** — use environment variables
3. **Always write E2E tests** for new API endpoints
4. **Use ErrorCode enum** for error responses
5. **Run security audit** before merging: `pnpm audit --audit-level=high`

## Documentation

- [AGENTS.md](AGENTS.md) — detailed coding agent instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) — system design and patterns
- [docs/](docs/) — feature-specific documentation
