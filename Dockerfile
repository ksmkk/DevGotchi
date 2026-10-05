FROM node:22-alpine AS frontend-builder

WORKDIR /workspace

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci

COPY frontend ./frontend
COPY src ./src

ENV VITE_GRAPHQL_URL=/graphql
RUN npm --prefix frontend run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/db ./db
COPY backend/src ./src
COPY --from=frontend-builder /workspace/frontend/dist ./public

ENV NODE_ENV=production
EXPOSE 3000

USER node
CMD ["npm", "start"]
