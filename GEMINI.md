# GEMINI.md

## Project Overview
**CheMuLab-VX** is a modern, interactive chemistry educational application built with Next.js 16 (App Router). It provides a virtual laboratory environment where users can discover elements, perform experiments by combining them according to stoichiometric recipes, and track their progress through a gamified discovery system.

### Main Features
- **Virtual Lab:** A reaction chamber for combining elements to create compounds (e.g., H₂ + O -> H₂O).
- **Periodic Table Explorer:** Detailed information about chemical elements.
- **Social System:** Friend requests, group management, and real-time chat.
- **Discovery Tracking:** Persistent tracking of discovered elements and compounds.
- **Mini-Games:** Chemistry-themed games like Balloon Race and Chemical Formula Race.
- **AI Assistant:** "Popoy," an AI-powered chatbot for chemistry-related queries.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Lucide React (icons)
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **State Management:** Zustand
- **UI Components:** Shadcn UI (Radix UI primitives)
- **AI:** Google Generative AI (Gemini)
- **Utilities:** `clsx`, `tailwind-merge` (for class merging), `react-easy-crop` (image cropping).

## Directory Structure
- `app/(app)`: Main application routes (lab, elements, progress, profile, friends, games).
- `app/(auth)`: Authentication routes (sign-in, registration).
- `components/`:
    - `auth/`: Auth provider and protected layout wrappers.
    - `chatbot/`: Popoy chatbot UI components and logic.
    - `game/`: Reusable game components, logic, and multiplayer overlays.
    - `layout/`: App shell, sidebar, and theme management.
    - `ui/`: Base UI components (shadcn/ui), mostly kebab-case.
- `lib/`:
    - `firebase/`: Firebase initialization and service wrappers (auth, firestore, groups, notebook).
    - `data/`: Static data (elements, reactions, tutorials, game-specific data).
    - `hooks/`: Custom React hooks for business logic (discovery, progress, sound, bookmarks).
    - `utils/`: Common utilities (class merging, image cropping, profanity filter).
- `store/`: Zustand stores for global state (auth, theme).

## Core Logic & Conventions

### Coding Patterns
- **Stoichiometric Recipes:** Located in `lib/data/lab-elements.ts`. The lab uses these to validate element combinations.
- **Auth Flow:** Managed by `components/auth/AuthProvider.tsx`, which synchronizes Firebase Auth state with the Zustand `auth-store.ts` and Firestore user profiles.
- **Service-First Architecture:** UI components should never call Firebase SDKs directly. Always use wrappers in `lib/firebase/`.
- **Zustand Stores:** Use the `useAuthStore` and `useThemeStore` for global application state.

### Design Standards
- **Theming:** Supports light/dark modes via `ThemeProvider` and CSS variables in `app/globals.css`.
- **Responsive Design:** Mobile-first approach using Tailwind's responsive prefixes.
- **Consistency:** Follow PascalCase for component filenames and kebab-case for utility/hook/UI filenames.

## Building and Running

### Prerequisites
- Node.js (v20+ recommended)
- Firebase Project

### Commands
- `npm install`: Install project dependencies.
- `npm run dev`: Start the local development server.
- `npm run build`: Build the application for production.
- `npm start`: Start the production server.
- `npm run lint`: Run ESLint checks.

### Environment Variables
Create a `.env.local` file with the following:
```bash
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server Side
OPENROUTER_API_KEY=
IMAGE_PROXY_ALLOWED_HOSTS=images.unsplash.com,lh3.googleusercontent.com
```

## Development Guidelines
- **Type Safety:** Always define interfaces for new data structures in `lib/types` or alongside the logic. Avoid `any`.
- **Components:** Use shadcn/ui components from `components/ui` whenever possible.
- **Firebase:** Use the service wrappers in `lib/firebase` rather than direct Firestore calls in components.
- **Styling:** Follow Tailwind CSS v4 patterns; avoid inline styles. Use the `cn()` utility for merging classes.
- **Error Handling:** Catch Firebase errors and re-throw with user-friendly messages.
