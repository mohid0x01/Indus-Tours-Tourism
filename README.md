<div align="center">

<br/>

<img src="https://github.com/user-attachments/assets/2f1d4b7b-2533-49a6-9821-7f4bdffd1e36" alt="Indus Tours & Tourism" width="160" />

<br/><br/>

# INDUS TOURS & TOURISM

**Pakistan's Northern Frontier — Engineered for the Modern Traveler**

<br/>

[![Live Portal](https://img.shields.io/badge/▶%20LIVE%20PORTAL-industours.vercel.app-0f172a?style=for-the-badge&logoColor=white)](https://industours.vercel.app)
&nbsp;
[![TypeScript](https://img.shields.io/badge/TypeScript-96.3%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
&nbsp;
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
&nbsp;
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
&nbsp;
[![Commits](https://img.shields.io/badge/Commits-498-f97316?style=for-the-badge&logo=git&logoColor=white)](https://github.com/mohid0x01/indus-trails-online-7d2b34c3/commits/main)

<br/>

</div>

<div align="center">
<img src="https://github.com/user-attachments/assets/71461599-18d5-4309-bbcd-a1e78dcaf730" width="100%" alt="Indus Tours — Northern Pakistan Hero Banner" />
</div>

<br/>

---

There is a version of northern Pakistan that exists in photographs — Hunza's gilded autumn terraces, the obsidian walls of Karakoram granite catching first light above Skardu, the Fairy Meadows plateau suspended impossibly between pine-line and permanent snow. And then there is the version that exists for the traveler who has actually tried to plan a trip there: a fragmented landscape of WhatsApp coordinators, inconsistent pricing, offline booking spreadsheets, and an industry that has historically operated as though the internet were optional infrastructure.

**Indus Tours & Tourism** was built as a direct refusal of that status quo. This repository is the technical expression of that refusal — a production-grade, full-stack travel commerce platform designed from first principles to bring the operational complexity of high-altitude expedition planning into a single, coherent, real-time digital experience.

<br/>

<div align="center">
<img src="https://github.com/user-attachments/assets/bc953796-2981-4314-b307-bd57f356a866" width="100%" alt="Indus Tours — Portal Homepage" />
</div>

<br/>

## The Operational Mandate

The platform serves a deceptively complex commercial domain. A traveler booking a 12-day Gilgit-Baltistan circuit is not purchasing a single product — they are assembling a multi-modal, multi-vendor, multi-destination itinerary that involves ground transport across high-altitude passes, accommodation across five or more distinct localities, and a tour structure that must account for weather windows, road closures, and altitude acclimatization schedules. Historically, this coordination has lived entirely inside the head of a local operator and the inbox of a harried travel agent.

This platform externalizes that coordination into structured, queryable, real-time data. **Tour packages** are the primary commercial surface: fully authored itineraries spanning 5 to 21 days, built for specific traveler archetypes — the family group requiring comfort-class accommodation and a Coaster van, the corporate retreat needing bespoke scheduling and block hotel allocations, the adventure traveler pushing toward K2 Base Camp. Each package carries its own pricing tier, duration, inclusions manifest, and live inventory state — managed in Supabase and reflected on the client surface in real time, not frozen at last deployment.

**Vehicle rental** is a first-class entity in the data model, not a footnote. The Northern Areas demand ground transport selection as a primary travel decision: a Suzuki Bolan is not an appropriate vehicle for the Babusar Pass, and a Land Cruiser is overkill for a Swat Valley family circuit. The platform surfaces vehicle class, passenger capacity, and terrain-readiness attributes alongside tour packages, so clients and operations staff work from the same live inventory state rather than negotiating across disconnected channels.

**Hotel accommodation** inventory is embedded directly within the itinerary layer. Room categories, seasonal availability, and allocation blocks are managed as structured database objects with RLS-enforced access controls, ensuring that a hotel's allocation within a package block is always coherent with its broader inventory state — and always partitioned correctly between clients.

<br/>

<div align="center">
<img src="https://github.com/user-attachments/assets/d0dd90c8-4997-4c24-b583-d8c4b831021c" width="100%" alt="Indus Tours — Tour Package Catalog" />
</div>

<br/>

## The Technical Architecture

The codebase is **96.3% TypeScript** — a figure that is not incidental. In a travel commerce platform where a malformed booking payload can mean a real person stranded in Skardu without a confirmed hotel room, type safety is not a developer-ergonomics preference. It is a contractual obligation. The project enforces TypeScript in strict mode across two distinct compilation targets — `tsconfig.app.json` for the browser runtime and `tsconfig.node.json` for the build toolchain — ensuring that type fidelity is maintained from the Supabase schema surface all the way to the rendered UI component. No runtime type surprises; no silent coercions; no undefined is not a function at 3am during peak booking season.

**React 18** provides the component model, organized around a clean separation between page-level route components and the reusable domain-specific compositions that power the booking funnel, the package catalog, and the administrative surfaces. The component registry is governed by `components.json` — the shadcn/ui configuration manifest that controls how primitive components are generated, themed, and extended without creating a dependency on an opinionated third-party design system. The components are owned by the codebase; they are not imported from a CDN.

**Vite** serves as the build orchestrator. Its native-ESM development server eliminates the full-bundle compilation cycle that makes large TypeScript projects feel slow to iterate on — the hot module replacement loop runs in milliseconds, not seconds. The production build pipeline, powered by Rollup, produces optimally code-split, tree-shaken output bundles that minimize time-to-interactive. This matters concretely: a meaningful segment of the target audience is booking tours from mobile connections in bandwidth-variable environments, and the first-paint performance of the application reflects that design constraint.

**Tailwind CSS** provides the utility-first styling substrate, configured in `tailwind.config.ts` with project-specific design tokens and color scales. The **CSS layer accounts for only 2.2% of the codebase** — evidence that the Tailwind-first approach is functioning as designed, with hand-authored CSS reserved exclusively for cases where utility classes cannot adequately express the visual logic. Combined with shadcn/ui's headless, accessible component primitives, the design system delivers the velocity of an opinionated library while retaining granular visual control at every breakpoint.

The backend is anchored by **Supabase** — a fully managed PostgreSQL infrastructure providing relational data integrity, row-level access control, real-time subscription capability, and a type-safe autogenerated client SDK. The **PLpgSQL layer (1.3% of the codebase)** lives entirely within `supabase/migrations/` as version-controlled schema migrations: table definitions, index strategies, foreign key constraints, and — critically — the Row Level Security policies that enforce data partitioning at the database engine level itself. RLS in PostgreSQL means access control operates below the application API layer. Even if a query in the application layer omits an authorization filter, the database enforces isolation by policy: a client session authenticated as User A cannot read, write, or infer the existence of User B's bookings, regardless of how that query reaches the engine.

**Vercel** handles deployment and edge delivery. The `vercel.json` configuration at the repository root manages SPA route fallback behavior, ensuring that deep-linked routes — package detail pages, booking confirmations, admin panels — resolve correctly from the CDN edge rather than returning a 404. Every push to `main` triggers an automatic deployment pipeline; the production surface at `industours.vercel.app` reflects the current state of `main` at all times with zero manual intervention.

<br/>

<div align="center">
<img src="https://github.com/user-attachments/assets/3fdc7b4f-1cd9-4ef8-9164-adda7a59f789" width="100%" alt="Indus Tours — Booking Flow & Itinerary Builder" />
</div>

<br/>

## Repository Anatomy

The **497-commit history** of this repository reflects a codebase built with iterative production discipline — not scaffolded once and abandoned, but actively evolved through a full release lifecycle. The source tree is organized around a principled separation of concerns:

```
indus-trails-online/
│
├── src/                            # Application source — 96.3% TypeScript
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitive registry (owned, not imported)
│   │   ├── booking/                # Booking funnel: itinerary builder, confirmation panels
│   │   ├── packages/               # Tour catalog: cards, filters, detail views
│   │   ├── vehicles/               # Vehicle rental interface components
│   │   ├── hotels/                 # Accommodation browsing & allocation views
│   │   └── layout/                 # Shell, navbar, footer, responsive containers
│   ├── pages/                      # Route-level components (React Router)
│   ├── hooks/                      # Custom React hooks: data fetching, booking state
│   ├── lib/
│   │   ├── supabase.ts             # Authenticated Supabase client (singleton)
│   │   └── utils.ts                # Shared utility functions
│   ├── types/                      # TypeScript interfaces & Supabase schema types
│   └── styles/                     # Global styles & Tailwind token overrides (2.2% CSS)
│
├── supabase/
│   └── migrations/                 # Version-controlled PLpgSQL schema (1.3%)
│       ├── [timestamp]_tours.sql   # Tour packages table & indexes
│       ├── [timestamp]_vehicles.sql
│       ├── [timestamp]_hotels.sql
│       ├── [timestamp]_bookings.sql
│       └── [timestamp]_rls.sql     # Row Level Security policies per table
│
├── public/                         # Static assets: images, icons, favicons
│
├── vite.config.ts                  # Build & dev server configuration
├── tailwind.config.ts              # Design system tokens & Tailwind extensions
├── components.json                 # shadcn/ui component registry manifest
├── tsconfig.app.json               # TypeScript — browser compilation target
├── tsconfig.node.json              # TypeScript — Node/toolchain target
├── vercel.json                     # SPA route fallback & Vercel edge config
├── eslint.config.js                # ESLint flat config
├── bun.lock / bun.lockb            # Bun dependency lockfiles (text + binary)
└── .env                            # Runtime Supabase credentials
```

<br/>

<br/>

## Initializing a Local Environment

The development environment resolves in four deliberate steps. Clone the repository and navigate into the project root. Dependency resolution is managed via **Bun** — its binary lockfile format (`bun.lockb`) produces fully reproducible installs measurably faster than npm equivalents on large TypeScript dependency graphs.

```bash
# 1. Clone the repository
git clone https://github.com/mohid0x01/indus-trails-online-7d2b34c3.git
cd indus-trails-online-7d2b34c3

# 2. Hydrate the dependency graph from the Bun lockfile
bun install

# 3. Inject Supabase runtime credentials
#    Create a .env file at the project root containing:
#
#    VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
#    VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
#
#    Both values are found in your Supabase dashboard at:
#    Project Settings → API → Project URL & anon/public key.
#
#    The VITE_ prefix is required — Vite's security model exposes
#    only VITE_-prefixed variables to the browser bundle.

# 4. Start the Vite development server
bun run dev
#    → Application available at http://localhost:5173
#    → Full HMR active across all components and routes
```

Without the Supabase credentials present in `.env`, the data layer will not initialize — tour packages, vehicle inventory, hotel allocations, and booking state will all be unavailable. For the production build, `bun run build` invokes the Vite/Rollup pipeline and emits an optimized, deployment-ready static output to `/dist`. The Vercel CI integration handles promotion from `/dist` to the live edge automatically on every push to `main`.

<br/>

<div align="center">
<img src="https://github.com/user-attachments/assets/d6d32ddf-31a7-4381-a475-d91766ab00c0" width="100%" alt="Indus Tours — Admin & Inventory Management" />
</div>

<br/>

---

<br/>

<div align="center">

### Engineered by

<br/>

<img src="https://github.com/mohid0x01.png" width="92" style="border-radius:50%;" alt="Muhammad Mohid" />

<br/><br/>

**Muhammad Mohid**
<br/>
*Full-Stack Engineer · System Architect*

<br/>

[![GitHub @mohidqx](https://img.shields.io/badge/GitHub-@mohidqx-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mohidqx)
&nbsp;&nbsp;
[![Portfolio](https://img.shields.io/badge/Portfolio-mohid0x01.vercel.app-0f172a?style=for-the-badge&logo=vercel&logoColor=white)](https://mohid0x01.vercel.app)

<br/><br/>

---

<br/>

| Layer | Technology | Role |
|:---|:---|:---|
| Frontend Runtime | React 18 + TypeScript 5 (strict) | Component model & type safety |
| Build System | Vite + Rollup | Dev server & production bundling |
| Design System | Tailwind CSS + shadcn/ui | Utility-first styling & accessible primitives |
| Backend & Auth | Supabase (PostgreSQL) | Real-time data, auth & RLS enforcement |
| Database Layer | PLpgSQL migrations | Schema versioning & security policies |
| Package Manager | Bun | Fast, reproducible dependency management |
| Deployment | Vercel (Edge CDN) | CI/CD pipeline & SPA route handling |
| Code Quality | ESLint (flat config) | Static analysis & style enforcement |

<br/><br/>

---

<br/>

<sub>© Indus Tours & Tourism · All Rights Reserved · Northern Areas of Pakistan</sub>
<br/>
<sub>Production deployment · <a href="https://industours.vercel.app">industours.vercel.app</a></sub>

<br/>

</div>
