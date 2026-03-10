# CheMuLab VX

CheMuLab is a Next.js chemistry learning app with a lab-combination workflow, discovery tracking, Firebase-backed auth, profile management, social features, and lightweight game modules.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Firebase Auth + Firestore
- Zustand for client state

## Product Areas

- `app/(auth)`: sign-in, registration, password reset
- `app/(app)/lab`: single reaction chamber — drag elements (with quantities) to discover compounds
- `app/(app)/elements`: periodic table explorer
- `app/(app)/progress`: discovery progress and milestones
- `app/(app)/profile`: profile editing, avatar crop, progress summary
- `app/(app)/friends`: friend requests and chat
- `app/(app)/games`: chemistry mini-games
- `components/chatbot`: Popoy assistant UI
- `app/api/chat`: server-side proxy for the assistant model
- `app/api/image-proxy`: restricted image proxy used by avatar cropping

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with the Firebase and chat provider keys used by the app.

Required client env vars:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Required server env vars:

```bash
OPENROUTER_API_KEY=
IMAGE_PROXY_ALLOWED_HOSTS=images.unsplash.com,lh3.googleusercontent.com
```

3. Start the dev server:

```bash
npm run dev
```

## Architecture Notes

- Auth state is hydrated in [`components/auth/AuthProvider.tsx`](./components/auth/AuthProvider.tsx) into Zustand.
- Discovery persistence lives in [`lib/firebase/discoveries.ts`](./lib/firebase/discoveries.ts).
- Shared progress state is exposed through [`lib/hooks/use-user-progress.ts`](./lib/hooks/use-user-progress.ts).
- Lab discovery loading and import/export behavior is exposed through [`lib/hooks/use-lab-discoveries.ts`](./lib/hooks/use-lab-discoveries.ts).
- Lab combination logic uses stoichiometric recipes in [`lib/data/lab-elements.ts`](./lib/data/lab-elements.ts). Each recipe maps element symbol counts (e.g. `{ H: 2, O: 1 }`) to a product compound.
- Firestore rules are defined in [`firestore.rules`](./firestore.rules).

## Validation

- Full repo lint currently reports some pre-existing issues in unrelated game and auth files.
- The refactored files in the shared progress/discovery path and the two API routes lint clean.
