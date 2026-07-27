# Diabitrage

Diabitrage is a professional internal center for governed asset recovery. The application presents a London-desk executive dashboard for case `DB-P-2023-W`, including live recovery balances, an operational ledger, synchronization controls, manual provisioning, Axiom batch processing, and liquidity-release workflows.

## Key Capabilities

- Secure login, signup, password recovery, and session handling with Netlify Identity
- Per-user protected case records and authenticated API access
- Persisted balances, ledger entries, and workflow events in Netlify Database
- Recovery profit, affiliate reserve, total recovered assets, and hardship credit tracking
- Interactive synchronization, provisioning, batch, and release workflows
- Responsive executive interface with loading, error, success, and modal states
- Explicit simulation safeguards with no external transfer capability

## Technology

- TanStack Start and TanStack Router
- React 19 and TypeScript
- Tailwind CSS 4 with a custom application design system
- Chart.js for recovery trajectory visualization
- Netlify Identity via `@netlify/identity`
- Netlify Functions
- Netlify Database with Drizzle ORM

## Run Locally

Install dependencies and start the Netlify development environment:

```bash
pnpm install
pnpm dev
```

The application is served through Netlify Dev on `http://localhost:8889`. Full Identity authentication should be tested on a Netlify deploy or deploy preview because the hosted Identity service is not available entirely on localhost.

For visual work that does not require authentication or Netlify platform services:

```bash
pnpm run dev:vite
```

## Database

The schema lives in `db/schema.ts`. Netlify provisions the managed Postgres database on first connection and applies migrations from `netlify/database/migrations/` during deployment.

After changing the schema, generate a new migration:

```bash
pnpm exec drizzle-kit generate --name add_descriptive_change
```

## Security Model

The recovery API verifies the active Netlify Identity user before initializing, reading, or mutating a case. Case data is isolated by Identity user ID. The interface and API model financial administration workflows only and do not integrate with banking or payment networks.
