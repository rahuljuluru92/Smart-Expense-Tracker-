# ---------- BASE ----------
FROM node:18 AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production


# ---------- BUILD ----------
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build


# ---------- RUNTIME ----------
FROM node:18 AS runtime
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3001
CMD ["node", "dist/app.js"]