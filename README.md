# Quick Site

Webalkalmazás PostgreSQL adatbázissal, TypeScript backend-del.

## Struktúra

```
quick-site/
├── backend/           # TypeScript backend (Express + Prisma)
├── frontend/          # Frontend (TODO)
├── docker-compose.yml # PostgreSQL database
└── init.sql           # Legacy SQL (nem hasznalt bootstrap)
```

## Előfeltételek

- Node.js 18+
- Docker
- Docker Compose

## Gyors Indítás

### 1. Adatbázis indítása

```bash
docker compose up -d
```

Ez csak a PostgreSQL konténert indítja el.

### 2. Backend indítása

```bash
cd backend
npm install
cp .env.example .env
npm run db:init
npm run prisma:generate
npm run dev
```

**Megjegyzés:** Az adatbázis sémát a Prisma migrationök kezelik a [backend/prisma/migrations](backend/prisma/migrations) mappában.

Backend elérhető: `http://localhost:3000`

## Hasznos Parancsok

### Adatbázis

- Indítás: `docker compose up -d`
- Leállítás: `docker compose down`
- Törlés (adatokkal): `docker compose down -v`

### Backend

Lásd: [backend/README.md](backend/README.md)

## Adatbázis kapcsolat

- **Host:** localhost
- **Port:** 5432
- **Database:** quickdb
- **User:** quickuser
- **Password:** quickpass
