# «Автодиспетчер»

AI decision support for train dispatching (conflict-free scheduling) and advisory ATO, with a Traffic Quality Index,
automatic replanning on incidents and a network layer for Kazakhstan. Hackathon prototype.

> **We do not prevent collisions — certified signalling does that. We recover section capacity, contain delay
> propagation and drive trains energy-efficiently.**
>
> RU: Мы не предотвращаем столкновения — это делает сертифицированная СЦБ. Мы возвращаем участку пропускную
> способность, локализуем распространение задержек и ведём поезда энергоэффективно.

> **RU:** Демонстрационный прототип системы поддержки принятия решений. Не заменяет СЦБ, АЛСН/АЛС-ЕН и сертифицированные
> системы безопасности движения. Все решения — рекомендации диспетчеру и машинисту, а не команды управления реальным поездом.
>
> **KZ:** Шешім қабылдауды қолдайтын жүйенің демонстрациялық прототипі. СЦБ, АЛСН/АЛС-ЕН және қозғалыс қауіпсіздігінің
> сертификатталған жүйелерін алмастырмайды. Барлық шешімдер — диспетчер мен машинистке арналған ұсыныстар, нақты пойызды
> басқару командалары емес.

Rules for contributors and agents: [`CLAUDE.md`](CLAUDE.md) · Specification: [`docs/SPEC.md`](docs/SPEC.md) ·
Status: [`docs/PROGRESS.md`](docs/PROGRESS.md) · Decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Hosting modes (no paid plan)

| Mode | What | Command |
|---|---|---|
| `LOCAL_FULL` (primary demo) | Full system on the Cloudflare runtime locally: Worker + Durable Objects (SQLite) + D1 | `pnpm start:local` |
| `PUBLIC_STANDALONE` (backup) | Static SPA on Workers Free; `packages/core` runs in a browser Web Worker; labelled in the UI | `pnpm deploy:public` |

Details and what differs: SPEC §2.1.

## Quick start

Requirements: Node ≥ 22 (`.nvmrc`: 24), pnpm 10 (`corepack enable` or `npm i -g pnpm@10.18.0`).

```bash
pnpm install
pnpm start:local      # build the SPA and run the full system → http://127.0.0.1:8787
```

Development with hot reload: `pnpm dev` (Vite on :5173 proxying to `wrangler dev` on :8787).

Language and theme can be set by link: `/status?lang=kk&theme=light`.

## Checks

```bash
pnpm check            # eslint + prettier + typecheck + all tests
pnpm build && pnpm build:standalone
```

## Public deploy (Workers Free)

One-time: `pnpm --filter @avt/public exec wrangler login` (or set `CLOUDFLARE_API_TOKEN`), then `pnpm deploy:public`.
CI deploys on every push to `main` when the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist;
without them the deploy job is skipped with a notice. The deployed Worker serves static assets and `/health` only.

## Repository layout

```
packages/core   pure domain logic (no I/O) — runs in Node tests, Durable Objects and a browser Web Worker
packages/i18n   RU/KZ resources, typed keys, glossary
packages/ui     design system «Пульт»: tokens, fonts, Tailwind theme, primitives
apps/web        React SPA
workers/api     LOCAL_FULL Worker + Durable Objects (never deployed)
workers/public  PUBLIC_STANDALONE deploy (static + /health)
tests/fixtures  test-only data (incl. the organiser-style dataset SEC-FIX-SAR) — never product data
docs/           SPEC, decisions, audit, progress, case brief, archive
```

## Roadmap (not in the hackathon submission)

- **AI Co-Pilot** (SPEC §20, DECISIONS D-010): chat over read-only tools with one *propose* tool, answers in RU/KZ, via
  OpenAI behind a dedicated `copilot-proxy` Worker (key server-side, rate limit + daily cap, deterministic fallback).
  Deferred in deadline mode (D-012). The LLM would never be used for the solver, ATO, QI, conflicts or explanations.
- Items behind feature flags at submission are listed in `docs/DEADLINE_PLAN.md` (Tier 3).

## Data

All trains, timetables, delays, crews and locomotives are fictional. Real geography (cities, approximate line geometry)
only. The imported synthetic dataset lives under `tests/fixtures/sec-fix-sar/` and is used only by tests
(`docs/DECISIONS.md` D-003, D-004). The earlier three.js mockup is archived at tag `archive/mockup-v0`.
