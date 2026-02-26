# Territory Native

Native React Native (Expo) app that mirrors the **Territory** web app: same design, same Supabase backend, native maps and GPS.

## Setup

- **Node:** Use Node **20.19.4 or newer** (required for Expo SDK 54). Check with `node -v`; upgrade via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org).

1. **Install dependencies**
   ```bash
   cd territory-native && npm install
   ```

2. **Environment**
   Copy `.env.example` to `.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` – your Supabase project URL (same as web app)
   - `EXPO_PUBLIC_SUPABASE_KEY` – your Supabase publishable key

3. **Assets**  
   Replace `assets/icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png` with your app icons (e.g. 1024×1024 for icon).

## Run

- **iOS:** `npx expo start --ios`
- **Android:** `npx expo start --android`
- **Expo Go:** `npx expo start` and scan the QR code

## What’s included

- **Auth** – Email/password and Google OAuth (with deep link `territory://auth/callback` if configured).
- **Map** – Native map with territory polygons, user location, START RUN / ATTACK / DEFEND.
- **Run** – Native GPS tracking, timer, distance, pace, closed-loop detection, save run and claim territory to Supabase.
- **Activity** – Feed from Supabase with realtime updates.
- **Profile** – Stats, recent runs, sign out.

Design matches the web app: dark theme, primary green `#00FF88`, Orbitron/Inter/JetBrains Mono, glass-style panels, same layout and copy.

## Code layout (TypeScript)

- **`src/types/`** – Shared types: `database` (Supabase Row/Insert), `domain` (enums, display types), `navigation` (param lists), `auth`.
- **`src/constants/`** – Activity icon/color maps, screen name constants.
- **`src/utils/`** – Formatters (`timeAgo`, `formatRunDate`).
- **`src/lib/gps.ts`** – GPS types and run/polygon helpers (no `any`).
- Screens and hooks use the above types; navigation is typed via `TabParamList` / `RootStackParamList`.
