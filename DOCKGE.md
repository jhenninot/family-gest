# 🐳 Guide de Déploiement Dockge & Docker pour FamilyGest

Ce guide détaille l'installation, la gestion et la mise à jour de **FamilyGest** avec **Dockge** (ou Docker Compose), en accordant une attention maximale à la **persistance et à la sécurité de vos données MongoDB**.

---

## 🛡️ Pourquoi et comment vos données sont protégées lors des mises à jour

Dans Docker, par défaut, les fichiers écrits à l'intérieur d'un conteneur disparaissent lorsqu'on met à jour ou recrée ce conteneur.

Pour éviter cela, **FamilyGest** utilise un volume persistant Docker explicite :
```yaml
volumes:
  mongo_data:
    name: familygest_mongo_data
```

### Ce qui se passe lors d'une mise à jour dans Dockge :
1. Dockge télécharge la nouvelle image ou recompile le code.
2. Le conteneur `familygest-mongo` ou `familygest-app` est arrêté puis recréé.
3. Le volume `familygest_mongo_data` n'est **JAMAIS supprimé** : il reste stocké sur le disque dur de votre machine hôte Docker.
4. Dès le redémarrage, le nouveau conteneur se reconnecte automatiquement au volume existant : **tous vos membres, tâches, dépenses, calendriers et courses sont conservés à l'identique**.

De plus, le backend Node.js intègre une sécurité anti-écrasement :
- Si la base met quelques secondes à démarrer au boot, le serveur réessaie automatiquement pendant 30 secondes au lieu de basculer vers une base temporaire.
- Le script de démarrage vérifie la présence d'utilisateurs (`seedDatabaseIfEmpty`) : s'il trouve des données dans la base, **il n'écrase absolument rien**.

---

## 🚀 Méthode 1 : Déploiement via le dossier des stacks Dockge (Recommandé)

Cette méthode permet à Dockge de compiler directement les sources à jour depuis votre dépôt Git.

### 1. Cloner le projet dans votre répertoire de stacks Dockge
Sur votre serveur (ex: dans `/opt/stacks` ou votre dossier Dockge) :
```bash
cd /opt/stacks
git clone https://github.com/votre-utilisateur/family-gest.git familygest
cd familygest
```

### 2. Configurer le fichier `.env`
Créez ou adaptez le fichier `.env` :
```bash
cp .env.example .env
nano .env
```
Renseignez votre clé JWT secrète et le port souhaité :
```env
APP_PORT=5000
JWT_SECRET=votre_cle_tres_secrete_et_aleatoire_ici
NODE_ENV=production
```

### 3. Ouvrir Dockge
- Ouvrez votre interface web **Dockge** (`http://ip-de-votre-serveur:5001`).
- La stack `familygest` apparaît automatiquement dans la liste de gauche.
- Cliquez dessus, puis cliquez sur **Deploy** (ou **Start**).
- FamilyGest est désormais accessible sur `http://ip-de-votre-serveur:5000`.

---

## 🖥️ Méthode 2 : Création d'une nouvelle stack dans l'interface web Dockge

Si vous préférez créer la stack depuis l'interface web Dockge :

1. Cliquez sur **+ Compose** en haut à gauche de Dockge.
2. Nommez la stack : `familygest`.
3. Dans l'éditeur YAML à droite, collez le contenu du fichier [`compose.yaml`](compose.yaml) :
```yaml
services:
  app:
    container_name: familygest-app
    image: ghcr.io/jhenninot/family-gest:latest
    restart: unless-stopped
    ports:
      - "${APP_PORT:-5000}:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - JWT_SECRET=${JWT_SECRET:-familygest_secret_jwt_key_2026_change_in_production}
      - MONGODB_URI=mongodb://mongo:27017/familygest
    depends_on:
      mongo:
        condition: service_healthy

  mongo:
    container_name: familygest-mongo
    image: mongo:7.0
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  mongo_data:
    name: familygest_mongo_data
```
4. Dans la section **.env** à droite dans Dockge, ajoutez :
```env
APP_PORT=5000
JWT_SECRET=votre_cle_jwt_personnelle_secrete
NODE_ENV=production
```
5. Cliquez sur **Deploy**.

---

## 🔄 Comment mettre à jour FamilyGest dans Dockge (en toute sécurité)

Pour mettre à jour FamilyGest vers une nouvelle version sans toucher à la base de données :

### Via l'interface Dockge (Mise à jour en 1 clic) :
1. Dans **Dockge**, ouvrez votre stack `familygest`.
2. Cliquez simplement sur le bouton **Update** (ou **Mettre à jour**).
3. Dockge télécharge automatiquement la nouvelle image pré-compilée depuis `ghcr.io/jhenninot/family-gest:latest` et redémarre le conteneur en quelques secondes.
4. ✅ **Vos données dans `familygest_mongo_data` sont automatiquement préservées**.

### En ligne de commande (alternative) :
```bash
cd /opt/stacks/familygest
git pull
docker compose build
docker compose up -d
```

---

## 🤖 Mise à jour 100% automatique après un `git push` sur `main`

Depuis l'ajout du service `watchtower` dans [`compose.yaml`](compose.yaml), vous n'avez **plus besoin de cliquer sur "Update"** : la chaîne complète est automatisée.

### Comment ça fonctionne
1. Vous poussez du code sur la branche `main` de votre dépôt GitHub.
2. Le workflow [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) construit l'image et la publie sur `ghcr.io/jhenninot/family-gest:latest` (déjà en place, rien à faire côté GitHub).
3. Sur votre serveur, le conteneur `familygest-watchtower` interroge le registre `ghcr.io` toutes les **5 minutes** (`WATCHTOWER_POLL_INTERVAL=300`).
4. Dès qu'une nouvelle version de l'image est détectée, Watchtower recrée **uniquement** `familygest-app` (grâce au label `com.centurylinklabs.watchtower.enable=true` posé sur ce service) et supprime l'ancienne image locale devenue inutile (`WATCHTOWER_CLEANUP=true`).
5. `familygest-mongo` n'est **jamais** touché par Watchtower : la persistance de vos données reste inchangée.

### Activer cette automatisation sur une stack déjà déployée
Si votre stack `familygest` existe déjà dans Dockge, elle ne connaît pas encore ce nouveau service tant que vous n'avez pas redéployé la définition à jour :
1. Récupérez la dernière version de `compose.yaml` (via `git pull`, ou en recollant son contenu dans l'éditeur Dockge).
2. Cliquez sur **Deploy** (ou **Update**) une dernière fois manuellement — cela démarre `familygest-watchtower` en plus de `app`/`mongo`.
3. À partir de là, tous les prochains push sur `main` se déploient tout seuls, sans plus jamais rouvrir Dockge.

### Vérifier que ça fonctionne
```bash
docker logs -f familygest-watchtower
```
Vous devez voir un message de vérification toutes les 5 minutes, puis un message de mise à jour (`Found new ... image`, `Stopping /familygest-app`, `Creating /familygest-app`) après un push sur `main` suivi du temps de build GitHub Actions (quelques minutes).

### ⚠️ À savoir avant d'activer
Watchtower a besoin d'un accès au socket Docker (`/var/run/docker.sock`) pour pouvoir recréer des conteneurs : c'est un accès équivalent à un contrôle total du démon Docker de la machine (pas seulement de la stack `familygest`). C'est un projet open source largement utilisé et maintenu (`containrrr/watchtower`), mais gardez cela en tête sur un serveur partagé avec d'autres services sensibles. Aucun port entrant n'est ouvert : Watchtower ne fait que des requêtes sortantes vers `ghcr.io`, il n'y a donc pas d'exposition supplémentaire de votre serveur sur Internet.

Si vous préférez repasser en mise à jour manuelle, supprimez simplement le service `watchtower` de `compose.yaml` et redéployez la stack.

---

## 💾 Sauvegarde & Restauration des données (Backups)

Même si le volume Docker protège vos données lors des mises à jour de routine, il est toujours recommandé d'effectuer des sauvegardes régulières.

### Sauvegarder la base de données (Backup)
Pour créer une archive compressée de toute la base MongoDB :
```bash
docker exec -i familygest-mongo mongodump --db=familygest --archive --gzip > familygest_backup_$(date +%Y%m%d).gz
```
Vous obtiendrez un fichier de sauvegarde léger et complet (ex: `familygest_backup_20260909.gz`).

### Restaurer une sauvegarde
Pour restaurer vos données à partir d'un fichier de sauvegarde :
```bash
docker exec -i familygest-mongo mongorestore --nsInclude="familygest.*" --drop --archive --gzip < familygest_backup_20260909.gz
```

---

## 💡 Astuces & Dépannage

### 1. Processeur ancien / NAS sans instructions AVX
MongoDB 5.0+ requiert les instructions processeur AVX. Si vous installez FamilyGest sur un ancien NAS ou processeur (ex: Intel Celeron anciens), le conteneur MongoDB 7.0 peut planter au démarrage.
👉 Dans ce cas, remplacez simplement dans votre `compose.yaml` :
```yaml
image: mongo:4.4
```
ou
```yaml
image: mongo:6.0
```

### 2. Changer le port d'accès
Si le port `5000` est déjà utilisé sur votre machine hôte (par exemple par un NAS Synology ou un autre service), modifiez simplement `APP_PORT` dans votre `.env` ou dans Dockge :
```env
APP_PORT=8085
```
Puis cliquez sur **Deploy**. L'application sera accessible sur `http://ip-de-votre-serveur:8085`.

### 3. Connexion initiale
Lors du tout premier démarrage sur une base vierge, le compte **Super Administrateur** ainsi qu'une famille par défaut (« Famille Principale ») sont automatiquement créés :
- **Email** : `admin@family-gest.org`
- **Mot de passe** : `Admin1234!`

D'autres familles peuvent ensuite être créées depuis la console Super Administrateur (`/super-admin`), et des membres ajoutés par invitation depuis les réglages de chaque famille.

### 4. Exposer FamilyGest publiquement pour le connecteur MCP (Claude)
Chaque famille peut générer, depuis ses réglages, une URL de connecteur [MCP](https://modelcontextprotocol.io) permettant de piloter FamilyGest depuis Claude. Les serveurs de Claude étant sur Internet, cette URL doit être joignable en **HTTPS** depuis l'extérieur (une adresse LAN ou `http://` ne fonctionnera pas) : il faut donc un reverse proxy (NGINX Proxy Manager, Traefik, Caddy...) devant le conteneur `familygest-app`, avec un certificat TLS valide (Let's Encrypt).

Le endpoint du connecteur (`/api/mcp/...`) passe par le même hôte que le reste de l'application — aucune règle de routage supplémentaire n'est nécessaire si FamilyGest est déjà exposé publiquement pour l'accès normal des membres. Pensez toutefois à autoriser les réponses en streaming (SSE) sur ce chemin en désactivant la mise en tampon du proxy, par exemple avec NGINX :
```nginx
proxy_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

Si FamilyGest n'est aujourd'hui accessible qu'en local, il faudra créer un nouvel hôte/sous-domaine dédié dans votre reverse proxy avant de pouvoir utiliser le connecteur MCP.

⚠️ **Dès qu'un reverse proxy est placé devant `familygest-app`**, ajoutez la variable d'environnement `TRUST_PROXY=1` au service `app` (voir `compose.yaml`). Sans elle, l'application voit l'IP du reverse proxy plutôt que celle de chaque visiteur, ce qui fait que la limitation de débit anti brute-force (page de connexion, invitations...) s'applique globalement à tous les visiteurs au lieu de chacun individuellement. Ne définissez cette variable **que** si un reverse proxy est effectivement en place : sinon, un client pourrait falsifier son IP via l'en-tête `X-Forwarded-For` et contourner cette même protection.
