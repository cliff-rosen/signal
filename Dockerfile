FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ server/
COPY mcp/ mcp/
COPY public/ public/

EXPOSE 4888

CMD ["node", "server/index.js"]
