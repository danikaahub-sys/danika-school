# Danika School Website

Persian RTL marketing site for Danika School (Next.js App Router).

## Stack

- Next.js 16 + React 19
- next-intl (Persian only, `fa`)
- Tailwind CSS v4 + Shadcn UI
- IRANYekan + Space Grotesk fonts
- Clerk scaffolding present but unused for now

## Setup

```bash
cp .env.example .env   # if present; otherwise use existing .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server + local DB helper |
| `npm run build` | Production build |
| `npm run check:types` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |

## Notes

- Document direction is fixed RTL (`lang="fa"` / `dir="rtl"`).
- Sign-in / sign-up CTAs are removed from marketing; Clerk routes remain for later.
- `/school` introduces the school product. **ورود به دمو** opens `NEXT_PUBLIC_SCHOOL_URL/sign-in` (local default `http://school.localhost:5173/sign-in`; production `https://school.danikahub.ir/sign-in`).
- Run website and school together (`dev:all` in the VS Code workspace, or `npm run dev` in `website/` plus `pnpm dev` in `school/`), then open [http://localhost:3000/school](http://localhost:3000/school).
