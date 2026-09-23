# ===================================================
# Étape 1 : Compilation du Frontend Vue 3 (Vite)
# ===================================================
FROM node:20-alpine AS builder
WORKDIR /app

# SHA court du commit buildé (passé par la CI), embarqué dans le bundle pour affichage
# dans l'app (menu avatar) — 'dev' par défaut hors CI (build local, docker build sans arg).
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA

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

# Logique métier partagée avec le frontend (présence habituelle : parité semaine A/B, grilles).
# Le serveur l'importe via '../shared/presence.js' depuis /app/server.
# ATTENTION : shared/package.json ({ "type": "module" }) est indispensable ici. Cette image n'a
# pas de /app/package.json ; sans lui, Node remonterait sans trouver de manifeste et traiterait
# /app/shared/*.js en CommonJS -> "SyntaxError: Unexpected token 'export'". Le bug ne se voit
# qu'en production, le dev étant couvert par le package.json de la racine du dépôt.
COPY shared/ /app/shared/

# Copie des fichiers frontend compilés depuis l'étape 1
COPY --from=builder /app/dist /app/dist

# Exécution en utilisateur non-root (image node:*-alpine fournit déjà l'utilisateur "node") :
# réduit l'impact d'une éventuelle exécution de code arbitraire dans le processus Node.
RUN chown -R node:node /app
USER node

# Port par défaut exposé par le conteneur
EXPOSE 5000

# Contrôle de santé (Healthcheck)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

# Démarrage du serveur FamilyGest
CMD ["node", "index.js"]
