# 🏡 FamilyGest - Application de Gestion Familiale Multi-Familles (Vue 3 + Node.js / Express + MongoDB)

**FamilyGest** est une application web monopage (SPA) moderne, esthétique et sécurisée conçue pour l'organisation et la gestion quotidienne d'un ou plusieurs foyers. Une seule instance de l'application peut héberger **plusieurs familles indépendantes** (multi-tenant) : chacune dispose de sa propre URL, de ses propres membres, tâches, calendrier, courses, présences et repas, totalement cloisonnés des autres familles.

---

## 🏘️ Architecture Multi-Familles

- **Super Administrateur** *(un seul pour toute la plateforme)* : crée les familles, définit leur quota de membres, gère la configuration email globale (SMTP) et dispose d'une vue transversale sur toutes les familles depuis la console `/super-admin`.
- **Administrateur de famille** : gère les membres (invitations, rôles), les catégories de courses, les raccourcis et le connecteur MCP **de sa famille**. Un même utilisateur peut être simple membre dans une famille et administrateur dans une autre.
- **Membre de famille** : utilise au quotidien les tâches, le calendrier, les présences/absences, les repas, les courses et les raccourcis de la ou des familles auxquelles il appartient.
- **Multi-appartenance** : un compte utilisateur est unique et global (un seul email/mot de passe) ; il peut rejoindre plusieurs familles, avec un sélecteur de famille si l'utilisateur en a plus d'une.
- Chaque famille est identifiée par une URL dédiée : `https://votre-domaine/<slug-famille>/...` (ex: `/famille-dupont/tasks`).

---

## ✨ Fonctionnalités Principales

1. 🔐 **Authentification Sécurisée & Invitations**
   - Compte utilisateur unique (email + mot de passe haché **Bcrypt**), valable sur toutes les familles rejointes.
   - Protection de l'API par **Tokens JWT** (renouvelés automatiquement à chaque requête).
   - Ajout de membres par **invitation par email**, avec configuration du rôle familial et du statut administrateur.

2. 📊 **Tableau de Bord Réactif**
   - Métriques en temps réel (progression des tâches, événements à venir, liste de courses) propres à la famille active.
   - Classement des points gagnés par membre.

3. ✅ **Tâches & Corvées**
   - Attribution des tâches par membre avec priorités, catégories et système de points de récompense.
   - Filtres interactifs (Statut & Membre).

4. 📅 **Calendrier Familial**
   - Planning chronologique des rendez-vous et activités, avec événements récurrents.
   - Export vers Google Agenda / fichier `.ics` pour les calendriers personnels.

5. 🙋 **Présences, Absences & Invités aux repas**
   - Déclaration de présence/absence par créneau (midi/soir/nuit), y compris sur une plage de dates (absences longues).
   - Ajout d'invités extérieurs à un repas donné.

6. 🍲 **Repas de la semaine**
   - Planification des plats par jour et par créneau, avec ajout automatique des ingrédients à la liste de courses.

7. 🛒 **Liste de courses**
   - Catégories personnalisables par famille, gestion des priorités (Urgent 🔥) et cochage dynamique.

8. 🌐 **Raccourcis Web & Applications**
   - Liens directs vers vos services et applications (Home Assistant, Plex, Pronote, Nextcloud...), gérés par l'administrateur de famille.

9. 🔔 **Notifications Push & Email**
   - Alertes Web Push et email (configuration SMTP globale gérée par le Super Administrateur) pour les tâches, événements, présences, invités et repas.

10. 🤖 **Connecteur MCP (pilotage depuis Claude)**
    - Chaque famille peut générer sa propre URL de connecteur ([MCP](https://modelcontextprotocol.io)) depuis ses réglages, pour piloter FamilyGest en langage naturel depuis Claude : créer un événement, déclarer une présence/absence, ajouter un invité à un repas, un article de courses, une tâche, un repas, ou interroger l'agenda/les présences.
    - Génération, statut et révocation gérés par un administrateur de famille (carte « Connecteur MCP » dans les réglages).

---

## 🛠️ Stack Technique

- **Frontend** : Vue 3 (Composition API `<script setup>`), Vite, Vue Router, Pinia, `@lucide/vue`, Vanilla CSS avec Thème Sombre/Clair & Glassmorphism.
- **Backend** : Node.js, Express.js, Mongoose, Bcryptjs, Jsonwebtoken, MongoDB (avec MongoMemoryServer embarqué ou instance locale/Atlas).

---

## 🚀 Installation & Démarrage

### 1. Cloner le projet
```bash
git clone https://github.com/votre-utilisateur/family-gest.git
cd family-gest
```

### 2. Démarrage en développement (Commande unique)
À la racine du projet :
```bash
# Installation des dépendances (racine et serveur)
npm install
npm --prefix server install

# Lancement simultané du Backend et du Frontend
npm run dev
```
> Le serveur API s'exécute sur `http://localhost:5000` et l'application Frontend sur `http://localhost:5173`.

> 💡 *Note : Vous pouvez également lancer chaque partie séparément si souhaité via `npm run dev:server` ou `npm run dev:client`.*

---

## 🐳 Déploiement Docker & Dockge

FamilyGest est entièrement conteneurisé avec persistance sécurisée des données MongoDB :
- Fichier Compose prêt pour **Dockge** : [`compose.yaml`](compose.yaml)
- Guide complet d'installation et de mise à jour sécurisée : [`DOCKGE.md`](DOCKGE.md)

### Démarrage rapide avec Docker Compose
```bash
# 1. Cloner le projet
git clone https://github.com/votre-utilisateur/family-gest.git
cd family-gest

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Lancer la stack (Frontend + Backend + MongoDB avec volume persistant)
docker compose up -d --build
```
L'application est disponible sur `http://localhost:5000`.

> 🛡️ **Garantie de persistance** : Le volume Docker nommé `familygest_mongo_data` préserve toutes vos données même en cas de mise à jour (`Update`), recréation ou suppression des conteneurs.

---

## 🔑 Identifiants de Connexion par Défaut

Au tout premier démarrage sur une base de données vide, un unique compte **Super Administrateur** est créé automatiquement, ainsi qu'une famille par défaut (« Famille Principale ») dont il est administrateur :

| Rôle | Adresse Email | Mot de Passe |
|---|---|---|
| **Super Administrateur** | `admin@family-gest.org` | `Admin1234!` |

> ⚠️ Changez ce mot de passe dès la première connexion. Les autres membres sont ensuite ajoutés par invitation depuis les réglages de la famille. Pour créer des familles supplémentaires ou gérer la plateforme, utilisez la console Super Administrateur (`/super-admin`).

