# Cron job para evitar que la app se duerma en Render free tier

## Estado actual: GitHub Actions

El repo tiene un workflow (`.github/workflows/keep-alive.yml`) que pinguea la app cada 14 minutos. Funciona **gratis si el fork es público**. Si es privado, las Actions minutes cuestan (2000/mes gratis en cuentas nuevas).

### Configurar el URL

Por default pinguea `https://app-antojos-mobile.onrender.com`. Para cambiarlo:

1. En el fork → Settings → Secrets and variables → Actions
2. **Variables** → New repository variable:
   - **Name:** `APP_URL`
   - **Value:** tu URL de Render (ej: `https://app-antojos-mobile-staging.onrender.com`)

## Alternativas externas (no dependen de GitHub)

| Servicio | Free tier | Setup |
|---|---|---|
| **cron-job.org** | Ilimitado, 1-min interval | https://cron-job.org → crear cuenta → new cron job → URL cada 14 min |
| **UptimeRobot** | 50 monitors, **5-min interval** (no suficiente para free tier de Render) | https://uptimerobot.com |
| **BetterStack** (Better Uptime) | 10 monitors, 1-min interval | https://betterstack.com |
| **EasyCron** | 1 cron job gratis, configurable | https://www.easycron.com |

### Mi recomendación

- **Si el fork es público** → GitHub Actions (ya está, gratis)
- **Si el fork es privado O querés independencia** → **cron-job.org** (gratis, 1-min interval, simple)

### Setup rápido de cron-job.org

1. https://cron-job.org → Sign up
2. **Cronjobs** → **New Cronjob**
3. **Title:** `Antojos keep-alive`
4. **URL:** `https://app-antojos-mobile.onrender.com`
5. **Execution:** Every 14 minutes
6. **Save**

El servicio hace GET a tu URL cada 14 min → Render nunca duerme.