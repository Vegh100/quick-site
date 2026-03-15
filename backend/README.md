# Quick Site Backend (TypeScript)

Backend API TypeScript-ben Express és Prisma ORM-mel.

## Indítás

1. Telepítés:

```bash
cd backend
npm install
```

2. Környezeti változók:

```bash
cp .env.example .env
```

3. Adatbázis indítása (a repo gyökeréből):

```bash
docker compose up -d
```

4. Adatbázis séma + seed inicializálása:

```bash
npm run db:init
```

5. Prisma kliens generálása:

```bash
npm run prisma:generate
```

6. Development szerver indítása:

```bash
npm run dev
```

## Scriptek

- `npm run dev` - Development mode (hot reload)
- `npm run build` - TypeScript build production-höz
- `npm start` - Production szerver indítása
- `npm run prisma:studio` - Prisma Studio GUI
- `npm run prisma:generate` - Prisma kliens generálása
- `npm run prisma:migrate:deploy` - Minden migration futtatása (production-safe)
- `npm run prisma:seed` - Seed data betöltése (optional)
- `npm run db:init` - Migration + seed friss adatbázishoz

**Megjegyzés:** Az adatbázis séma forrása a Prisma migrationök és a [prisma/schema.prisma](prisma/schema.prisma). Ne használd a root [init.sql](../init.sql) fájlt bootstrapre.

## Endpoints

- `GET /health` - Health check
- `GET /api/test-db` - Database connection test

## Struktúra

```
backend/
├── src/
│   ├── lib/
│   │   └── prisma.ts      # Prisma client
│   ├── routes/            # API routes (TODO)
│   ├── controllers/       # Controllers (TODO)
│   ├── middleware/        # Middleware (TODO)
│   └── server.ts          # Main server
├── prisma/
│   ├── schema.prisma      # Prisma schema
│   ├── migrations/        # Adatbázis migration history
│   └── seed.ts            # Seed adatok
├── package.json
└── tsconfig.json
```
