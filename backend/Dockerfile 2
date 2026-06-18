FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ---- Production ----
FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

RUN mkdir -p uploads/avatars uploads/documents uploads/logos uploads/portfolio uploads/services \
    && chown -R appuser:appgroup uploads

USER appuser

EXPOSE 3000
CMD ["node", "dist/server.js"]
