# Fitbitair Health Dashboard (v2)

Dashboard santé **Lueur** — interface React + API FastAPI branchée sur Google Health (Fitbit / données synchronisées).

## Stack

- **Frontend** : React 19, Vite, Tailwind CSS, Recharts, Framer Motion
- **Backend** : FastAPI, scores physiologiques, agrégation Google Health API v4

## Prérequis

- Node.js 20+
- Python 3.11+
- Authentification [google-health-mcp](https://github.com) configurée (`~/.google-health-mcp/tokens.json`)

## Installation

```bash
npm install
pip install -r server/requirements.txt
```

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

## Build production

```bash
npm run build
npm run preview
```

## Structure

```
src/          # UI React (vues Lueur)
server/       # API FastAPI (scores, parsers, client Health)
```
