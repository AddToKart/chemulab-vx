# Agentic Coding Guidelines (AGENTS.md)

This file provides essential instructions for AI agents working in the **CheMuLab-VX** repository. Adhere strictly to these guidelines to ensure consistency, maintainability, and security.

---

## 1. Development Lifecycle & Commands

### Prerequisites
- **Node.js**: v20+ recommended.
- **Firebase**: A configured project with environment variables in `.env.local`.

### Standard Commands
- **Install Dependencies**: `npm install`
- **Development Server**: `npm run dev` (runs at http://localhost:3000)
- **Build Application**: `npm run build`
- **Start Production**: `npm start`
- **Lint Code**: `npm run lint`

### Testing
- **Current Status**: No automated test suite (Jest/Vitest) is currently configured.
- **Manual Verification**: Before completing a task, manually verify changes in the browser (dev server). Ensure no regressions in the virtual lab, elements explorer, or social system.
- **Single Test Execution**: Since no runner is installed, testing is strictly manual via UI interaction.

---

## 2. Code Style & Architecture

### General Guidelines
- **Framework**: Next.js 16 (App Router) + React 19.
- **Language**: TypeScript (strict mode).
- **Styling**: Tailwind CSS v4 + Lucide React icons.
- **Indentation**: 2 spaces.
- **End of Line**: LF.

### Imports & Path Aliases
- **Root Alias**: Always use the `@/` prefix for root-level imports.
  - Correct: `import { Button } from '@/components/ui/button';`
  - Avoid: `import { Button } from '../../components/ui/button';`
- **Import Ordering**:
  1. React/Next.js core libraries.
  2. Third-party libraries (Firebase, Lucide, Radix, etc.).
  3. Internal utility/store/type files (`@/lib/...`, `@/store/...`).
  4. Internal components (`@/components/...`).
  5. Styling/CSS.

### Naming Conventions
- **Components**: PascalCase for files and exports (e.g., `NotebookModal.tsx`, `PopoyChatbot.tsx`).
- **Hooks**: `use` prefix + kebab-case for filenames (e.g., `use-notebook.ts`, `use-auth-store.ts`).
- **Utility/Logic Files**: kebab-case (e.g., `lab-elements.ts`, `auth-service.ts`).
- **Stores**: `store/` directory with `-store.ts` suffix (e.g., `auth-store.ts`).
- **UI Components (Shadcn)**: kebab-case (e.g., `scroll-area.tsx`, `star-rating.tsx`).
- **State/Variables**: camelCase (e.g., `isRegistered`, `userProfile`).

### TypeScript & Types
- **Interface vs. Type**: Prefer `interface` for object definitions and `type` for unions/primitives.
- **Declarations**: Define interfaces in `lib/types` for global data or alongside the logic for local/specific structures.
- **Strictness**: Avoid `any`. Use `unknown` or define proper types.
- **Exhaustiveness**: Use exhaustive checks in switch statements or conditional logic for union types.

---

## 3. Firebase & Data Handling

### Service Wrappers
- **Never** call Firestore/Auth methods directly from UI components.
- **Always** use or create service wrappers in `lib/firebase/` (e.g., `lib/firebase/auth.ts`, `lib/firebase/notebook.ts`).
- **Pattern**: `lib/firebase/` functions should handle the Firebase SDK logic and throw meaningful errors for the UI to catch.

### Error Handling
- **Catch & Re-throw**: Catch Firebase-specific errors and re-throw them with user-friendly messages.
- **Validation**: Perform validation (e.g., email format, empty fields) before initiating Firebase calls.
- **Pattern**:
  ```typescript
  try {
    // Firebase call
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const firebaseErr = err as { code: string };
      if (firebaseErr.code === 'auth/email-already-in-use') {
        throw new Error('This email is already in use.');
      }
    }
    throw new Error('An unexpected error occurred.');
  }
  ```

### State Management
- **Zustand**: Use the stores in `store/` for global state (Auth, Theme).
- **Hydration**: Use `AuthProvider.tsx` to synchronize Firebase state with the Zustand `auth-store.ts`.
- **Immutable Updates**: Always use the `set` function from Zustand to update state.

---

## 4. UI & Styling

### Component Composition
- **Shadcn UI**: Use base components in `components/ui/` whenever possible.
- **Modals**: Prefer `Dialog` from shadcn for all overlays.
- **Conditional Classes**: Use the `cn()` utility from `@/lib/utils` for merging classes.
- **Tailwind v4**: Stick to the standard Tailwind v4 patterns. Avoid inline styles unless absolutely necessary for dynamic values (e.g., rotation, position).

### Theming
- **CSS Variables**: Use the CSS variables defined in `app/globals.css` (e.g., `--primary`, `--background`).
- **Dark Mode**: Use the `dark:` variant for specific dark-mode adjustments.

### Accessibility
- **Aria Labels**: Use proper ARIA attributes for interactive elements.
- **Keyboard Navigation**: Ensure modals and buttons are keyboard-accessible (Radix primitives handled most of this).

---

## 5. Security Mandates

- **Credential Protection**: Never log, print, or commit secrets, API keys, or sensitive credentials.
- **Source Control**: Do not stage or commit changes unless specifically requested by the user.
- **Sensitive Files**: Never commit `.env.local`, `.firebase/`, or any file containing API keys or secrets.
- **Data Access**: Respect Firestore rules (`firestore.rules`). Do not attempt to bypass client-side security checks.
- **Profanity Filter**: Use `filterProfanity()` from `@/lib/utils` for user-generated content (e.g., group names, chat messages).

---

## 6. Project Specific Conventions

### Virtual Lab
- **Stoichiometric Recipes**: All reaction logic is governed by `lib/data/lab-elements.ts`. Check this file before implementing new reactions.
- **Lab Discovery**: Use the `use-lab-discoveries` hook for tracking and persisting user progress in the lab.

### Mini-Games
- **Location**: `app/(app)/games/`. Each game should have its own folder.
- **Components**: Reusable game elements (Timer, DifficultySelector) reside in `components/game/`.
- **State**: Game-specific state should be kept local or in a dedicated Zustand store if it needs to persist or sync.

### Chat & Social
- **Persistence**: Chat messages are stored in Firestore under `groups/{groupId}/messages`.
- **Real-time**: Use `onSnapshot` for real-time updates in `useChat.ts`.

---

*Note: This file is a living document. If you identify a better pattern, suggest an update.*
