# Fitbitair Health Dashboard (v2)

Dashboard santé **Lueur** — interface React + API FastAPI branchée sur Google Health (Fitbit / données synchronisées).

## Stack

- **Frontend** : React 19, Vite, Tailwind CSS, Recharts, Framer Motion
- **Backend** : FastAPI, scores physiologiques, agrégation Google Health API v4
- **Auth** : Google OAuth (allowlist email) + session cookie httpOnly

## Prérequis

- Node.js 20+
- Python 3.11+
- Authentification [google-health-mcp](https://github.com) configurée (`~/.google-health-mcp/tokens.json`)
- Client OAuth Google **login app** (séparé du client Health API)

## Installation

```bash
npm install
pip install -r server/requirements.txt
cp .env.example .env
```

Renseigne `.env` :

```env
APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
APP_GOOGLE_CLIENT_SECRET=xxx
ALLOWED_EMAIL=ton@gmail.com
SESSION_SECRET=une-longue-chaine-aleatoire
APP_PUBLIC_URL=http://localhost:5173
```

Dans Google Cloud Console → **Credentials** → redirect URI :

- `http://localhost:5173/api/auth/callback`
- `https://ton-app.vercel.app/api/auth/callback` (prod)

Sans `APP_GOOGLE_CLIENT_ID`, l'auth est **désactivée** (mode dev local classique).

## Lancer en local

Terminal 1 — API :

```bash
npm run api
```

Terminal 2 — interface :

```bash
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

## Déploiement (Vercel + Render)

1. **Render** : API FastAPI + variables d'env (auth + Google Health)
2. **Vercel** : frontend + `vercel.json` rewrite `/api/*` → URL Render
3. `APP_PUBLIC_URL` = URL Vercel (pour le callback OAuth)
4. `ALLOWED_EMAIL` = ton adresse Gmail

## Build production

```bash
npm run build
npm run preview
```

## Structure

```
src/          # UI React (vues Lueur)
server/       # API FastAPI (scores, parsers, client Health, auth)
```
