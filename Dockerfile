FROM node:22-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/tmp/build.db
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma migrate deploy && npm run build

FROM node:22-alpine AS production-dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /app/data /app/uploads \
    && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && exec npm run start"]
