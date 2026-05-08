# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Add build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001

COPY package*.json ./
RUN npm install --omit=dev \
    && npm cache clean --force

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

EXPOSE 1234
ENV NODE_ENV=production
ENV PORT=1234

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
