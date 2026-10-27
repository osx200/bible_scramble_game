# Leaderboard API. No npm install step — the server uses only Node built-ins.
FROM node:24-alpine

WORKDIR /app
COPY index.js blocklist.js package.json ./

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
