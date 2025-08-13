# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Task-based Development (Primary)

- `task dev` - Start full development environment with background services
- `task run` - Start development without background services
- `task stop` - Stop development environment
- `task build` - Build the project for production
- `task preview` - Preview production build
- `task test` - Run all tests (integration + unit)

### npm/bun Scripts (Alternative)

- `bun run dev` / `npm run dev` - Start development server
- `bun run build` / `npm run build` - Build for production
- `bun run preview` / `npm run preview` - Preview production build
- `bun run test` / `npm run test` - Run tests
- `bun run check` / `npm run check` - Run svelte-check for type checking
- `bun run test:integration` - Run Playwright integration tests
- `bun run test:unit` - Run Vitest unit tests

### Additional Task Commands

- `task add <component>` - Add shadcn-svelte components
- `task sdk-gen` - Generate SDK from Swagger API
- `task error-schema:v1` - Generate error schema

## Architecture Overview

### Technology Stack

- **Frontend**: SvelteKit with TypeScript
- **Styling**: TailwindCSS with PostCSS
- **UI Components**: shadcn-svelte (bits-ui based)
- **Authentication**: Auth.js (@auth/sveltekit) with Descope provider
- **Payment**: Airwallex payment elements
- **Testing**: Playwright (integration) + Vitest (unit)
- **Infrastructure**: Kubernetes (k3d), Helm charts, Nix flakes
- **Build Tool**: Vite

### Project Structure

#### Configuration System

Multi-environment configuration in `src/config/`:

- `client/` - Client-side configuration by environment (lapras, pichu, pikachu, raichu)
- `server/` - Server-side configuration by environment
- `shared/` - Shared configuration by environment
- Accessed via `config` import from respective directories

#### Core Libraries

- **Result/Option Pattern**: Rust-inspired error handling in `src/lib/core/`
  - `result.ts` - Result<T,E> type with comprehensive async handling
  - `option.ts` - Option<T> type for nullable values
  - `error.ts` - Custom error types and utilities
- **API Layer**: Auto-generated from Swagger in `src/lib/api/core/`
- **Utilities**: Common functions in `src/lib/utility.ts` and `src/lib/utils.ts`

#### Component Architecture

- **UI Components**: `src/lib/components/ui/` - shadcn-svelte components
- **Entity Components**: `src/lib/components/entities/` - Business logic components for:
  - Bookings (booking, purchasing, cancellation)
  - Discounts (CRUD operations)
  - Passengers (CRUD operations)
  - Wallets (admin operations, transfers)
  - Withdrawals (approval workflow)
- **Complex Components**: `src/lib/components/complex/` - DateRangePicker, LightSwitch, etc.
- **Custom Components**: `src/lib/components/custom/` - account, calendar, footer, nav

#### Error Handling System

Structured error handling in `src/errors/`:

- `problem_details.ts` - RFC 7807 Problem Details format
- `v1/` - Versioned error types (aggregate, authentication, authorization)
- Global error state management via stores

#### Authentication & State Management

- **Authentication**: Auth.js with JWT token handling, auto-refresh logic
- **Global State**: Svelte stores in `src/store.ts`
  - `api` - Configured API client with authentication
  - `problem` - Global error state
  - `loading` - Global loading state
- **Session Management**: Layout server load handles user authentication flow

#### Routes & Pages

SvelteKit file-based routing in `src/routes/`:

- Admin dashboard pages (users, transactions, wallets, etc.)
- Public pages (terms, privacy, policy)
- API endpoints in `api/v1/`
- Registration and booking flows

### Development Environment

#### Infrastructure

- **Local Development**: k3d Kubernetes clusters (lapras/tauros environments)
- **Configuration**: YAML-based environment configs in `config/`
- **Secrets**: Managed via Doppler CLI
- **Scripts**: Development automation in `scripts/local/`

#### Package Manager

Project uses **bun** as the primary package manager (bun.lockb present), but npm commands are also supported.

#### Environment-Specific Features

The application supports multiple deployment environments (lapras, pichu, pikachu, raichu) with environment-specific configurations and API endpoints.

#### Nix Integration

- Nix flakes for reproducible development environments
- Pre-commit hooks and formatting configured via Nix
- Development shells defined in `nix/shells.nix`
