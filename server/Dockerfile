# Game server: leaderboard API + multiplayer (WebSocket) in one Node process.
#
# Built from the REPO ROOT (see docker-compose.yml) because multiplayer imports
# the client's own word lists, word selection, scrambler and scoring rules
# from src/ rather than duplicating them. server/Dockerfile.dockerignore keeps
# the build context to just those files.
FROM node:24-alpine

WORKDIR /app/server

# Server packages (ws, qrcode) — installed here, never committed
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY server/*.js ./
COPY server/multiplayer ./multiplayer

# Shared game data and logic, at the same relative path as in the repo
COPY src/data /app/src/data
COPY src/utils/wordFilter.js src/utils/scramble.js src/utils/scoring.js src/utils/initials.js /app/src/utils/
# src/ is ES modules (the repo root package.json says "type": "module")
RUN echo '{ "type": "module" }' > /app/package.json

# The SQLite file lives on a named volume so scores survive rebuilds
ENV DB_PATH=/data/leaderboard.db \
    PORT=3001 \
    NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
VOLUME /data

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/health || exit 1

# node:sqlite is still flagged experimental in Node 24; the warning is noise
CMD ["node", "--disable-warning=ExperimentalWarning", "index.js"]
