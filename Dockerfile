# Multi-stage Docker build for Google Cloud Run (Front Desk AI)
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/utils/sizeChartParser.js ./src/utils/sizeChartParser.js

EXPOSE 8080
CMD ["npm", "start"]
