# Diabitrage Project Guide

## Overview

Diabitrage is a secure internal asset-recovery administration application. It combines a polished React dashboard, Netlify Identity authentication, authenticated Netlify Functions, and a Netlify Database ledger. All financial operations are explicitly modeled workflows; the application does not connect to banking rails or initiate external transfers.

## Architecture

- `src/routes/` contains TanStack Router pages and document metadata.
- `src/components/AuthPortal.tsx` owns login, signup, and password-recovery interactions through `@netlify/identity`.
- `src/components/RecoveryDashboard.tsx` owns the authenticated dashboard, periodic refresh, modals, charts, and workflow state.
- `src/styles.css` contains the complete visual system and responsive layouts.
- `netlify/functions/recovery-case.mts` is the authenticated API for case initialization, reads, provisioning, synchronization, Axiom batches, and liquidity releases.
- `db/schema.ts` defines the Postgres tables for cases, ledger entries, and workflow events.
- `db/index.ts` exports the Netlify Database Drizzle client.
- `netlify/database/migrations/` contains generated schema migrations applied by Netlify.

## Data Flow

The browser authenticates with Netlify Identity and calls `/api/recovery/case` with the secure session cookie. The function verifies the current user before reading or changing data. Each identity receives an isolated `DB-P-2023-W` case record. Workflow mutations update balances and append auditable ledger and event rows in Netlify Database.

## Conventions

- Use TypeScript and strict types throughout.
- Keep browser-only identity calls inside effects or event handlers.
- Keep persistent state in Netlify Database; do not add local JSON or in-memory persistence.
- Protect every function that exposes case data with `getUser()` from `@netlify/identity`.
- Generate a migration with `pnpm exec drizzle-kit generate --name <imperative_name>` after every schema change.
- Preserve the restrained navy, parchment, and brass design system in `src/styles.css`.
- Use sentence case for interface labels and monospaced typography for references and financial identifiers.

## Local Development

Run `pnpm dev` to start Netlify Dev on port `8889`. Identity authentication requires a deployed Netlify environment for complete end-to-end testing. `pnpm run dev:vite` is available for unauthenticated visual work only.

## Non-Obvious Decisions

- The initial dashboard figures seed once per authenticated identity so the project is useful on a fresh database.
- All workflow controls write to the database but remain a financial simulation without external payment capabilities.
- The dashboard polls every 30 seconds and also supports manual refresh, creating a real-time operational feel without persistent socket infrastructure.
