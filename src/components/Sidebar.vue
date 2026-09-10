<template>
  <aside class="sidebar">
    <!-- App Logo / Brand -->
    <div class="brand">
      <div class="logo-icon">
        <Sparkles :size="24" class="sparkle" />
      </div>
      <div class="brand-text">
        <span class="brand-name">FamilyGest</span>
        <span class="brand-tag">Espace Familial</span>
      </div>
    </div>

    <!-- Logged in User Badge (Clickable to edit profile) -->
    <div 
      v-if="authStore.user" 
      @click="openProfileModal" 
      class="user-profile-card glass-card clickable"
      title="Cliquez pour modifier vos informations de profil"
    >
      <span class="user-avatar-emoji">{{ authStore.user.avatar || '👨‍💼' }}</span>
      <div class="user-profile-info">
        <div class="user-full-name">
          <span>{{ authStore.user.name || authStore.user.firstName }}</span>
          <span v-if="authStore.isAdmin" class="admin-badge" title="Compte Administrateur">
            <ShieldCheck :size="12" /> Admin
          </span>
        </div>
        <span class="user-email-text">{{ authStore.user.email }}</span>
      </div>
      <Edit3 :size="15" class="edit-profile-icon" />
    </div>

    <!-- Navigation Menu -->
    <nav class="nav-menu">
      <router-link to="/" class="nav-item" active-class="active">
        <LayoutDashboard :size="20" />
        <span>Tableau de bord</span>
      </router-link>

      <router-link to="/tasks" class="nav-item" active-class="active">
        <CheckSquare :size="20" />
        <span>Tâches & Corvées</span>
        <span v-if="store.pendingTasksCount > 0" class="badge-count">{{ store.pendingTasksCount }}</span>
      </router-link>

      <router-link to="/calendar" class="nav-item" active-class="active">
        <Calendar :size="20" />
        <span>Calendrier</span>
        <span v-if="store.events.length > 0" class="badge-count info">{{ store.events.length }}</span>
      </router-link>

      <router-link to="/absences" class="nav-item" active-class="active">
        <HouseUser :size="20" />
        <span>Présence & Invitations</span>
        <span v-if="store.todayAbsences.length > 0" class="badge-count warning" title="Absence(s) aujourd'hui">
          {{ store.todayAbsences.length }}
        </span>
      </router-link>


      <router-link to="/shopping" class="nav-item" active-class="active">
        <ShoppingCart :size="20" />
        <span>Liste de Courses</span>
        <span v-if="store.pendingShoppingCount > 0" class="badge-count warning">{{ store.pendingShoppingCount }}</span>
      </router-link>

      <router-link v-if="authStore.isAdmin" to="/settings/email" class="nav-item admin-nav" active-class="active">
        <Settings :size="20" />
        <span>Administration</span>
      </router-link>
    </nav>

    <!-- Shortcuts / Web Apps Section -->
    <div class="shortcuts-section">
      <div class="shortcuts-header">
        <div class="shortcuts-header-title">
          <Globe :size="15" class="shortcuts-title-icon" />
          <span>Raccourcis</span>
        </div>
        <button 
          v-if="authStore.isAdmin" 
          @click="openAddShortcutModal" 
          class="add-shortcut-btn-mini" 
          title="Ajouter un raccourci web (Administrateur)"
        >
          <Plus :size="13" />
        </button>
      </div>

      <!-- Shortcuts list -->
      <div v-if="store.shortcuts && store.shortcuts.length > 0" class="shortcuts-list">
        <div 
          v-for="item in store.shortcuts" 
          :key="item.id" 
          class="shortcut-item-row"
        >
          <a 
            :href="item.url" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="shortcut-nav-link"
            :title="`Ouvrir ${item.title} (${item.url})`"
          >
            <span class="shortcut-emoji">{{ item.icon || '🌐' }}</span>
            <span class="shortcut-text">{{ item.title }}</span>
            <ExternalLink :size="12" class="shortcut-ext-icon" />
          </a>
          <button 
            v-if="authStore.isAdmin" 
            @click.stop="openEditShortcutModal(item)" 
            class="shortcut-edit-btn-mini"
            title="Modifier / Supprimer ce raccourci"
          >
            <MoreVertical :size="13" />
          </button>
        </div>
      </div>

      <!-- Empty state for Admin -->
      <div v-else-if="authStore.isAdmin" class="shortcuts-empty-admin">
        <button @click="openAddShortcutModal" class="btn-create-first-shortcut">
          <Plus :size="13" />
          <span>Ajouter un raccourci</span>
        </button>
      </div>
    </div>

    <!-- Family Leaderboard Quick Widget -->
    <div class="family-widget glass-card">
      <div class="widget-header">
        <Award :size="16" class="trophy-icon" />
        <span>Classement Points</span>
      </div>
      <div class="members-mini-list">
        <div 
          v-for="member in sortedMembers" 
          :key="member.id" 
          class="member-mini-item"
        >
          <span class="member-avatar">{{ member.avatar }}</span>
          <div class="member-info">
            <span class="member-name">{{ member.name }}</span>
            <span class="member-role">{{ member.role }}</span>
          </div>
          <span class="member-points">{{ member.points }} pts</span>
        </div>
      </div>
    </div>

    <!-- Modal Modifier Mon Profil -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier Mes Informations</h3>
          <button @click="showProfileModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveProfile">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="editProfile.firstName" 
                type="text" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nom de famille</label>
              <input 
                v-model="editProfile.lastName" 
                type="text" 
                required 
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Adresse Email (Login)</label>
              <input 
                v-model="editProfile.email" 
                type="email" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nouveau Mot de passe (Optionnel)</label>
              <input 
                v-model="editProfile.password" 
                type="password" 
                placeholder="Laisser vide pour ne pas changer"
                class="form-input" 
              />
              <PasswordStrengthIndicator v-if="editProfile.password" :password="editProfile.password" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Rôle familial</label>
              <select v-model="editProfile.role" class="form-select">
                <option value="Papa">Papa</option>
                <option value="Maman">Maman</option>
                <option value="Fils">Fils</option>
                <option value="Fille">Fille</option>
                <option value="Grand-Parent">Grand-Parent</option>
                <option value="Oncle / Tante">Oncle / Tante</option>
                <option value="Baby-Sitter">Baby-Sitter</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Statut d'Administrateur</label>
              <div class="admin-status-box" :class="{ 'is-admin': authStore.isAdmin }">
                <ShieldCheck v-if="authStore.isAdmin" :size="16" />
                <Shield v-else :size="16" />
                <span>{{ authStore.isAdmin ? 'Administrateur' : 'Membre Standard' }}</span>
              </div>
              <span class="help-subtext">* Le statut d'administrateur ne peut être modifié que par un autre administrateur.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Présence habituelle à la maison</label>
            <select v-model="editProfile.usualPresence" class="form-select">
              <option value="present">🟢 Habituellement présent(e) (je signale mes absences)</option>
              <option value="absent">⚪ Habituellement absent(e) (je signale mes présences)</option>
            </select>
            <span class="help-subtext">
              Détermine si vous êtes comptabilisé(e) par défaut aux repas de famille et pour la nuit.
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Choisissez un Avatar</label>
            <div class="avatar-options">
              <button 
                v-for="emoji in avatarOptions" 
                :key="emoji"
                type="button"
                class="avatar-option-btn"
                :class="{ selected: editProfile.avatar === emoji }"
                @click="editProfile.avatar = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Couleur de profil</label>
            <div class="color-picker-options">
              <button 
                v-for="c in colorOptions" 
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: editProfile.color === c }"
                @click="editProfile.color = c"
              ></button>
            </div>
          </div>

          <!-- Case à cocher pour les notifications Web Push sur cet appareil -->
          <div class="form-group notif-profile-group">
            <label 
              class="notif-toggle-card" 
              :class="{ 
                'is-active': editProfile.pushNotificationsEnabled && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported',
                'is-disabled': devicePushStatus === 'denied' || devicePushStatus === 'unsupported' 
              }"
            >
              <input 
                type="checkbox" 
                v-model="editProfile.pushNotificationsEnabled" 
                :disabled="devicePushStatus === 'denied' || devicePushStatus === 'unsupported'"
                class="notif-hidden-input"
              />
              <div class="notif-toggle-icon">
                <Bell v-if="editProfile.pushNotificationsEnabled && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported'" :size="18" />
                <BellOff v-else :size="18" />
              </div>
              <div class="notif-toggle-details">
                <span class="notif-toggle-title">Notifications sur cet appareil</span>
                <span class="notif-toggle-subtitle">
                  <template v-if="devicePushStatus === 'denied'">
                    Bloquées par votre navigateur (à autoriser dans les réglages du site)
                  </template>
                  <template v-else-if="devicePushStatus === 'unsupported'">
                    Non disponibles sur ce navigateur
                  </template>
                  <template v-else-if="editProfile.pushNotificationsEnabled">
                    Actives sur ce navigateur (alertes directes)
                  </template>
                  <template v-else>
                    Inactives sur ce navigateur (cliquez pour activer)
                  </template>
                </span>
              </div>
              <div class="toggle-switch" :class="{ active: editProfile.pushNotificationsEnabled && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported' }">
                <span class="toggle-circle"></span>
              </div>
            </label>
          </div>

          <!-- Case à cocher pour les notifications par Email -->
          <div class="form-group notif-profile-group">
            <label class="notif-toggle-card" :class="{ 'is-active': editProfile.emailNotificationsEnabled }">
              <input 
                type="checkbox" 
                v-model="editProfile.emailNotificationsEnabled" 
                class="notif-hidden-input"
              />
              <div class="notif-toggle-icon notif-email-icon">
                <Mail :size="18" />
              </div>
              <div class="notif-toggle-details">
                <span class="notif-toggle-title">Notifications par Email</span>
                <span class="notif-toggle-subtitle">
                  Recevoir un récapitulatif par email pour chaque nouveauté
                </span>
              </div>
              <div class="toggle-switch" :class="{ active: editProfile.emailNotificationsEnabled }">
                <span class="toggle-circle"></span>
              </div>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showProfileModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="!saving">Enregistrer les modifications</span>
              <span v-else>Enregistrement...</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Gestion Raccourci Web / App (Admin) -->
    <div v-if="showShortcutModal" class="modal-overlay" @click.self="showShortcutModal = false">
      <div class="modal-content shortcut-modal-content">
        <div class="modal-header">
          <h3>{{ editingShortcutId ? 'Modifier le Raccourci' : 'Nouveau Raccourci Web / App' }}</h3>
          <button @click="showShortcutModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveShortcut">
          <div class="form-group">
            <label class="form-label">Nom du site ou de l'application</label>
            <input 
              v-model="shortcutForm.title" 
              type="text" 
              required 
              placeholder="Ex: Home Assistant, Plex, Pronote, Nextcloud..." 
              class="form-input" 
            />
          </div>

          <div class="form-group">
            <label class="form-label">Adresse URL</label>
            <input 
              v-model="shortcutForm.url" 
              type="text" 
              required 
              placeholder="Ex: http://192.168.1.50:8123 ou https://..." 
              class="form-input" 
            />
            <span class="help-subtext">Le lien s'ouvrira directement dans un nouvel onglet.</span>
          </div>

          <div class="form-group">
            <label class="form-label">Icône / Emoji rapide</label>
            <div class="emoji-picker-grid">
              <button 
                v-for="ico in shortcutIcons" 
                :key="ico"
                type="button"
                class="emoji-pick-btn"
                :class="{ selected: shortcutForm.icon === ico }"
                @click="shortcutForm.icon = ico"
              >
                {{ ico }}
              </button>
            </div>
            <div class="custom-emoji-row">
              <label class="form-label-sub">Ou emoji personnalisé :</label>
              <input 
                v-model="shortcutForm.icon" 
                type="text" 
                maxlength="5" 
                class="form-input emoji-text-input" 
                placeholder="Ex: 🚀" 
              />
            </div>
          </div>

          <div class="modal-footer flex-between">
            <button 
              v-if="editingShortcutId" 
              type="button" 
              @click="handleDeleteShortcut" 
              class="btn btn-danger btn-delete-shortcut"
              :disabled="savingShortcut"
            >
              <Trash2 :size="15" />
              <span>Supprimer</span>
            </button>
            <span v-else></span>

            <div class="modal-actions-right">
              <button type="button" @click="showShortcutModal = false" class="btn btn-secondary">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="savingShortcut">
                <span v-if="!savingShortcut">{{ editingShortcutId ? 'Enregistrer' : 'Ajouter le raccourci' }}</span>
                <span v-else>Enregistrement...</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  ShoppingCart, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  Shield, 
  Edit3, 
  Mail, 
  Settings, 
  Globe, 
  Plus, 
  ExternalLink, 
  MoreVertical, 
  Trash2, 
  Bell, 
  BellOff 
} from '@lucide/vue'
import HouseUser from './icons/HouseUser.vue'
import PasswordStrengthIndicator from './PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'
import { 
  subscribeUserToPush, 
  unsubscribeUserFromPush, 
  isDeviceSubscribedToPush, 
  isPushSupported, 
  getNotificationPermission 
} from '../utils/pushNotifications'

const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()

const showProfileModal = ref(false)
const saving = ref(false)
const devicePushStatus = ref('default') // 'active', 'inactive', 'denied', 'unsupported'
const initialDeviceSubscribed = ref(false)

const avatarOptions = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👨‍🍳', '👵', '👴', '🐱', '🐶']
const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const editProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  avatar: '👨‍💼',
  color: '#6366f1',
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  usualPresence: 'present'
})

const sortedMembers = computed(() => {
  return [...store.members].sort((a, b) => b.points - a.points)
})

const openProfileModal = async () => {
  if (!authStore.user) return

  // Vérification de la disponibilité et du statut réel sur cet appareil
  if (!isPushSupported()) {
    devicePushStatus.value = 'unsupported'
    initialDeviceSubscribed.value = false
  } else if (getNotificationPermission() === 'denied') {
    devicePushStatus.value = 'denied'
    initialDeviceSubscribed.value = false
  } else {
    const isSub = await isDeviceSubscribedToPush()
    initialDeviceSubscribed.value = isSub
    devicePushStatus.value = isSub ? 'active' : 'inactive'
  }

  editProfile.value = {
    firstName: authStore.user.firstName || '',
    lastName: authStore.user.lastName || '',
    email: authStore.user.email || '',
    password: '',
    role: authStore.user.role || 'Membre',
    avatar: authStore.user.avatar || '👨‍💼',
    color: authStore.user.color || '#6366f1',
    pushNotificationsEnabled: initialDeviceSubscribed.value,
    emailNotificationsEnabled: Boolean(authStore.user.emailNotificationsEnabled),
    usualPresence: authStore.user.usualPresence || 'present'
  }
  showProfileModal.value = true
}

const handleSaveProfile = async () => {
  if (editProfile.value.password && editProfile.value.password.trim().length > 0) {
    if (!isPasswordValid(editProfile.value.password.trim())) {
      alert(getPasswordErrorMessage(editProfile.value.password.trim()))
      return
    }
  }

  saving.value = true

  // Gestion de l'abonnement push spécifique à cet appareil
  if (isPushSupported() && devicePushStatus.value !== 'denied' && devicePushStatus.value !== 'unsupported') {
    if (editProfile.value.pushNotificationsEnabled && !initialDeviceSubscribed.value) {
      await subscribeUserToPush().catch(err => {
        console.warn('[WebPush] Erreur inscription push appareil:', err)
      })
    } else if (!editProfile.value.pushNotificationsEnabled && initialDeviceSubscribed.value) {
      await unsubscribeUserFromPush().catch(err => {
        console.warn('[WebPush] Erreur désabonnement push appareil:', err)
      })
    }
  }

  const res = await authStore.updateProfile(editProfile.value)
  saving.value = false

  if (res.success) {
    showProfileModal.value = false
    await store.fetchAllData()
  } else {
    alert(res.error || 'Erreur lors de la mise à jour du profil')
  }
}

// --- SHORTCUTS LOGIC ---
const showShortcutModal = ref(false)
const editingShortcutId = ref(null)
const savingShortcut = ref(false)

const shortcutIcons = ['🏠', '🎬', '🎵', '📚', '💾', '☁️', '🌐', '🔒', '🎮', '⚡', '📊', '🛒', '🛠️', '📧', '📺', '💡', '🤖', '📸']

const shortcutForm = ref({
  title: '',
  url: '',
  icon: '🌐'
})

const openAddShortcutModal = () => {
  editingShortcutId.value = null
  shortcutForm.value = {
    title: '',
    url: '',
    icon: '🏠'
  }
  showShortcutModal.value = true
}

const openEditShortcutModal = (shortcut) => {
  editingShortcutId.value = shortcut.id
  shortcutForm.value = {
    title: shortcut.title,
    url: shortcut.url,
    icon: shortcut.icon || '🌐'
  }
  showShortcutModal.value = true
}

const handleSaveShortcut = async () => {
  if (!shortcutForm.value.title || !shortcutForm.value.url) return
  savingShortcut.value = true

  if (editingShortcutId.value) {
    await store.updateShortcut(editingShortcutId.value, shortcutForm.value)
  } else {
    await store.addShortcut(shortcutForm.value)
  }

  savingShortcut.value = false
  showShortcutModal.value = false
}

const handleDeleteShortcut = async () => {
  if (!editingShortcutId.value) return
  if (confirm(`Voulez-vous vraiment supprimer le raccourci "${shortcutForm.value.title}" ?`)) {
    savingShortcut.value = true
    await store.deleteShortcut(editingShortcutId.value)
    savingShortcut.value = false
    showShortcutModal.value = false
  }
}

</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1.25rem;
  min-height: 100vh;
  gap: 1.25rem;
  transition: background-color var(--transition-normal);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.25rem 0.5rem;
}

.logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-glow);
}

.sparkle {
  animation: pulse 2s infinite alternate;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.9; }
  100% { transform: scale(1.15); opacity: 1; }
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

/* User Profile Badge */
.user-profile-card {
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  position: relative;
  transition: all var(--transition-fast);
}

.user-profile-card.clickable {
  cursor: pointer;
}

.user-profile-card.clickable:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.edit-profile-icon {
  margin-left: auto;
  color: var(--text-muted);
  opacity: 0.6;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.user-profile-card.clickable:hover .edit-profile-icon {
  opacity: 1;
  color: var(--accent-primary);
}

.user-avatar-emoji {
  font-size: 1.5rem;
}

.user-profile-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.user-full-name {
  font-size: 0.875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  line-height: 1.2;
}

.admin-badge {
  font-size: 0.65rem;
  font-weight: 800;
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.user-email-text {
  font-size: 0.725rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Nav Menu */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.925rem;
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
  color: white;
  box-shadow: var(--shadow-glow);
}

.badge-count {
  margin-left: auto;
  background: var(--accent-rose);
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
}

.badge-count.info { background: var(--accent-primary); }
.badge-count.warning { background: var(--accent-amber); }

/* Family Widget */
.family-widget {
  padding: 1rem;
  border-radius: var(--radius-md);
  margin-top: auto;
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.75rem;
}

.trophy-icon { color: var(--accent-amber); }

.members-mini-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.member-mini-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.member-avatar {
  font-size: 1.2rem;
  background: var(--bg-tertiary);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-name { font-size: 0.85rem; font-weight: 700; line-height: 1.2; }
.member-role { font-size: 0.725rem; color: var(--text-muted); }
.member-points { font-size: 0.8rem; font-weight: 800; color: var(--accent-primary); }


/* Modal styles */
.admin-status-box {
  padding: 0.6rem 0.85rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.admin-status-box.is-admin {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.3);
}

.help-subtext {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.avatar-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.avatar-option-btn {
  font-size: 1.5rem;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-option-btn.selected {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  transform: scale(1.1);
}

.color-picker-options { display: flex; gap: 0.5rem; }

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.color-btn.selected { border-color: var(--text-primary); transform: scale(1.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
/* Shortcuts Section */
.shortcuts-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.25rem;
  border-top: 1px solid var(--border-color);
}

.shortcuts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
}

.shortcuts-header-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.shortcuts-title-icon {
  color: var(--accent-primary);
}

.add-shortcut-btn-mini {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-shortcut-btn-mini:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
  transform: scale(1.08);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.shortcut-item-row {
  display: flex;
  align-items: center;
  position: relative;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.shortcut-item-row:hover {
  background: var(--bg-tertiary);
}

.shortcut-nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0.65rem;
  flex: 1;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: color var(--transition-fast);
}

.shortcut-nav-link:hover {
  color: var(--accent-primary);
}

.shortcut-emoji {
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
}

.shortcut-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.shortcut-ext-icon {
  color: var(--text-muted);
  opacity: 0.5;
  margin-left: auto;
  flex-shrink: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.shortcut-nav-link:hover .shortcut-ext-icon {
  opacity: 1;
  color: var(--accent-primary);
}

.shortcut-edit-btn-mini {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 0.4rem;
  margin-right: 0.25rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast);
}

.shortcut-item-row:hover .shortcut-edit-btn-mini {
  opacity: 0.7;
}

.shortcut-edit-btn-mini:hover {
  opacity: 1 !important;
  color: var(--accent-primary);
  background: var(--bg-card);
}

.shortcuts-empty-admin {
  padding: 0.25rem 0.5rem;
}

.btn-create-first-shortcut {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-create-first-shortcut:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}

/* Shortcut Modal Styles */
.shortcut-modal-content {
  max-width: 480px;
}

.emoji-picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.emoji-pick-btn {
  font-size: 1.35rem;
  height: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.emoji-pick-btn:hover {
  background: var(--bg-card);
  transform: scale(1.1);
  border-color: var(--accent-primary);
}

.emoji-pick-btn.selected {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  transform: scale(1.12);
  box-shadow: 0 0 0 2px var(--accent-primary);
}

.custom-emoji-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-label-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.emoji-text-input {
  width: 70px;
  text-align: center;
  font-size: 1.15rem;
  padding: 0.35rem;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.modal-actions-right {
  display: flex;
  gap: 0.75rem;
}

.btn-danger {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  border: 1px solid rgba(244, 63, 94, 0.3);
  padding: 0.55rem 0.9rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all var(--transition-fast);
}

.btn-danger:hover {
  background: var(--accent-rose);
  color: white;
}

@media (max-width: 900px) {
  .sidebar {
    width: 100%;
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 1rem;
    gap: 0.75rem;
  }
  .family-widget, .user-profile-card {
    display: none;
  }
  .nav-menu {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    gap: 0.5rem;
  }
  .nav-item span:not(.badge-count) {
    display: none;
  }

  /* Shortcuts Mobile */
  .shortcuts-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem 0 0.25rem 0;
    border-top: 1px solid var(--border-color);
  }

  .shortcuts-header {
    padding: 0 0.25rem;
  }

  .shortcuts-list {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 0.5rem;
    padding-bottom: 0.35rem;
    max-height: none;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }

  .shortcut-item-row {
    flex-shrink: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
  }

  .shortcut-nav-link {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
    gap: 0.45rem;
  }

  .shortcut-ext-icon {
    display: none;
  }

  .shortcut-edit-btn-mini {
    opacity: 0.7;
    padding: 0.35rem;
  }
}

/* Notification Toggle in Profile Modal */
.notif-profile-group {
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.notif-toggle-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.notif-toggle-card:hover {
  background: var(--bg-card-hover, var(--bg-secondary));
  border-color: rgba(99, 102, 241, 0.4);
}

.notif-toggle-card.is-active {
  border-color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.08);
}

.notif-toggle-card.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
  pointer-events: none;
}

.notif-hidden-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.notif-toggle-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.notif-toggle-card.is-active .notif-toggle-icon {
  background: var(--accent-primary-light, rgba(99, 102, 241, 0.15));
  color: var(--accent-primary, #6366f1);
  border-color: var(--accent-primary, #6366f1);
}

.notif-toggle-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.notif-toggle-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.notif-toggle-subtitle {
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.3;
}

.toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 9999px;
  background: var(--border-color);
  position: relative;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.toggle-switch.active {
  background: var(--accent-primary, #6366f1);
}

.toggle-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: all var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-switch.active .toggle-circle {
  transform: translateX(20px);
}
</style>
