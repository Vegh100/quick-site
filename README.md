# Quick Site

Webalkalmazás PostgreSQL adatbázissal, TypeScript backend-del.

## Struktúra

```
quick-site/
├── backend/           # TypeScript backend (Express + Prisma)
├── frontend/          # Frontend (TODO)
├── docker-compose.yml # PostgreSQL database
└── init.sql          # Database initialization (auto-run on first start)
```

## Előfeltételek

- Node.js 18+
- Docker
- Docker Compose

## Gyors Indítás

### 1. Adatbázis indítása

```bash
docker-compose up -d
```

Ez automatikusan létrehozza az összes táblát az `init.sql` alapján.

### 2. Backend indítása

```bash
cd backend
npm installgenerate
npm run dev
```

**Megjegyzés:** A Prisma schema ([backend/prisma/schema.prisma](backend/prisma/schema.prisma)) szinkronban van az [init.sql](init.sql)-lel. Ha új táblát adsz hozzá, frissítsd mindkettőt! run prisma:seed
npm run dev

```

Backend elérhető: `http://localhost:3000`

## Hasznos Parancsok

### Adatbázis

- Indítás: `docker-compose up -d`
- Leállítás: `docker-compose down`
- Törlés (adatokkal): `docker-compose down -v`

### Backend

Lásd: [backend/README.md](backend/README.md)

## Adatbázis kapcsolat

- **Host:** localhost
- **Port:** 5432
- \*\*Databas# Quick Site

WebUser:\*\* quickuser

- **Password:** quickpass
```
