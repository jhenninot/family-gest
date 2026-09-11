<template>
  <div class="super-admin-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge">
          <ShieldAlert :size="16" />
          <span>Plateforme Globale</span>
        </div>
        <h1 class="page-title">Console Super Administrateur</h1>
        <p class="page-subtitle">Gestion centralisée des familles, quotas, utilisateurs et SMTP global.</p>
      </div>
      <div class="header-actions">
        <button @click="openImportFamilyModal()" class="btn btn-secondary">
          <Upload :size="18" />
          <span>Importer des données</span>
        </button>
        <button @click="openCreateFamilyModal" class="btn btn-primary">
          <Plus :size="18" />
          <span>Créer une famille</span>
        </button>
        <button @click="goToDashboard" class="btn btn-secondary">
          <ArrowLeft :size="18" />
          <span>Retour à l'espace familial</span>
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-nav glass-card">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'families' }" 
        @click="activeTab = 'families'"
      >
        <Home :size="18" />
        <span>Familles ({{ families.length }})</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'users' }" 
        @click="activeTab = 'users'"
      >
        <Users :size="18" />
        <span>Utilisateurs ({{ users.length }})</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'smtp' }" 
        @click="activeTab = 'smtp'"
      >
        <Globe :size="18" />
        <span>Configuration Globale & SMTP</span>
      </button>
    </div>

    <!-- TAB 1: FAMILIES -->
    <div v-if="activeTab === 'families'" class="tab-content">
      <div v-if="loadingFamilies" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des familles...</p>
      </div>

      <div v-else class="families-list-container glass-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Slug (URL)</th>
              <th>Membres / Quota</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fam in families" :key="fam._id">
              <td class="cell-primary">
                <strong>{{ fam.name }}</strong>
              </td>
              <td class="cell-slug">
                <code>/{{ fam.slug }}</code>
              </td>
              <td>
                <span class="quota-pill">
                  {{ fam.memberCount || 0 }} / {{ fam.maxMembers }} membres
                </span>
              </td>
              <td>
                <span class="status-pill" :class="{ active: fam.isActive, inactive: !fam.isActive }">
                  {{ fam.isActive ? 'Active' : 'Désactivée' }}
                </span>
              </td>
              <td class="cell-actions">
                <button 
                  @click="openAddAdminModal(fam)" 
                  class="btn-icon text-indigo" 
                  title="Ajouter un administrateur familial"
                >
                  <UserPlus :size="16" />
                </button>
                <button 
                  @click="openEditFamilyModal(fam)" 
                  class="btn-icon text-indigo" 
                  title="Modifier la famille (Nom, Identifiant URL, Quota)"
                >
                  <Edit2 :size="16" />
                </button>
                <button 
                  @click="toggleFamilyActive(fam)" 
                  class="btn-icon" 
                  :class="{ 'text-danger': fam.isActive, 'text-success': !fam.isActive }"
                  :title="fam.isActive ? 'Désactiver la famille' : 'Activer la famille'"
                >
                  <Power :size="16" />
                </button>
                <button 
                  @click="openImportFamilyModal(fam)" 
                  class="btn-icon text-amber" 
                  title="Importer des données dans cette famille"
                >
                  <Upload :size="16" />
                </button>
                <button 
                  @click="switchAndGo(fam.slug)" 
                  class="btn-icon text-primary" 
                  title="Ouvrir cette famille"
                >
                  <ExternalLink :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: USERS -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <div v-if="loadingUsers" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>

      <div v-else class="users-list-container glass-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle Global</th>
              <th>Familles associées</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id || u._id">
              <td>
                <div class="user-cell">
                  <UserAvatar :avatar="u.avatar" :name="u.firstName" size="sm" />
                  <div>
                    <strong>{{ u.firstName }} {{ u.lastName }}</strong>
                  </div>
                </div>
              </td>
              <td>{{ u.email }}</td>
              <td>
                <span v-if="u.isSuperAdmin" class="role-pill super-admin-role">
                  <ShieldAlert :size="14" /> Super Admin
                </span>
                <span v-else class="role-pill standard-user-role">
                  Utilisateur
                </span>
              </td>
              <td>
                <div class="family-tags">
                  <span 
                    v-for="f in u.families" 
                    :key="f.slug || f.familyId" 
                    class="family-tag"
                    :class="{ 'admin-tag': f.isAdmin }"
                  >
                    <ShieldCheck v-if="f.isAdmin" :size="12" class="tag-icon" />
                    {{ f.name }} <small>({{ f.role }})</small>
                    <button 
                      v-if="!u.isSuperAdmin"
                      type="button"
                      @click="toggleUserFamilyAdmin(u, f)" 
                      class="tag-toggle-btn"
                      :title="f.isAdmin ? 'Rétrograder en membre standard' : 'Nommer administrateur de cette famille'"
                    >
                      {{ f.isAdmin ? '👑 Retirer admin' : '⭐ Nommer admin' }}
                    </button>
                  </span>
                  <span v-if="!u.families || u.families.length === 0" class="text-muted">
                    Aucune
                  </span>
                </div>
              </td>
              <td class="cell-actions">
                <button 
                  @click="openManageUserModal(u)" 
                  class="btn-icon text-indigo" 
                  title="Gérer l'utilisateur"
                >
                  <Settings :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: GLOBAL CONFIG & SMTP -->
    <div v-if="activeTab === 'smtp'" class="tab-content">
      <div class="smtp-container glass-card">
        <div class="smtp-intro">
          <h3>Paramétrage Global de la Plateforme</h3>
          <p>
            Configurez l'adresse web publique principale de FamilyGest et le serveur SMTP global utilisé par défaut pour toutes les familles.
          </p>
        </div>

        <form @submit.prevent="saveGlobalSmtp" class="smtp-form">
          <!-- Section URL Publique de la plateforme -->
          <div class="form-group margin-bottom-lg">
            <label class="form-label">
              <strong>URL publique de l'application / du serveur (Base URL)</strong>
            </label>
            <input 
              v-model="smtpConfig.serverUrl" 
              type="text" 
              placeholder="Ex: https://famille.mondomaine.fr ou http://192.168.1.50:5000" 
              class="form-input" 
              required 
            />
            <span class="help-subtext">
              Exemple : <code>https://famille.mondomaine.fr</code> ou <code>http://localhost:5000</code>. Sans barre oblique finale. Cette adresse sera insérée dans tous les emails d'invitation et de notification pour que les membres de chaque famille puissent accéder à l'application.
            </span>
          </div>

          <div class="separator-divider"></div>
          <h4 class="sub-section-title margin-top-md">Serveur SMTP Global de secours</h4>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Hôte SMTP (Host)</label>
              <input 
                v-model="smtpConfig.host" 
                type="text" 
                placeholder="Ex: smtp.sendgrid.net ou mail.mondomaine.com" 
                class="form-input" 
                required 
              />
            </div>
            <div class="form-group">
              <label class="form-label">Port</label>
              <input 
                v-model.number="smtpConfig.port" 
                type="number" 
                placeholder="Ex: 587 ou 465" 
                class="form-input" 
                required 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Nom d'utilisateur (Login SMTP)</label>
              <input 
                v-model="smtpConfig.user" 
                type="text" 
                placeholder="Ex: apikey ou notification@mondomaine.com" 
                class="form-input" 
              />
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe SMTP</label>
              <input 
                v-model="smtpConfig.password" 
                type="password" 
                placeholder="Mot de passe ou clé API" 
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Email Expéditeur ("From")</label>
              <input 
                v-model="smtpConfig.from" 
                type="email" 
                placeholder="Ex: no-reply@mondomaine.com" 
                class="form-input" 
                required 
              />
            </div>
            <div class="form-group flex-center-y">
              <label class="checkbox-container">
                <input v-model="smtpConfig.secure" type="checkbox" />
                <span class="checkmark"></span>
                <span>Connexion SSL/TLS directe (port 465)</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Email de destination pour le test</label>
            <input 
              v-model="testRecipient" 
              type="email" 
              placeholder="votre-email@exemple.fr" 
              class="form-input" 
            />
            <span class="help-subtext">Un email de test sera envoyé à cette adresse pour vérifier la délivrabilité.</span>
          </div>

          <div v-if="smtpMessage" class="alert-box" :class="smtpSuccess ? 'alert-success' : 'alert-error'">
            {{ smtpMessage }}
          </div>

          <div class="smtp-actions">
            <button 
              type="button" 
              @click="testGlobalSmtp" 
              class="btn btn-secondary" 
              :disabled="testingSmtp || savingSmtp"
            >
              <Send :size="16" />
              <span>{{ testingSmtp ? 'Test en cours...' : 'Tester la connexion SMTP' }}</span>
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="savingSmtp || testingSmtp"
            >
              <Check :size="16" />
              <span>{{ savingSmtp ? 'Enregistrement...' : 'Enregistrer la configuration' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL CREATE FAMILY -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>Créer une nouvelle famille</h3>
          <button @click="showCreateModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleCreateFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">Nom de la famille</label>
            <input 
              v-model="newFamily.name" 
              @input="onFamilyNameChange" 
              type="text" 
              placeholder="Ex: Famille Dupont" 
              class="form-input" 
              required 
            />
          </div>

          <div class="form-group">
            <label class="form-label">Identifiant URL (Slug)</label>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">family-gest/</span>
              <input 
                v-model="newFamily.slug" 
                @input="checkSlugAvailability" 
                type="text" 
                placeholder="famille-dupont" 
                class="form-input slug-input" 
                required 
              />
            </div>
            <div v-if="slugStatus.checked" class="slug-status" :class="{ available: slugStatus.available, unavailable: !slugStatus.available }">
              <span v-if="slugStatus.available">✓ Identifiant disponible</span>
              <span v-else>✗ {{ slugStatus.message || 'Identifiant déjà utilisé' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Quota maximum de membres</label>
            <input 
              v-model.number="newFamily.maxMembers" 
              type="number" 
              min="1" 
              max="50" 
              class="form-input" 
              required 
            />
          </div>

          <div class="separator-divider"></div>
          <h4 class="sub-section-title">Administrateur initial de la famille</h4>

          <div class="form-group">
            <label class="form-label">Adresse Email de l'administrateur</label>
            <input 
              v-model="newFamily.adminEmail" 
              @blur="checkAdminEmail" 
              type="email" 
              placeholder="admin@famille.fr" 
              class="form-input" 
              required 
            />
            <div v-if="adminUserCheck.checked" class="user-check-info">
              <span v-if="adminUserCheck.exists" class="text-info">
                ℹ️ Compte existant détecté ({{ adminUserCheck.user.firstName }} {{ adminUserCheck.user.lastName }}). La famille lui sera rattachée.
              </span>
              <span v-else class="text-muted">
                ℹ️ Nouveau compte : une invitation pour créer son mot de passe lui sera envoyée.
              </span>
            </div>
          </div>

          <!-- Si nouveau compte -->
          <div v-if="adminUserCheck.checked && !adminUserCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input v-model="newFamily.adminFirstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input v-model="newFamily.adminLastName" type="text" class="form-input" required />
            </div>
          </div>

          <div v-if="createError" class="alert-box alert-error">
            {{ createError }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Annuler</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="submittingFamily || (slugStatus.checked && !slugStatus.available)"
            >
              {{ submittingFamily ? 'Création...' : 'Créer l\'espace familial' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL EDIT FAMILY (NAME, SLUG, QUOTA) -->
    <div v-if="showEditFamilyModal" class="modal-overlay" @click.self="showEditFamilyModal = false">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <div>
            <h3>Modifier la famille</h3>
            <p class="modal-subtitle">Famille : <strong>{{ selectedFamily?.name }}</strong></p>
          </div>
          <button @click="showEditFamilyModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveEditFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">Nom de la famille</label>
            <input 
              v-model="editFamilyForm.name" 
              type="text" 
              placeholder="Ex: Famille Toto" 
              class="form-input" 
              required 
            />
          </div>

          <div class="form-group">
            <div class="label-with-action">
              <label class="form-label">Identifiant URL (Slug)</label>
              <button 
                type="button" 
                @click="generateSlugFromEditName" 
                class="btn-link-action"
                title="Générer automatiquement un identifiant à partir du nom"
              >
                🪄 Générer depuis le nom
              </button>
            </div>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">family-gest/</span>
              <input 
                v-model="editFamilyForm.slug" 
                @input="checkEditSlugAvailability" 
                type="text" 
                placeholder="famille-toto" 
                class="form-input slug-input" 
                required 
              />
            </div>
            <div v-if="editSlugStatus.checked" class="slug-status" :class="{ available: editSlugStatus.available, unavailable: !editSlugStatus.available }">
              <span v-if="editSlugStatus.available">✓ Identifiant disponible</span>
              <span v-else>✗ {{ editSlugStatus.message || 'Identifiant déjà utilisé' }}</span>
            </div>
            <span class="help-subtext">
              ⚠️ Attention : La modification de l'identifiant modifie l'adresse URL d'accès à cette famille (<code>/{{ editFamilyForm.slug || '...' }}</code>).
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Quota maximum de membres</label>
            <input 
              v-model.number="editFamilyForm.maxMembers" 
              type="number" 
              min="1" 
              max="100" 
              class="form-input" 
              required 
            />
          </div>

          <div v-if="editFamilyError" class="alert-box alert-error">
            {{ editFamilyError }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="showEditFamilyModal = false" class="btn btn-secondary">Annuler</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="savingFamily || (editSlugStatus.checked && !editSlugStatus.available)"
            >
              {{ savingFamily ? 'Enregistrement...' : 'Enregistrer les modifications' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL ADD ADMIN TO FAMILY -->
    <div v-if="showAddAdminModal" class="modal-overlay" @click.self="showAddAdminModal = false">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <div>
            <h3>Ajouter un administrateur familial</h3>
            <p class="modal-subtitle">Famille : <strong>{{ selectedFamilyForAdmin?.name }}</strong></p>
          </div>
          <button @click="showAddAdminModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddAdminToFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">Adresse Email du futur administrateur</label>
            <input 
              v-model="newAdmin.email" 
              @blur="checkNewAdminEmail" 
              type="email" 
              placeholder="admin@exemple.fr" 
              class="form-input" 
              required 
            />
            <div v-if="newAdminUserCheck.checked" class="user-check-info">
              <span v-if="newAdminUserCheck.exists" class="text-info">
                ℹ️ Compte existant détecté ({{ newAdminUserCheck.user?.firstName }} {{ newAdminUserCheck.user?.lastName }}). Un email d'invitation lui sera envoyé pour rejoindre cette famille en tant qu'administrateur.
              </span>
              <span v-else class="text-muted">
                ℹ️ Nouveau compte : une invitation pour créer son mot de passe et rejoindre la famille en tant qu'administrateur lui sera envoyée.
              </span>
            </div>
          </div>

          <!-- Si nouveau compte -->
          <div v-if="newAdminUserCheck.checked && !newAdminUserCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input v-model="newAdmin.firstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input v-model="newAdmin.lastName" type="text" class="form-input" required />
            </div>
          </div>

          <div v-if="addAdminError" class="alert-box alert-error">
            {{ addAdminError }}
          </div>

          <div v-if="addAdminSuccess" class="alert-box alert-success">
            {{ addAdminSuccess }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddAdminModal = false" class="btn btn-secondary">Annuler</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="submittingAdmin"
            >
              <Send :size="15" />
              <span>{{ submittingAdmin ? 'Envoi en cours...' : 'Envoyer l\'invitation administrateur' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL MANAGE USER -->
    <div v-if="showUserModal" class="modal-overlay" @click.self="showUserModal = false">
      <div class="modal-content glass-card modal-lg">
        <div class="modal-header">
          <div>
            <h3>Gestion du compte utilisateur</h3>
            <p class="modal-subtitle">
              {{ selectedUser?.firstName }} {{ selectedUser?.lastName }} &bull; {{ selectedUser?.email }}
            </p>
          </div>
          <button @click="showUserModal = false" class="btn-close">&times;</button>
        </div>

        <div class="modal-body user-management-body">
          <!-- Messages -->
          <div v-if="userModalError" class="alert-box alert-error">
            {{ userModalError }}
          </div>
          <div v-if="userModalSuccess" class="alert-box alert-success">
            {{ userModalSuccess }}
          </div>

          <!-- Section 1: Informations Générales & Statut Global -->
          <div class="card-section">
            <h4 class="sub-section-title">
              <Users :size="16" /> Informations Générales & Statut Global
            </h4>
            <form @submit.prevent="handleUpdateUserProfile" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Prénom</label>
                  <input v-model="userForm.firstName" type="text" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Nom</label>
                  <input v-model="userForm.lastName" type="text" class="form-input" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Adresse Email</label>
                <input v-model="userForm.email" type="email" class="form-input" required />
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="userForm.isSuperAdmin" type="checkbox" />
                  <span>
                    <strong>Super Administrateur Global de la plateforme</strong>
                    <small class="help-text">Donne accès à cette console super admin et au contrôle global de toutes les familles.</small>
                  </span>
                </label>
              </div>
              <div class="form-actions-right">
                <button type="submit" class="btn btn-primary btn-sm" :disabled="savingUser">
                  {{ savingUser ? 'Enregistrement...' : 'Mettre à jour le profil' }}
                </button>
              </div>
            </form>
          </div>

          <div class="separator-divider"></div>

          <!-- Section 2: Familles Associées & Rôles Familiaux -->
          <div class="card-section">
            <h4 class="sub-section-title">
              <Home :size="16" /> Familles associées
            </h4>
            <div v-if="!selectedUser?.families || selectedUser.families.length === 0" class="empty-state-text">
              Cet utilisateur n'appartient actuellement à aucune famille.
            </div>
            <div v-else class="user-families-list">
              <div 
                v-for="f in selectedUser.families" 
                :key="f.familyId || f._id" 
                class="user-family-row"
              >
                <div class="family-info-col">
                  <strong>{{ f.name }}</strong>
                  <code class="text-xs">/{{ f.slug }}</code>
                </div>
                <div class="family-role-col">
                  <input 
                    v-model="f.role" 
                    type="text" 
                    placeholder="Rôle (ex: Parent)" 
                    class="form-input form-input-sm"
                  />
                </div>
                <div class="family-admin-col">
                  <label class="admin-checkbox-label">
                    <input v-model="f.isAdmin" type="checkbox" />
                    <span>Admin Familial</span>
                  </label>
                </div>
                <div class="family-actions-col">
                  <button 
                    type="button" 
                    @click="handleUpdateFamilyRole(f)" 
                    class="btn btn-sm btn-secondary" 
                    title="Enregistrer pour cette famille"
                  >
                    <Check :size="14" />
                    <span>Sauvegarder</span>
                  </button>
                  <button 
                    type="button" 
                    @click="handleRemoveFromFamily(f)" 
                    class="btn btn-sm btn-danger-ghost" 
                    title="Retirer de cette famille"
                  >
                    <UserMinus :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Ajouter à une nouvelle famille -->
            <div class="add-to-family-box margin-top-md">
              <h5 class="sub-box-title">Rattacher à une nouvelle famille</h5>
              <form @submit.prevent="handleAttachFamily" class="attach-family-form">
                <div class="form-group flex-1">
                  <select v-model="newFamilyAttach.familyId" class="form-select form-input-sm" required>
                    <option value="" disabled>Sélectionner une famille...</option>
                    <option v-for="fam in unassignedFamilies" :key="fam._id" :value="fam._id">
                      {{ fam.name }} ({{ fam.memberCount || 0 }}/{{ fam.maxMembers }})
                    </option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <input 
                    v-model="newFamilyAttach.role" 
                    type="text" 
                    placeholder="Rôle (ex: Membre)" 
                    class="form-input form-input-sm" 
                  />
                </div>
                <div class="form-group flex-checkbox">
                  <label class="admin-checkbox-label">
                    <input v-model="newFamilyAttach.isAdmin" type="checkbox" />
                    <span>Admin</span>
                  </label>
                </div>
                <button 
                  type="submit" 
                  class="btn btn-primary btn-sm" 
                  :disabled="!newFamilyAttach.familyId || attachingFamily"
                >
                  <Plus :size="14" />
                  <span>Rattacher</span>
                </button>
              </form>
            </div>
          </div>

          <div class="separator-divider"></div>

          <!-- Section 3: Zone Danger - Suppression de compte -->
          <div class="card-section danger-zone">
            <h4 class="sub-section-title text-danger">
              <Trash2 :size="16" /> Zone de danger
            </h4>
            <div class="danger-zone-content">
              <div>
                <strong>Supprimer définitivement ce compte utilisateur</strong>
                <p class="text-sm text-muted">
                  Supprime le compte, retire l'utilisateur de toutes ses familles et efface ses invitations en attente. Cette action est irréversible.
                </p>
              </div>
              <button 
                type="button" 
                @click="handleDeleteUser" 
                class="btn btn-danger btn-sm" 
                :disabled="deletingUser"
              >
                <Trash2 :size="14" />
                <span>{{ deletingUser ? 'Suppression...' : 'Supprimer le compte' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="showUserModal = false" class="btn btn-secondary">Fermer</button>
        </div>
      </div>
    </div>

    <!-- MODAL IMPORT FAMILY -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-content glass-card modal-md">
        <div class="modal-header">
          <div>
            <h3>Importer les données d'une famille</h3>
            <p class="modal-subtitle">Restaurez un export JSON provenant de la version mono-famille ou d'une sauvegarde.</p>
          </div>
          <button @click="showImportModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleExecuteImport" class="modal-body">
          <div class="form-group">
            <label class="form-label">Famille de destination *</label>
            <select v-model="importTargetFamilyId" class="form-select" required>
              <option value="" disabled>-- Choisir la famille cible --</option>
              <option v-for="fam in families" :key="fam._id" :value="fam._id">
                {{ fam.name }} (/{{ fam.slug }})
              </option>
            </select>
            <span class="help-text">Les données importées seront rattachées à cette famille.</span>
          </div>

          <div class="form-group">
            <label class="form-label">Fichier JSON d'exportation *</label>
            <input 
              type="file" 
              accept=".json,application/json" 
              @change="handleFileSelected" 
              class="form-input" 
              required 
            />
            <div v-if="importFileName" class="text-sm font-semibold text-indigo margin-top-xs">
              📄 Fichier sélectionné : {{ importFileName }}
            </div>
          </div>

          <!-- Avertissement écrasement des données -->
          <div class="alert-box alert-warning">
            <AlertTriangle :size="20" class="flex-shrink-0" />
            <div>
              <strong>Attention : Écrasement des données</strong>
              <p class="margin-top-xs text-sm">
                L'importation va écraser et remplacer <strong>toutes les données existantes</strong> de cette famille (tâches, liste de courses, catégories, absences, invités, raccourcis, événements et membres).
              </p>
            </div>
          </div>

          <div v-if="importError" class="alert-box alert-error">
            {{ importError }}
          </div>

          <div v-if="importSuccess" class="alert-box alert-success">
            {{ importSuccess }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="showImportModal = false" class="btn btn-secondary">Annuler</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="importing || !importTargetFamilyId || !importFileContent"
            >
              <Upload v-if="!importing" :size="16" />
              <Loader2 v-else :size="16" class="spin" />
              <span>{{ importing ? 'Importation en cours...' : 'Écraser et Importer les données' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import UserAvatar from '../components/UserAvatar.vue'
import { 
  ShieldAlert, 
  Home, 
  Users, 
  Mail, 
  Globe,
  Plus, 
  ArrowLeft, 
  Edit2, 
  Power, 
  ExternalLink, 
  Send, 
  Check,
  UserPlus,
  ShieldCheck,
  Settings,
  Trash2,
  UserMinus,
  Upload,
  AlertTriangle,
  Loader2
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const activeTab = ref('families')
const families = ref([])
const users = ref([])
const loadingFamilies = ref(false)
const loadingUsers = ref(false)

// Global Platform & SMTP State
const smtpConfig = reactive({
  serverUrl: 'http://localhost:5173',
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: ''
})
const savingSmtp = ref(false)
const testingSmtp = ref(false)
const smtpMessage = ref('')
const smtpSuccess = ref(false)
const testRecipient = ref(authStore.user?.email || '')

// Create Family State
const showCreateModal = ref(false)
const submittingFamily = ref(false)
const createError = ref('')
const newFamily = reactive({
  name: '',
  slug: '',
  maxMembers: 10,
  adminEmail: '',
  adminFirstName: '',
  adminLastName: ''
})
const slugStatus = reactive({
  checked: false,
  available: true,
  message: ''
})
const adminUserCheck = reactive({
  checked: false,
  exists: false,
  user: null
})

// Edit Family Modal
const showEditFamilyModal = ref(false)
const selectedFamily = ref(null)
const editFamilyForm = reactive({
  name: '',
  slug: '',
  maxMembers: 10
})
const editSlugStatus = reactive({
  checked: false,
  available: true,
  message: ''
})
const savingFamily = ref(false)
const editFamilyError = ref('')

// Add Family Admin Modal
const showAddAdminModal = ref(false)
const selectedFamilyForAdmin = ref(null)
const newAdmin = reactive({
  email: '',
  firstName: '',
  lastName: ''
})
const newAdminUserCheck = reactive({
  checked: false,
  exists: false,
  user: null
})
const submittingAdmin = ref(false)
const addAdminError = ref('')
const addAdminSuccess = ref('')

// User Management Modal State
const showUserModal = ref(false)
const selectedUser = ref(null)
const userForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  isSuperAdmin: false
})
const savingUser = ref(false)
const userModalError = ref('')
const userModalSuccess = ref('')
const newFamilyAttach = reactive({
  familyId: '',
  role: 'Membre',
  isAdmin: false
})
const attachingFamily = ref(false)
const deletingUser = ref(false)

const unassignedFamilies = computed(() => {
  if (!selectedUser.value) return []
  const userFamIds = (selectedUser.value.families || []).map(f => String(f.familyId || f._id || f.id))
  return families.value.filter(f => !userFamIds.includes(String(f._id || f.id)))
})

// --- Import Family Data State & Handlers ---
const showImportModal = ref(false)
const importTargetFamilyId = ref('')
const importFileName = ref('')
const importFileContent = ref(null)
const importing = ref(false)
const importError = ref('')
const importSuccess = ref('')

const openImportFamilyModal = (preselectedFamily = null) => {
  importTargetFamilyId.value = preselectedFamily ? preselectedFamily._id : (families.value[0]?._id || '')
  importFileName.value = ''
  importFileContent.value = null
  importError.value = ''
  importSuccess.value = ''
  showImportModal.value = true
}

const handleFileSelected = (event) => {
  importError.value = ''
  importSuccess.value = ''
  const file = event.target.files?.[0]
  if (!file) {
    importFileName.value = ''
    importFileContent.value = null
    return
  }
  importFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      importFileContent.value = parsed
    } catch (err) {
      importError.value = 'Le fichier sélectionné n\'est pas un JSON valide : ' + err.message
      importFileContent.value = null
    }
  }
  reader.onerror = () => {
    importError.value = 'Erreur lors de la lecture du fichier.'
    importFileContent.value = null
  }
  reader.readAsText(file)
}

const handleExecuteImport = async () => {
  if (!importTargetFamilyId.value || !importFileContent.value) return

  importing.value = true
  importError.value = ''
  importSuccess.value = ''

  try {
    const res = await fetch(`/api/super-admin/families/${importTargetFamilyId.value}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ data: importFileContent.value.data || importFileContent.value })
    })

    const result = await res.json()
    if (res.ok && result.success) {
      importSuccess.value = result.message || 'Données importées avec succès !'
      await fetchFamilies()
      await fetchUsers()
      setTimeout(() => {
        showImportModal.value = false
      }, 1800)
    } else {
      importError.value = result.error || 'Erreur lors de l\'importation des données'
    }
  } catch (err) {
    importError.value = 'Erreur réseau : ' + err.message
  } finally {
    importing.value = false
  }
}

const fetchFamilies = async () => {
  loadingFamilies.value = true
  try {
    const res = await fetch('/api/super-admin/families', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      families.value = await res.json()
    }
  } catch (err) {
    console.error('Erreur fetchFamilies', err)
  } finally {
    loadingFamilies.value = false
  }
}

const fetchUsers = async () => {
  loadingUsers.value = true
  try {
    const res = await fetch('/api/super-admin/users', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      users.value = await res.json()
    }
  } catch (err) {
    console.error('Erreur fetchUsers', err)
  } finally {
    loadingUsers.value = false
  }
}

const fetchSmtp = async () => {
  try {
    const res = await fetch('/api/super-admin/smtp', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      smtpConfig.serverUrl = data.serverUrl || 'http://localhost:5173'
      smtpConfig.host = data.host || ''
      smtpConfig.port = data.port || 587
      smtpConfig.secure = Boolean(data.secure)
      smtpConfig.user = data.user || ''
      smtpConfig.from = data.fromEmail || data.from || ''
    }
  } catch (err) {
    console.error('Erreur fetchSmtp', err)
  }
}

onMounted(() => {
  if (!authStore.isSuperAdmin) {
    router.push('/')
    return
  }
  fetchFamilies()
  fetchUsers()
  fetchSmtp()
})

const goToDashboard = () => {
  const slug = localStorage.getItem('familygest_active_slug') || authStore.families[0]?.slug
  if (slug) {
    router.push(`/${slug}`)
  } else {
    router.push('/select-family')
  }
}

const switchAndGo = async (slug) => {
  await familyStore.switchFamily(slug)
  router.push(`/${slug}`)
}

const openCreateFamilyModal = () => {
  newFamily.name = ''
  newFamily.slug = ''
  newFamily.maxMembers = 10
  newFamily.adminEmail = ''
  newFamily.adminFirstName = ''
  newFamily.adminLastName = ''
  slugStatus.checked = false
  adminUserCheck.checked = false
  createError.value = ''
  showCreateModal.value = true
}

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const onFamilyNameChange = () => {
  newFamily.slug = slugify(newFamily.name)
  checkSlugAvailability()
}

let slugTimer = null
const checkSlugAvailability = () => {
  clearTimeout(slugTimer)
  if (!newFamily.slug) {
    slugStatus.checked = false
    return
  }
  slugTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/super-admin/check-slug/${encodeURIComponent(newFamily.slug)}`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      const data = await res.json()
      slugStatus.checked = true
      slugStatus.available = data.available
      slugStatus.message = data.message || ''
    } catch (err) {
      console.error(err)
    }
  }, 300)
}

const checkAdminEmail = async () => {
  if (!newFamily.adminEmail) {
    adminUserCheck.checked = false
    return
  }
  try {
    const res = await fetch(`/api/super-admin/check-email?email=${encodeURIComponent(newFamily.adminEmail)}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    adminUserCheck.checked = true
    adminUserCheck.exists = data.exists
    adminUserCheck.user = data.user || null
  } catch (err) {
    console.error(err)
  }
}

const handleCreateFamily = async () => {
  createError.value = ''
  submittingFamily.value = true
  try {
    const res = await fetch('/api/super-admin/families', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(newFamily)
    })
    const data = await res.json()
    if (!res.ok) {
      createError.value = data.error || 'Erreur lors de la création de la famille'
      return
    }
    showCreateModal.value = false
    await fetchFamilies()
    await fetchUsers()
  } catch (err) {
    createError.value = err.message
  } finally {
    submittingFamily.value = false
  }
}

const openEditFamilyModal = (fam) => {
  selectedFamily.value = fam
  editFamilyForm.name = fam.name
  editFamilyForm.slug = fam.slug
  editFamilyForm.maxMembers = fam.maxMembers
  editSlugStatus.checked = false
  editSlugStatus.available = true
  editSlugStatus.message = ''
  editFamilyError.value = ''
  showEditFamilyModal.value = true
}

let editSlugTimer = null
const checkEditSlugAvailability = () => {
  clearTimeout(editSlugTimer)
  if (!editFamilyForm.slug) {
    editSlugStatus.checked = false
    return
  }
  const clean = slugify(editFamilyForm.slug)
  editFamilyForm.slug = clean
  editSlugTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/super-admin/check-slug/${encodeURIComponent(clean)}?excludeId=${selectedFamily.value?._id}`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      const data = await res.json()
      editSlugStatus.checked = true
      editSlugStatus.available = data.available
      editSlugStatus.message = data.reason || (data.available ? '' : 'Identifiant déjà utilisé')
    } catch (err) {
      console.error(err)
    }
  }, 300)
}

const generateSlugFromEditName = () => {
  editFamilyForm.slug = slugify(editFamilyForm.name)
  checkEditSlugAvailability()
}

const handleSaveEditFamily = async () => {
  if (!selectedFamily.value) return
  savingFamily.value = true
  editFamilyError.value = ''
  try {
    const oldSlug = selectedFamily.value.slug
    const res = await fetch(`/api/super-admin/families/${selectedFamily.value._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        name: editFamilyForm.name,
        slug: editFamilyForm.slug,
        maxMembers: editFamilyForm.maxMembers
      })
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Erreur lors de la modification de la famille')
    }

    showEditFamilyModal.value = false

    // Si le slug de la famille active a été modifié, mettre à jour le store et localStorage
    if (localStorage.getItem('familygest_active_slug') === oldSlug) {
      localStorage.setItem('familygest_active_slug', data.slug)
      if (store.currentFamily && (store.currentFamily._id === data._id || store.currentFamily.id === data._id)) {
        store.currentFamily.slug = data.slug
        store.currentFamily.name = data.name
      }
    }

    await fetchFamilies()
    await fetchUsers()
    await store.fetchUserFamilies()
  } catch (err) {
    editFamilyError.value = err.message
  } finally {
    savingFamily.value = false
  }
}

const openAddAdminModal = (fam) => {
  selectedFamilyForAdmin.value = fam
  newAdmin.email = ''
  newAdmin.firstName = ''
  newAdmin.lastName = ''
  newAdminUserCheck.checked = false
  newAdminUserCheck.exists = false
  newAdminUserCheck.user = null
  addAdminError.value = ''
  addAdminSuccess.value = ''
  showAddAdminModal.value = true
}

const checkNewAdminEmail = async () => {
  if (!newAdmin.email) {
    newAdminUserCheck.checked = false
    return
  }
  try {
    const res = await fetch(`/api/super-admin/check-email?email=${encodeURIComponent(newAdmin.email)}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    newAdminUserCheck.checked = true
    newAdminUserCheck.exists = data.exists
    newAdminUserCheck.user = data.user || null
    if (data.exists && data.user) {
      newAdmin.firstName = data.user.firstName || ''
      newAdmin.lastName = data.user.lastName || ''
    }
  } catch (err) {
    console.error(err)
  }
}

const handleAddAdminToFamily = async () => {
  if (!selectedFamilyForAdmin.value) return
  submittingAdmin.value = true
  addAdminError.value = ''
  addAdminSuccess.value = ''
  try {
    const res = await fetch(`/api/super-admin/families/${selectedFamilyForAdmin.value._id}/invite-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName
      })
    })
    const data = await res.json()
    if (!res.ok) {
      addAdminError.value = data.error || 'Erreur lors de l\'envoi de l\'invitation'
      return
    }
    addAdminSuccess.value = `✓ Invitation envoyée avec succès à ${newAdmin.email} !`
    await fetchFamilies()
    await fetchUsers()
    setTimeout(() => {
      showAddAdminModal.value = false
    }, 1800)
  } catch (err) {
    addAdminError.value = err.message || 'Erreur réseau'
  } finally {
    submittingAdmin.value = false
  }
}

const toggleUserFamilyAdmin = async (u, f) => {
  const newAdminStatus = !f.isAdmin
  const familyId = f.familyId || f._id || f.id
  const actionText = newAdminStatus 
    ? `Nommer ${u.firstName} ${u.lastName} administrateur de la famille "${f.name}" ?`
    : `Retirer les droits d'administrateur de ${u.firstName} ${u.lastName} pour la famille "${f.name}" ?`
  if (!confirm(actionText)) return

  try {
    const res = await fetch(`/api/super-admin/users/${u.id}/set-family-admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        familyId,
        isAdmin: newAdminStatus
      })
    })
    if (res.ok) {
      await fetchUsers()
      await fetchFamilies()
    } else {
      const err = await res.json()
      alert(err.error || 'Erreur lors de la modification des droits')
    }
  } catch (err) {
    console.error('Erreur toggleUserFamilyAdmin', err)
    alert(err.message)
  }
}

const openManageUserModal = (u) => {
  selectedUser.value = JSON.parse(JSON.stringify(u))
  userForm.firstName = u.firstName || ''
  userForm.lastName = u.lastName || ''
  userForm.email = u.email || ''
  userForm.isSuperAdmin = Boolean(u.isSuperAdmin)
  userModalError.value = ''
  userModalSuccess.value = ''
  newFamilyAttach.familyId = ''
  newFamilyAttach.role = 'Membre'
  newFamilyAttach.isAdmin = false
  showUserModal.value = true
}

const handleUpdateUserProfile = async () => {
  if (!selectedUser.value) return
  savingUser.value = true
  userModalError.value = ''
  userModalSuccess.value = ''
  try {
    const userId = selectedUser.value.id || selectedUser.value._id
    const res = await fetch(`/api/super-admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(userForm)
    })
    const data = await res.json()
    if (!res.ok) {
      userModalError.value = data.error || 'Erreur lors de la mise à jour du profil'
      return
    }
    userModalSuccess.value = '✓ Informations de l\'utilisateur mises à jour avec succès !'
    selectedUser.value.firstName = userForm.firstName
    selectedUser.value.lastName = userForm.lastName
    selectedUser.value.email = userForm.email
    selectedUser.value.isSuperAdmin = userForm.isSuperAdmin
    await fetchUsers()
  } catch (err) {
    userModalError.value = err.message || 'Erreur réseau'
  } finally {
    savingUser.value = false
  }
}

const handleUpdateFamilyRole = async (f) => {
  if (!selectedUser.value) return
  userModalError.value = ''
  userModalSuccess.value = ''
  try {
    const userId = selectedUser.value.id || selectedUser.value._id
    const familyId = f.familyId || f._id || f.id
    const res = await fetch(`/api/super-admin/users/${userId}/families/${familyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        role: f.role,
        isAdmin: Boolean(f.isAdmin)
      })
    })
    const data = await res.json()
    if (!res.ok) {
      userModalError.value = data.error || 'Erreur lors de la modification du rôle'
      return
    }
    userModalSuccess.value = `✓ Rôle pour "${f.name}" mis à jour avec succès !`
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || 'Erreur réseau'
  }
}

const handleRemoveFromFamily = async (f) => {
  if (!selectedUser.value) return
  if (!confirm(`Retirer ${selectedUser.value.firstName} de la famille "${f.name}" ?`)) return
  userModalError.value = ''
  userModalSuccess.value = ''
  try {
    const userId = selectedUser.value.id || selectedUser.value._id
    const familyId = f.familyId || f._id || f.id
    const res = await fetch(`/api/super-admin/users/${userId}/families/${familyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) {
      userModalError.value = data.error || 'Erreur lors du retrait de la famille'
      return
    }
    userModalSuccess.value = `✓ Retiré de la famille "${f.name}" avec succès !`
    selectedUser.value.families = selectedUser.value.families.filter(
      item => (item.familyId || item._id || item.id) !== familyId
    )
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || 'Erreur réseau'
  }
}

const handleAttachFamily = async () => {
  if (!selectedUser.value || !newFamilyAttach.familyId) return
  attachingFamily.value = true
  userModalError.value = ''
  userModalSuccess.value = ''
  try {
    const userId = selectedUser.value.id || selectedUser.value._id
    const res = await fetch(`/api/super-admin/users/${userId}/families`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        familyId: newFamilyAttach.familyId,
        role: newFamilyAttach.role || 'Membre',
        isAdmin: Boolean(newFamilyAttach.isAdmin)
      })
    })
    const data = await res.json()
    if (!res.ok) {
      userModalError.value = data.error || 'Erreur lors du rattachement'
      return
    }
    userModalSuccess.value = '✓ Utilisateur rattaché à la famille avec succès !'
    await fetchUsers()
    await fetchFamilies()
    const updated = users.value.find(u => (u.id || u._id) === userId)
    if (updated) {
      selectedUser.value = JSON.parse(JSON.stringify(updated))
    }
    newFamilyAttach.familyId = ''
    newFamilyAttach.role = 'Membre'
    newFamilyAttach.isAdmin = false
  } catch (err) {
    userModalError.value = err.message || 'Erreur réseau'
  } finally {
    attachingFamily.value = false
  }
}

const handleDeleteUser = async () => {
  if (!selectedUser.value) return
  const fullName = `${selectedUser.value.firstName} ${selectedUser.value.lastName}`
  if (!confirm(`Êtes-vous ABSOLUMENT certain de vouloir supprimer le compte de ${fullName} ?\nCette action est irréversible et supprimera tous ses accès.`)) {
    return
  }
  deletingUser.value = true
  userModalError.value = ''
  try {
    const userId = selectedUser.value.id || selectedUser.value._id
    const res = await fetch(`/api/super-admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) {
      userModalError.value = data.error || 'Erreur lors de la suppression du compte'
      return
    }
    showUserModal.value = false
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || 'Erreur réseau'
  } finally {
    deletingUser.value = false
  }
}

const toggleFamilyActive = async (fam) => {
  const action = fam.isActive ? 'désactiver' : 'activer'
  if (!confirm(`Êtes-vous sûr de vouloir ${action} la famille "${fam.name}" ?`)) return
  try {
    const res = await fetch(`/api/super-admin/families/${fam._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ isActive: !fam.isActive })
    })
    if (res.ok) {
      await fetchFamilies()
    }
  } catch (err) {
    console.error('Erreur toggleFamilyActive', err)
  }
}

const saveGlobalSmtp = async () => {
  savingSmtp.value = true
  smtpMessage.value = ''
  try {
    const payload = {
      serverUrl: (smtpConfig.serverUrl || '').trim(),
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.user,
      password: smtpConfig.password,
      pass: smtpConfig.password,
      from: smtpConfig.from,
      fromEmail: smtpConfig.from
    }
    const res = await fetch('/api/super-admin/smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.ok) {
      smtpSuccess.value = true
      smtpMessage.value = '✓ Paramètres de la plateforme et SMTP enregistrés avec succès !'
    } else {
      smtpSuccess.value = false
      smtpMessage.value = data.error || 'Erreur lors de l\'enregistrement'
    }
  } catch (err) {
    smtpSuccess.value = false
    smtpMessage.value = err.message
  } finally {
    savingSmtp.value = false
  }
}

const testGlobalSmtp = async () => {
  testingSmtp.value = true
  smtpMessage.value = ''
  try {
    const targetRecipient = (testRecipient.value || authStore.user?.email || smtpConfig.from || smtpConfig.user || '').trim()
    const payload = {
      ...smtpConfig,
      recipientEmail: targetRecipient
    }
    const res = await fetch('/api/super-admin/smtp/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.ok && data.success) {
      smtpSuccess.value = true
      smtpMessage.value = `✓ ${data.message || 'Test réussi ! Connexion au serveur SMTP globale validée.'}`
    } else {
      smtpSuccess.value = false
      smtpMessage.value = `Échec du test : ${data.error || 'Impossible de se connecter'}`
    }
  } catch (err) {
    smtpSuccess.value = false
    smtpMessage.value = `Erreur réseau : ${err.message}`
  } finally {
    testingSmtp.value = false
  }
}
</script>

<style scoped>
.super-admin-view {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  padding: 0.3rem 0.6rem;
  border-radius: 9999px;
  margin-bottom: 0.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0;
}

.page-subtitle {
  color: var(--text-muted, #64748b);
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.6);
}

[data-theme='dark'] .tabs-nav {
  background: rgba(30, 41, 59, 0.6);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, #64748b);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-color, #1e293b);
  background: rgba(0, 0, 0, 0.04);
}

[data-theme='dark'] .tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  background: var(--primary, #6366f1);
  color: white;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 1rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

[data-theme='dark'] .data-table th,
[data-theme='dark'] .data-table td {
  border-color: rgba(51, 65, 85, 0.6);
}

.cell-slug code {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.quota-pill {
  font-weight: 600;
  font-size: 0.85rem;
  background: rgba(148, 163, 184, 0.15);
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}

.status-pill {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.status-pill.active {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.status-pill.inactive {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-icon {
  background: transparent;
  border: none;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-color, #1e293b);
}

.btn-icon.text-indigo {
  color: #6366f1;
}

.btn-icon.text-indigo:hover {
  color: #4f46e5;
  background: rgba(99, 102, 241, 0.15);
}

.modal-subtitle {
  color: var(--text-muted, #64748b);
  font-size: 0.88rem;
  margin-top: 0.2rem;
}

.btn-icon.text-danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.btn-icon.text-success:hover {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-cell {
  font-size: 1.4rem;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
}

.role-pill.super-admin-role {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.role-pill.family-admin-role {
  background: rgba(99, 102, 241, 0.15);
  color: #4f46e5;
}

.role-pill.standard-user-role {
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-muted, #64748b);
}

.family-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.family-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.family-tag.admin-tag {
  background: rgba(99, 102, 241, 0.2);
  color: #4338ca;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.35);
}

.tag-toggle-btn {
  background: rgba(0, 0, 0, 0.08);
  border: none;
  border-radius: 4px;
  font-size: 0.72rem;
  padding: 0.15rem 0.35rem;
  margin-left: 0.35rem;
  cursor: pointer;
  transition: all 0.2s;
  color: inherit;
}

.tag-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.18);
}

/* SMTP Tab */
.smtp-container {
  padding: 2rem;
  max-width: 800px;
}

.smtp-intro {
  margin-bottom: 1.5rem;
}

.smtp-intro h3 {
  margin: 0;
  font-size: 1.25rem;
}

.smtp-intro p {
  color: var(--text-muted, #64748b);
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

.smtp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

/* Form inputs & grid */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 600px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--bg-card, #ffffff);
  color: var(--text-color, #1e293b);
  font-size: 0.95rem;
  box-sizing: border-box;
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.btn-link-action {
  background: none;
  border: none;
  color: var(--primary, #6366f1);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  transition: opacity 0.2s;
}

.btn-link-action:hover {
  opacity: 0.8;
}

.slug-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-card, #ffffff);
}

.slug-prefix {
  padding: 0 0.75rem;
  color: var(--text-muted, #64748b);
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.03);
  border-right: 1px solid var(--border-color, #cbd5e1);
  line-height: 2.4rem;
}

.slug-input {
  border: none !important;
  border-radius: 0 !important;
}

.slug-status {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.slug-status.available {
  color: #16a34a;
}

.slug-status.unavailable {
  color: #dc2626;
}

.user-check-info {
  margin-top: 0.35rem;
  font-size: 0.85rem;
}

.separator-divider {
  height: 1px;
  background: rgba(226, 232, 240, 0.8);
  margin: 1.25rem 0;
}

.sub-section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.alert-box {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-top: 1rem;
}

.alert-success {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.alert-error {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-card, #ffffff);
  border-radius: 16px;
  width: 100%;
  max-width: 550px;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.modal-sm {
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted, #64748b);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(99, 102, 241, 0.2);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 0.75rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal LG & User Management */
.modal-lg {
  max-width: 680px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.user-management-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-section .sub-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.checkbox-group {
  margin-top: 0.25rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin-top: 0.2rem;
  width: 1rem;
  height: 1rem;
}

.help-text {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  margin-top: 0.15rem;
}

.form-actions-right {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.user-families-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-family-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  flex-wrap: wrap;
}

.family-info-col {
  flex: 1.2;
  min-width: 120px;
  display: flex;
  flex-direction: column;
}

.text-xs {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
}

.family-role-col {
  flex: 1;
  min-width: 100px;
}

.form-input-sm {
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
}

.family-admin-col {
  display: flex;
  align-items: center;
}

.admin-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.family-actions-col {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-danger-ghost {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.btn-danger-ghost:hover {
  background: rgba(239, 68, 68, 0.2);
}

.add-to-family-box {
  padding: 0.75rem;
  background: rgba(99, 102, 241, 0.04);
  border: 1px dashed rgba(99, 102, 241, 0.25);
  border-radius: 8px;
}

.sub-box-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--primary, #6366f1);
}

.attach-family-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.attach-family-form .flex-1 {
  flex: 1;
  min-width: 120px;
}

.attach-family-form .flex-checkbox {
  display: flex;
  align-items: center;
}

.form-select {
  width: 100%;
  background: var(--card-bg, #1e293b);
  color: var(--text-color, #f8fafc);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
}

.danger-zone {
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
  padding: 1rem;
  border-radius: 8px;
}

.danger-zone-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.empty-state-text {
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  font-style: italic;
  padding: 0.5rem 0;
}

.text-amber {
  color: #f59e0b !important;
}
.text-amber:hover {
  background: rgba(245, 158, 11, 0.15) !important;
}

.file-input {
  padding: 0.5rem;
  cursor: pointer;
}
</style>
