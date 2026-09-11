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
        <Mail :size="18" />
        <span>SMTP Global de secours</span>
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
                  @click="openEditQuotaModal(fam)" 
                  class="btn-icon" 
                  title="Modifier le quota"
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
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id || u._id">
              <td>
                <div class="user-cell">
                  <span class="avatar-cell">{{ u.avatar || '👤' }}</span>
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
                    :key="f.slug" 
                    class="family-tag"
                  >
                    {{ f.name }} <small>({{ f.role }})</small>
                  </span>
                  <span v-if="!u.families || u.families.length === 0" class="text-muted">
                    Aucune
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: GLOBAL SMTP -->
    <div v-if="activeTab === 'smtp'" class="tab-content">
      <div class="smtp-container glass-card">
        <div class="smtp-intro">
          <h3>Configuration SMTP Globale de la Plateforme</h3>
          <p>
            Ce serveur SMTP sera utilisé par défaut pour envoyer les emails d'invitation,
            réinitialisations de mot de passe et notifications pour toutes les familles qui n'ont pas configuré leur propre serveur SMTP.
          </p>
        </div>

        <form @submit.prevent="saveGlobalSmtp" class="smtp-form">
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

    <!-- MODAL EDIT QUOTA -->
    <div v-if="showQuotaModal" class="modal-overlay" @click.self="showQuotaModal = false">
      <div class="modal-content glass-card modal-sm">
        <div class="modal-header">
          <h3>Modifier le quota : {{ selectedFamily?.name }}</h3>
          <button @click="showQuotaModal = false" class="btn-close">&times;</button>
        </div>
        <form @submit.prevent="handleSaveQuota" class="modal-form">
          <div class="form-group">
            <label class="form-label">Nombre maximum de membres</label>
            <input 
              v-model.number="editQuotaValue" 
              type="number" 
              min="1" 
              max="100" 
              class="form-input" 
              required 
            />
          </div>
          <div class="modal-footer">
            <button type="button" @click="showQuotaModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  ShieldAlert, 
  Home, 
  Users, 
  Mail, 
  Plus, 
  ArrowLeft, 
  Edit2, 
  Power, 
  ExternalLink, 
  Send, 
  Check 
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()

const activeTab = ref('families')
const families = ref([])
const users = ref([])
const loadingFamilies = ref(false)
const loadingUsers = ref(false)

// Global SMTP State
const smtpConfig = reactive({
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

// Quota Modal
const showQuotaModal = ref(false)
const selectedFamily = ref(null)
const editQuotaValue = ref(10)

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
      Object.assign(smtpConfig, data)
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

const openEditQuotaModal = (fam) => {
  selectedFamily.value = fam
  editQuotaValue.value = fam.maxMembers
  showQuotaModal.value = true
}

const handleSaveQuota = async () => {
  if (!selectedFamily.value) return
  try {
    const res = await fetch(`/api/super-admin/families/${selectedFamily.value._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ maxMembers: editQuotaValue.value })
    })
    if (res.ok) {
      showQuotaModal.value = false
      await fetchFamilies()
    }
  } catch (err) {
    console.error('Erreur handleSaveQuota', err)
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
      smtpMessage.value = '✓ Configuration SMTP enregistrée avec succès !'
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
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
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
</style>
