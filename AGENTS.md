# AGENTS.md - CheMuLab V3

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (includes tsc type-check)
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # Type-check only (no emit)
```

**No test framework is configured.** There are no test files in this repo.

## Project Overview

Next.js 16 app router, React 19, TypeScript (strict), Tailwind CSS v4, Firebase (client + admin), Zustand for state. Uses shadcn/ui (New York style) with CSS variables. Path alias: `@/*` maps to project root.

## Code Style

### Imports
- Group imports: React/hooks first, then libraries, then `@/` aliases, then relative imports
- Use `@/` path alias for all internal imports (e.g., `@/components/...`, `@/lib/...`)
- Named imports preferred; default imports for Next.js pages and React
- Type-only imports: `import type { Foo } from '...'`

### Formatting
- 2-space indentation, single quotes, no semicolons (Prettier defaults via ESLint)
- Max line length not enforced; keep lines reasonable
- Trailing commas in multi-line objects/arrays

### TypeScript
- `strict: true` — no `any` unless absolutely necessary
- Use explicit return types on exported functions
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use discriminated unions for state/results (e.g., `{ kind: 'success' } | { kind: 'error', message: string }`)
- Generic constraints over `any` casts

### Naming Conventions
- Components: PascalCase (`PeriodicPuzzlePage`, `DifficultySelector`)
- Hooks: camelCase with `use` prefix (`useIdle`, `useReactionSound`)
- Constants: UPPER_SNAKE_CASE (`ELEMENT_DETAILS_BY_SYMBOL`)
- Variables/functions: camelCase
- CSS modules: camelCase for class names, kebab-case in CSS files
- File names: kebab-case for pages/components (`periodic-puzzle/page.tsx`)

### React Patterns
- Server components by default; use `'use client'` only when needed (state, hooks, events)
- Custom hooks for reusable logic (Firebase, idle detection, sound)
- `useCallback`/`useMemo` for stable references passed to children or in dependency arrays
- Portal (`createPortal`) for overlays/modals/toasts to escape overflow contexts
- Section dividers in components: `/* ---------- section name ---------- */`

### Error Handling
- Try/catch around Firebase operations and file I/O
- Toast notifications for user-facing errors (`showToast('message', true)`)
- Graceful degradation: check `typeof window !== 'undefined'` for browser APIs
- Never expose raw error messages to users; use friendly messages

### CSS/Styling
- Tailwind CSS v4 with `cn()` utility (tailwind-merge + clsx) for conditional classes
- CSS modules for complex component-specific styles (`page.module.css`)
- CSS variables for theming (`var(--text-main)`, `var(--bg-card)`)
- `glass-panel` class for frosted glass effect
- Animation classes: `animate-in`, `zoom-in-95`, `slide-in-from-bottom-4`, etc.
- Mobile-first responsive: `max-xl:` for mobile overrides, `xl:` for desktop

### State Management
- Zustand for global auth state (`useAuthStore`)
- Custom hooks for domain-specific state (`useLabDiscoveries`, `useIdle`)
- Local `useState` for component-level state
- `useRef` for values that don't trigger re-renders (timers, DOM refs, drag state)

### Firebase
- Client SDK in `lib/firebase/` for auth, Firestore, storage
- Admin SDK in server actions/API routes only
- Discovery data synced per-user via Firestore

### Drag & Drop (Mobile)
- Touch drag uses 300ms hold delay before activating
- `isDraggingRef` (ref, not state) for real-time drag status in `touchMove`
- `e.preventDefault()` only after drag activates to allow normal scrolling
- Body scroll locked via `position: fixed` during active drag
- Ghost element rendered via `createPortal` at finger position
