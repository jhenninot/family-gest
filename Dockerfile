# ===================================================
# Étape 1 : Compilation du Frontend Vue 3 (Vite)
# ===================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copie des fichiers de dépendances du frontend
COPY package*.json ./
RUN npm ci

# Copie des sources et compilation des assets statiques
COPY . .
RUN npm run build

# ===================================================
# Étape 2 : Image d'exécution de production (Node.js)
# ===================================================
FROM node:20-alpine AS runner
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000

# Installation des dépendances de production du backend
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copie du code du serveur
COPY server/ ./

# Copie des fichiers frontend compilés depuis l'étape 1
COPY --from=builder /app/dist /app/dist

# Port par défaut exposé par le conteneur
EXPOSE 5000

# Contrôle de santé (Healthcheck)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

# Démarrage du serveur FamilyGest
CMD ["node", "index.js"]
