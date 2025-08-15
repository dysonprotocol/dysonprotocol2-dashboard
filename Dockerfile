# Multi-stage Dockerfile for Vue.js dashboard
# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Install socat for port forwarding
RUN apk add --no-cache socat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 5173

# Create a startup script that sets up port forwarding and starts the dev server
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '# Start port forwarding from localhost:1317 to host.docker.internal:1317 in background' >> /app/start.sh && \
    echo 'socat TCP-LISTEN:1317,fork,reuseaddr TCP:host.docker.internal:1317 &' >> /app/start.sh && \
    echo '# Start the dev server' >> /app/start.sh && \
    echo 'npm run dev' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start with our custom script
CMD ["/app/start.sh"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL deps (dev + prod) for build tooling like vite
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose production port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
