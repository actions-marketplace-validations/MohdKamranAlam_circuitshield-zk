FROM node:20-bookworm-slim

WORKDIR /opt/circuitshield

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json action.yml ./
COPY src ./src
COPY web ./web
COPY docs ./docs
COPY README.md ./

RUN npm run build && npm run web:build

ENV NODE_ENV=production
ENTRYPOINT ["node", "/opt/circuitshield/dist/cli.js"]
