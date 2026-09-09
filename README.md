# 🏡 FamilyGest - Application de Gestion Familiale (Vue 3 + Node.js / Express + MongoDB)

**FamilyGest** est une application web monopage (SPA) moderne, esthétique et sécurisée conçue pour l'organisation et la gestion quotidienne d'un foyer.

---

## ✨ Fonctionnalités Principales

1. 🔐 **Authentification Sécurisée & Contrôle Administrateur**
   - Connexion par **Email** (login) et **Mot de passe haché (Bcrypt)**.
   - Protection de l'API par **Tokens JWT**.
   - **Restriction des droits** : Seul l'utilisateur avec le rôle **Administrateur** a les privilèges pour créer ou supprimer des utilisateurs.
   - **Compte Admin par défaut** :
     - **Email** : `admin@family-gest.org`
     - **Mot de passe** : `Admin123!`

2. 📊 **Tableau de Bord Réactif**
   - Métriques en temps réel (progression des tâches, dépenses du mois, événements à venir, articles à acheter).
   - Classement des points gagnés par membre.

3. ✅ **Tâches & Corvées**
   - Attribution des tâches par membre avec priorités, catégories et système de points de récompense.
   - Filtres interactifs (Statut & Membre).

4. 📅 **Calendrier Familial**
   - Planning chronologique des rendez-vous et activités.
   - Grille calendrier mensuelle réactive.

5. 💳 **Budget & Dépenses Partagées**
   - Suivi des paiements avancés par chaque membre.
   - Calcul automatique de la répartition par payeur et catégorie.

6. 🛒 **Liste de Courses & Garde-Manger**
   - Ajout rapide avec gestion des priorités (Urgent 🔥) et cochage dynamique.

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

### 2. Démarrer le serveur API Backend (Express + MongoDB)
```bash
cd server
npm install
node index.js
```
> Le serveur API s'exécute sur `http://localhost:5000` et pré-remplit la base MongoDB automatiquement.

### 3. Démarrer le serveur Frontend (Vue 3 + Vite)
Dans une seconde fenêtre de terminal à la racine du projet :
```bash
npm install
npm run dev
```
> L'application s'exécute sur `http://localhost:5173`.

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

| Rôle | Adresse Email | Mot de Passe | Privilèges |
|---|---|---|---|
| **Administrateur** | `admin@family-gest.org` | `Admin123!` | Gestion complète + Ajout/Suppression de membres |
| **Maman** | `sophie@family-gest.org` | `Family123!` | Accès membres & tâches |
| **Fils** | `lucas@family-gest.org` | `Family123!` | Accès membres & tâches |
| **Fille** | `emma@family-gest.org` | `Family123!` | Accès membres & tâches |

