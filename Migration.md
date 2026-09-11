# 📋 PLAN DIRECTEUR : ÉVOLUTION MULTI-FAMILLES (FamilyGest)

Ce document formalise les spécifications fonctionnelles et techniques pour la transformation de FamilyGest en application multi-familles (multi-tenant avec multi-appartenance).

---

## 1. Rôles et Niveaux de Droits

| Niveau | Rôle | Périmètre | Responsabilités clés |
| :--- | :--- | :--- | :--- |
| **Global** | **Super Administrateur**<br>*(1 seul pour toute l'application)* | Toute la plateforme | • Configuration globale (serveur, URL racine, SMTP plateforme).<br>• Création des familles et gestion de leurs quotas (nb max de membres).<br>• Attribution du premier administrateur familial.<br>• Vue transversale de toutes les familles et de tous les utilisateurs inscrits. |
| **Famille** | **Administrateur Familial** | Une famille donnée | • Gestion des paramètres de la famille.<br>• Configuration du compte expéditeur (SMTP familial).<br>• Gestion des catégories de courses personnalisées.<br>• Invitation et gestion des membres de sa famille (attribution des rôles, promotion admin). |
| **Famille** | **Utilisateur Familial** | Une famille donnée | • Consultation et gestion au quotidien des tâches, calendrier, courses, présences et raccourcis de sa famille. |

> **Multi-appartenance** : Un utilisateur peut appartenir à plusieurs familles. Il peut par exemple être simple utilisateur dans la Famille A et administrateur dans la Famille B.

---

## 2. Découpage des Informations Utilisateur & Données

### A. Profil Utilisateur (Niveau Application / Global)
Ce profil est unique par personne physique :
* **Login / Email** (identifiant unique de connexion)
* **Mot de passe** (chiffré via bcrypt)
* **Nom** & **Prénom**
* **Avatar** (emoji ou photo)
* **Couleur de profil**
* **Statut Super Administrateur** (`isSuperAdmin: true/false`)
* **Date de dernière connexion**

### B. Profil de Membre Familial (`FamilyMember` - Niveau Famille)
Chaque rattachement d'un utilisateur à une famille dispose de ses propres données contextuelles :
* **Rôle familial** (ex: *Papa, Maman, Enfant, Ado, Grand-parent, Colocataire...*)
* **Statut Administrateur Familial** (définit s'il peut administrer cette famille)
* **Présence habituelle à la maison** (*Présent / Absent*)
* **Préférences de notifications Web (Push)** propres à cette famille
* **Préférences d'alertes Email** propres à cette famille
* **Score de points / Récompenses** (les points de tâches sont comptabilisés par famille)

### C. Données Métier cloisonnées par Famille
Chaque famille dispose de son étanchéité complète pour :
* **Tâches** (avec assignation aux membres de cette famille)
* **Événements** du calendrier familial
* **Liste de courses** & Catégories d'articles
* **Présences & Absences** (et invités repas)
* **Raccourcis**

---

## 3. Informations d'une Famille

* **Nom de la famille** (ex: *Famille Dupont*)
* **Identifiant URL (Slug unique)** :
  * Uniquement en minuscules, chiffres et tirets (ex: `famille-dupont`).
  * Vérification d'unicité en direct à la saisie.
  * Liste noire des mots réservés (`login`, `api`, `admin`, `superadmin`, `invitation`, `set-password`).
* **Quota maximal de membres** (géré par le Super Administrateur).
* **Paramètres SMTP Familial** (optionnels, configurés par l'admin familial).
* **Catégories de courses personnalisées**.
* **Date de création & Date d'expiration/statut actif**.

---

## 4. Architecture Email & Double Niveau SMTP

Pour garantir que les emails partent **toujours**, même avant qu'une famille n'ait configuré son SMTP :

1. **SMTP Global (Plateforme) - Géré par le Super Administrateur** :
   * Utilisé pour les invitations initiales lors de la création d'une famille.
   * Utilisé pour la réinitialisation de mot de passe (oubli de mot de passe global).
   * Sert de relais de secours si une famille n'a pas encore configuré son propre SMTP.
2. **SMTP Familial - Géré par l'Administrateur Familial** :
   * Permet à la famille d'utiliser son propre compte expéditeur (ex: `famille.dupont@gmail.com`).
   * Utilisé pour les notifications internes : rappels d'événements, tâches quotidiennes, alertes courses, invitations de nouveaux membres dans cette famille.

---

## 5. Workflow de Création & d'Invitation

### A. Création d'une famille par le Super-Administrateur
1. Saisie du **Nom de la famille** et de son **Identifiant (Slug)** :
   * Le formulaire interroge l'API pour valider en temps réel la disponibilité du slug.
2. Définition du **Quota max de membres** (ex: 5, 10...).
3. Saisie de l'**Email du premier administrateur familial** :
   * **Cas 1 : L'email existe déjà** :
     * Une pop-up affiche : *« Un compte au nom de [Prénom Nom] existe déjà avec cet email. Confirmez-vous son affectation en tant qu'administrateur de cette nouvelle famille ? »*.
     * Après confirmation, un email part (via SMTP Global) avec un lien lui proposant de rejoindre la famille. Il n'aura qu'à configurer ses préférences familiales (rôle, présence).
   * **Cas 2 : L'email est nouveau** :
     * Un email part (via SMTP Global) avec un lien d'invitation unique (`/:familySlug/invitation?token=...`).
     * L'utilisateur arrive sur l'écran d'embarquement : il saisit son mot de passe, son prénom, son nom, son avatar/couleur, ainsi que son rôle familial (la case *Administrateur* est cochée et verrouillée).

### B. Ajout d'un membre par un Administrateur Familial
1. L'administrateur familial vérifie que le quota de la famille n'est pas atteint.
2. Il saisit l'adresse email de la personne à inviter.
3. **Contrôle en base** :
   * **Si l'utilisateur existe déjà** :
     * Une pop-up confirme : *« L'utilisateur [Prénom Nom] possède déjà un compte FamilyGest. Voulez-vous lui envoyer une invitation pour rejoindre votre famille ? »*.
     * L'administrateur choisit le rôle familial et coche ou non la case *Administrateur familial*.
     * L'invitation est envoyée. À l'acceptation, l'utilisateur n'a pas à recréer son compte : il choisit simplement sa présence habituelle et ses notifications pour cette famille.
   * **Si l'utilisateur n'existe pas** :
     * L'administrateur familial saisit son Prénom, Nom, rôle familial et statut Administrateur (oui/non).
     * Un email d'invitation est envoyé. L'invité clique sur le lien pour définir son mot de passe, personnaliser son avatar et finaliser son profil.

---

## 6. URLs, Navigation & Expérience Utilisateur

### A. Structure des URLs
* **URL Globale de Connexion** : `/login`
* **URL Super Administrateur** : `/super-admin` *(Gestion des familles, quotas, logs, SMTP global)*
* **URLs d'une Famille** :
  * Tableau de bord : `/:familySlug/`
  * Tâches : `/:familySlug/tasks`
  * Calendrier : `/:familySlug/calendar`
  * Présences / Repas : `/:familySlug/absences`
  * Courses : `/:familySlug/shopping`
  * Paramètres de la famille (Admin familial) : `/:familySlug/settings`
* **Écran d'invitation** : `/:familySlug/invitation?token=...`

### B. Sélecteur de Famille (Header)
* Si un utilisateur appartient à **1 seule famille** : il est redirigé directement vers son tableau de bord `/:familySlug/` dès la connexion.
* Si un utilisateur appartient à **plusieurs familles** :
  * Un menu déroulant (Family Switcher) dans le header permet de basculer instantanément d'une famille à une autre sans se reconnecter.
  * L'application mémorise la dernière famille activement consultée pour le prochain lancement.

---

## 7. Préservation et Migration des Données Existantes

Afin de ne perdre **aucune donnée actuelle** :
* Un script de migration automatisé sera exécuté lors de la mise à niveau :
  1. Il crée automatiquement une première famille (ex: slug `famille-principale` ou nom personnalisable).
  2. Il rattache tous les utilisateurs actuels à cette famille.
  3. Il promeut le compte administrateur actuel en **Super Administrateur** ET **Administrateur de cette première famille**.
  4. Il assigne le `familyId` de cette famille à l'intégralité des tâches, événements, présences, raccourcis et catégories existants.
  5. Il conserve la configuration email actuelle en tant que configuration SMTP de cette première famille (et la duplique comme SMTP global de secours).

---

## 8. Étapes d'Implémentation Recommandées

1. **Phase 1 : Modélisation & Base de Données**
   * Création des schémas `Family` et `FamilyMember`.
   * Ajout de `isSuperAdmin` au schéma `User`.
   * Script de migration des données actuelles vers la famille initiale.
2. **Phase 2 : API Backend & Sécurisation**
   * Middleware de contexte familial (`familyContext`) et de contrôle d'accès.
   * Scoping des endpoints (`/api/tasks`, `/api/shopping`, etc.) par `familyId`.
   * Endpoints Super Admin (CRUD familles, quotas, SMTP global).
   * Endpoints Admin Familial (paramètres de famille, SMTP familial).
3. **Phase 3 : Routage Frontend & Contexte**
   * Paramétrage de Vue Router avec préfixe dynamique `/:familySlug/`.
   * Sélecteur de famille dans le header.
   * Dashboard Super Admin.
4. **Phase 4 : Système d'Invitation & Onboarding**
   * Gestion des tokens d'invitation.
   * Écrans d'embarquement (nouveau compte vs compte existant).
   * Modales de confirmation lors de la saisie d'un email existant.
5. **Phase 5 : Tests & Validation**
   * Validation de l'étanchéité des données entre deux familles distinctes.
   * Validation du double système SMTP.
