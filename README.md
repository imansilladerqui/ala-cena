# Ala-cena

App familiar de menú diario basada en la alacena.

## Estructura

```
ala-cena/
├── backend/   → API Express + PostgreSQL (despliegue en Railway)
└── mobile/    → App Expo (App Store / Google Play via EAS)
```

## Backend

```bash
cd backend
pnpm install
cp .env.example .env   # rellena las keys — NUNCA commitear .env
pnpm dev
```

Swagger (solo local): http://localhost:3000/api-docs

## Mobile

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

En dispositivo físico usa la IP de tu máquina: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000`

## Seguridad

- **Nunca** commitear `.env`, `google-vision-key.json` ni archivos `*-credentials.json`
- Usa solo `*.env.example` como plantilla (sin valores reales)
- Ejecuta el escaneo local: `bash scripts/check-secrets.sh`

## CI (GitHub Actions)

| Workflow | Qué hace |
|----------|----------|
| `backend-ci.yml` | `pnpm build` + audit de dependencias |
| `mobile-ci.yml` | `tsc --noEmit` + audit de dependencias |
| `security.yml` | Escaneo de secretos + dependency review en PRs |

Los pipelines se activan solo cuando cambian archivos del proyecto correspondiente.

## Despliegue

### Backend (Railway)

Railpack necesita un `package.json` en el directorio de build. Si el servicio apunta al repo raíz, el build falla (solo ve `scripts/`, `.gitignore`, `README.md`).

En **Service → Settings**:

| Campo | Valor |
|-------|-------|
| **Root Directory** | `backend` |
| **Config file path** | `/backend/railway.toml` (si Railway no detecta el config solo) |

Build/start ya están en `backend/railway.toml` (`pnpm build` → `node dist/index.js`). Healthcheck: `/health`.

### Mobile

- EAS Build desde `mobile/` → App Store / Google Play
