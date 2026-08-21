# verzel

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Fastify, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Fastify** - Fast, low-overhead web framework
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

### Local development (Docker)

1. Copy `apps/server/.env.example` to `apps/server/.env` (defaults already point to the local Docker Postgres).
2. Start a local Postgres instance:

```bash
bun run docker:up
```

3. Apply the schema to your database:

```bash
bun run db:push
```

Stop the local database with `bun run docker:down` (data persists in a Docker volume between restarts).

### Using a hosted database (e.g. Neon)

Update `apps/server/.env` with your PostgreSQL connection details (a Neon `postgresql://...?sslmode=require` URL works out of the box — SSL is enabled automatically when `sslmode=require` is present), then run `bun run db:push`.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@verzel/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment

### Vercel Services

- Target: web + server
- Config: `vercel.json`
- Link the project first: bun run deploy:setup
- Local Vercel dev: bun run dev:vercel
- Sync preview env: bun run env:preview
- Sync production env: bun run env:production
- Dry-run check (no upload): bun run deploy:check
- Preview deploy: bun run deploy
- Production deploy: bun run deploy:prod
- Web requests under `/api/*` route to the server service and are rewritten before reaching the backend.
  Vercel Services share project environment variables, but deploys do not upload local `.env` files automatically. Link the project with `vercel link`, then run the env sync command before your first deploy (otherwise the deployment starts with no env vars), or pass one-off envs with `vercel deploy -e KEY=value`.
  Pass Vercel CLI flags to the env sync command directly, for example: `bun run env:production --scope your-team`.

For more details, see the guide on [Deploying to Vercel](https://www.better-t-stack.dev/docs/guides/vercel).

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Run checks: `bun run check`

## Testes

As convenções de testes deste projeto estão descritas em [`TESTING.md`](./TESTING.md) (Vitest, Testing Library, `fastify.inject()`, colocation, padrão AAA). Esta seção documenta como rodar e verificar os testes.

### Como rodar

```bash
bun run test
```

Roda os testes de todos os workspaces (`apps/server`, `apps/web`) via Turborepo. Também é possível rodar por workspace:

```bash
cd apps/server && bun run test
cd apps/web && bun run test
```

### Cobertura

A cobertura mínima exigida é **80%** (statements, branches, functions e lines), configurada em `coverage.thresholds` de cada `vitest.config.ts`/`vite.config.ts`. Ela é calculada automaticamente em todo `bun run test` (não é preciso passar `--coverage`) e, se qualquer métrica ficar abaixo de 80%, o comando termina com código de erro. O relatório em HTML fica em `coverage/` dentro de cada workspace (ignorado pelo Git).

### Banco de dados de teste

Os testes de integração de `apps/server` (rotas via `fastify.inject()`) usam um banco Postgres de teste separado (`verzel_test`), no mesmo container Docker do ambiente de desenvolvimento (`bun run docker:up`). Antes de cada execução de `bun run test` em `apps/server`, o script `pretest` (`apps/server/scripts/migrate-test-db.ts`) cria o banco `verzel_test` (se ainda não existir) e aplica as migrations nele — não é preciso nenhum passo manual, desde que o Postgres do `docker-compose` esteja rodando.

Os valores de ambiente usados nos testes (dummy, sem segredos reais) ficam em `apps/server/.env.test` e `apps/web/.env.test`, versionados no repositório.

### Bloqueio de push com testes falhando ou cobertura insuficiente

Há um hook `.husky/pre-push` que roda `bun run test` antes de qualquer `git push`. Como a cobertura mínima já é verificada dentro do próprio `vitest run`, o push é bloqueado tanto quando um teste falha quanto quando a cobertura fica abaixo de 80%.

**Limitação conhecida:** esse bloqueio é local — `git push --no-verify` ainda contorna o hook, e não há CI configurado neste repositório como segunda camada de proteção (decisão consciente para manter o escopo enxuto; pode ser adicionado depois, se necessário).

### Fora do escopo de testes

`packages/db` (schema Drizzle, migrations e fábrica de conexão) não tem uma suíte de testes dedicada — é uma decisão consciente, já que o pacote tem pouca lógica própria para testar isoladamente. Ele é exercitado indiretamente pelos testes de integração de `apps/server` que usam o banco de teste real.

### Uso de IA neste trabalho

A infraestrutura de testes (configuração do Vitest, o refactor de `apps/server/src/index.ts` para extrair `buildApp()`, o script de migração do banco de teste, o hook `pre-push` e os arquivos de teste iniciais listados acima) foi escrita com apoio de IA (Claude Code), incluindo a escolha das ferramentas (Vitest, Testing Library, `fastify.inject()`) e a cobertura dos principais fluxos de sucesso e erro de cada camada.

## Project Structure

```
verzel/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Fastify)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run test`: Run all tests (with coverage enforcement) across workspaces
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run docker:up`: Start the local Postgres container
- `bun run docker:down`: Stop the local Postgres container
- `bun run check`: Run Biome formatting and linting
- `bun run deploy:setup`: Link this repo to a Vercel project (first-time setup)
- `bun run dev:vercel`: Run the Vercel Services dev environment locally
- `bun run env:preview`: Sync local env files to the Vercel preview environment
- `bun run env:production`: Sync local env files to the Vercel production environment
- `bun run deploy`: Create a Vercel preview deployment
- `bun run deploy:prod`: Deploy to Vercel production
- `bun run deploy:check`: Dry-run a deploy to preview framework detection and included files without uploading
