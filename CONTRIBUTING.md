# Contributing to penciled.fyi

Thank you for your interest in contributing to penciled.fyi! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Git

### Local Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your environment variables
5. Start the development server:
   ```bash
   pnpm dev
   ```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes

### React

- Use functional components with hooks
- Prefer `const` arrow functions for components
- Keep components small and focused
- Extract reusable logic into custom hooks

### Naming Conventions

- **Files**: kebab-case (`booking-flow.tsx`)
- **Components**: PascalCase (`BookingFlow`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)
- **CSS classes**: kebab-case via Tailwind

### Code Organization

```
src/
├── app/           # Next.js App Router pages
├── components/    # Reusable React components
├── lib/           # Utility functions and business logic
├── test/          # Test setup and mocks
└── types/         # TypeScript type definitions
```

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add Google Calendar sync
fix: resolve timezone display issue
refactor: extract availability logic
docs: update API documentation
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Create a PR with:
   - Clear description of changes
   - Screenshots if UI changes
   - Link to related issues

## Testing

### Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run with coverage
pnpm test:coverage
```

### Writing Tests

- Place test files alongside source files (`*.test.ts`)
- Use descriptive test names
- Test both happy paths and edge cases
- Mock external dependencies

Example:
```typescript
describe('BookingService', () => {
  it('should create a booking with valid data', async () => {
    // ...
  })

  it('should reject booking with invalid email', async () => {
    // ...
  })
})
```

## API Guidelines

### Route Structure

- Use RESTful conventions
- Return appropriate HTTP status codes
- Include error messages in response body

### Validation

- Use Zod schemas for input validation
- Validate at API boundaries
- Return clear validation error messages

### Error Handling

- Log errors to console and error webhook
- Return user-friendly error messages
- Don't expose internal details

## Database

### Migrations

- Place migrations in `/migrations`
- Use descriptive file names
- Test migrations on a copy first

### RLS Policies

- All tables must have RLS enabled
- Write restrictive policies by default
- Document policy logic in comments

## Documentation

- Update README for significant changes
- Add JSDoc comments for public APIs
- Keep inline comments minimal but meaningful

## Questions?

- Open a GitHub issue for bugs or features
- Email support@penciled.fyi for other questions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
