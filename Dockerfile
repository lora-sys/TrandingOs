FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* tsconfig.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json

RUN npm install --ignore-scripts

COPY apps ./apps
COPY packages ./packages
RUN npm run build

ENV NODE_ENV=production
ENV TRADING_PI_API_PORT=8787
EXPOSE 8787

CMD ["npm", "run", "start"]
