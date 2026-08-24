# One-Shot Prompt: Antojos Mobile V2 — Frontend Fix

## Context
You are working on `app-antojos-mobile-v2`, a Next.js 16 + React 19 + Supabase + Drizzle multi-tenant restaurant management PWA. The app is deployed on Vercel at `https://app-antojos-mobile-v2.vercel.app`.

The project is at: `C:\Users\Usuario\Downloads\app-antojos-mobile-v2`

## Tech Stack
- Next.js 16.3.0 (App Router)
- React 19.2.8
- Supabase (auth + database) via `@supabase/ssr`
- Drizzle ORM (Postgres)
- Tailwind CSS + shadcn/ui
- TypeScript

## Critical Issues to Fix

### 1. NO Middleware — Auth Guard Missing
There is **NO `src/middleware.ts`** file. The auth guard is only done per-page via `getCurrentUserOrNull()` in `page.tsx` files. This means:
- Any page without an explicit auth check is accessible without login
- The app shell renders even when not authenticated

**Fix**: Create `src/middleware.ts` using `@supabase/ssr` Next.js middleware pattern:
- Refresh expired Supabase auth tokens
- Protect ALL routes under `/` EXCEPT `/login`, `/admin/login`, `/api/debug/*`
- If no session → redirect to `/login`
- Keep existing per-page checks as defense-in-depth

### 2. Unused `nowIso` Import in `pedidos/route.ts`
File: `src/app/api/db/pedidos/route.ts:23`
```typescript
import { newId, nowIso } from "@/lib/repositories/types";
```
`nowIso` is imported but **never used** in this file. Remove it.

### 3. UserMenu Logout Button — Verify Visibility
The `UserMenu` component (`src/components/layout/user-menu.tsx`) has a logout button inside a `<details>` dropdown. The user reported they couldn't find a way to log out. Verify:
- The dropdown opens correctly on tap/click
- The "Cerrar sesión" button is visible and functional
- On mobile, the dropdown is properly positioned and not clipped

### 4. `pedido-new-page.tsx` Uses `nowIso()` for Client-Side Timestamps
File: `src/app/pedidos/nuevo/page.tsx:208,226`
```typescript
const createdAt = nowIso();
```
This is correct behavior (client sends ISO strings, API converts to Date objects). **Do NOT change this.** Just verify it works.

### 5. TypeScript Build Errors
Run `tsc --noEmit` and fix any type errors found. Common issues:
- Missing type imports
- Incorrect prop types
- Drizzle schema mismatches with DB

### 6. ESLint Errors
Run `eslint .` and fix any lint errors. Focus on:
- Unused variables
- Missing dependencies in hooks
- React best practices

### 7. Layout Auth Context — Verify Robustness
File: `src/app/layout.tsx`
The root layout queries `tenants`, `tenant_users`, and `super_admins` tables. If any query fails (e.g., table doesn't exist, RLS blocks), the entire page crashes. Add error boundaries or try/catch around these queries.

## Files to Examine and Potentially Fix

| File | Issue |
|------|-------|
| `src/middleware.ts` | **CREATE** — auth guard middleware |
| `src/app/api/db/pedidos/route.ts:23` | Remove unused `nowIso` import |
| `src/components/layout/user-menu.tsx` | Verify logout UX on mobile |
| `src/app/layout.tsx` | Add error handling for DB queries |
| `src/app/page.tsx` | Already has auth guard ✅ |
| `src/app/pedidos/nuevo/page.tsx` | Verify nowIso usage works |
| `src/components/features/pedido-detail-dialog.tsx` | Uses nowIso correctly ✅ |
| `src/components/features/ingrediente-form-dialog.tsx` | Uses nowIso correctly ✅ |

## Verification

After all fixes, run:
```bash
npm run verify
```
This runs `tsc --noEmit && eslint . && vitest run`. All three must pass.

## DO NOT
- Do NOT change any API route logic
- Do NOT modify database schema
- Do NOT change Supabase client configuration
- Do NOT add new dependencies
- Do NOT commit changes (user will commit manually)
- Do NOT run `npm run build` (per project rules)
