# Déploiement production

Site : **https://fitbitair-health-dashboard.vercel.app**  
API : **https://fitbitair-health-api.onrender.com** (à créer)

## 1. Google Cloud Console

Client OAuth existant → **Authorized redirect URIs**, ajouter :

```
https://fitbitair-health-dashboard.vercel.app/api/auth/callback
```

Tu peux réutiliser le même `CLIENT_ID` / `CLIENT_SECRET` pour le login app et Health API.

## 2. Render (API)

1. [render.com](https://render.com) → **New** → **Blueprint**
2. Repo : `Fisticent/Fitbitair_health_dashboard`
3. Renseigner les secrets demandés par `render.yaml` :
   - `APP_GOOGLE_CLIENT_ID` / `APP_GOOGLE_CLIENT_SECRET` (même client OAuth)
   - `ALLOWED_EMAIL` = ton Gmail
   - `GOOGLE_HEALTH_CLIENT_ID` / `GOOGLE_HEALTH_CLIENT_SECRET` / `GOOGLE_HEALTH_REFRESH_TOKEN`
     (depuis `~/.google-health-mcp/config.json` et `tokens.json` en local)
4. Déployer → URL : `https://fitbitair-health-api.onrender.com`

`SESSION_SECRET` est généré automatiquement par Render.

## 3. Vercel (frontend)

Déjà connecté au repo — chaque push sur `main` redéploie.  
`vercel.json` proxy `/api/*` vers Render.

## 4. Vérification

```bash
curl https://fitbitair-health-dashboard.vercel.app/api/auth/me
curl https://fitbitair-health-api.onrender.com/api/health
```

Puis ouvrir le site → **Se connecter avec Google**.
