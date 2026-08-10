FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY tsconfig.base.json .prettierrc.json ./
COPY LICENSE ./LICENSE
COPY scripts/build.mjs ./scripts/build.mjs
COPY apps ./apps
COPY packages ./packages
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production BEACON_HOST=0.0.0.0 BEACON_PORT=3100 BEACON_DATA_PATH=/data/beacon-index.sqlite
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /app/apps/web/out ./apps/web/out
COPY --from=build --chown=node:node /app/LICENSE ./apps/web/out/LICENSE
COPY --from=build --chown=node:node /app/packages/server/dist ./packages/server/dist
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
RUN mkdir -p /data && chown node:node /data
LABEL org.opencontainers.image.source="https://github.com/Grey-Harbor/beacon" \
  org.opencontainers.image.description="Redirect infrastructure management for Drift and Compactor"
VOLUME ["/data"]
EXPOSE 3100
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/server/dist/index.js"]
