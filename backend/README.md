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

3. Prisma kliens generálása:

```bash
npm run prisma:generate
```

4. Development szerver indítása:

```bash
npm run dev
```

## Scriptek

- `npm run dev` - Development mode (hot reload)
- `npm run build` - TypeScript build production-höz
- `npm start` - Production szerver indítása
- `npm run prisma:studio` - Prisma Studio GUI
- `npm run prisma:generate` - Prisma kliens generálása
- `npm run prisma:seed` - Seed data betöltése (optional)

**Megjegyzés:** Az adatbázis séma az [init.sql](../init.sql)-ben van definiálva. A Prisma schema ([prisma/schema.prisma](prisma/schema.prisma)) csak a TypeScript típusokat generálja.

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
│   └── schema.prisma      # Database schema
├── package.json
└── tsconfig.json
```
