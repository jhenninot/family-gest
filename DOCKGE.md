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
Lors du tout premier démarrage sur une base vierge, le compte administrateur est automatiquement créé :
- **Email** : `admin@family-gest.org`
- **Mot de passe** : `Admin1234!`
