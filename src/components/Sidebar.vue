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

      <router-link to="/budget" class="nav-item" active-class="active">
        <Wallet :size="20" />
        <span>Budget & Dépenses</span>
      </router-link>

      <router-link to="/shopping" class="nav-item" active-class="active">
        <ShoppingCart :size="20" />
        <span>Liste de Courses</span>
        <span v-if="store.pendingShoppingCount > 0" class="badge-count warning">{{ store.pendingShoppingCount }}</span>
      </router-link>
    </nav>

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

    <!-- Sidebar Footer / Dark mode & Logout -->
    <div class="sidebar-footer">
      <button @click="store.toggleTheme" class="theme-toggle-btn" :title="store.isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'">
        <Sun v-if="store.isDarkMode" :size="18" />
        <Moon v-else :size="18" />
        <span>{{ store.isDarkMode ? 'Mode Clair' : 'Mode Sombre' }}</span>
      </button>

      <button @click="handleLogout" class="logout-btn" title="Se déconnecter">
        <LogOut :size="18" />
        <span>Déconnexion</span>
      </button>
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
  Wallet, 
  ShoppingCart, 
  Sun, 
  Moon, 
  Sparkles,
  Award,
  LogOut,
  ShieldCheck,
  Shield,
  Edit3
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()

const showProfileModal = ref(false)
const saving = ref(false)

const avatarOptions = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👨‍🍳', '👵', '👴', '🐱', '🐶']
const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const editProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  avatar: '👨‍💼',
  color: '#6366f1'
})

const sortedMembers = computed(() => {
  return [...store.members].sort((a, b) => b.points - a.points)
})

const openProfileModal = () => {
  if (!authStore.user) return
  editProfile.value = {
    firstName: authStore.user.firstName || '',
    lastName: authStore.user.lastName || '',
    email: authStore.user.email || '',
    password: '',
    role: authStore.user.role || 'Membre',
    avatar: authStore.user.avatar || '👨‍💼',
    color: authStore.user.color || '#6366f1'
  }
  showProfileModal.value = true
}

const handleSaveProfile = async () => {
  saving.value = true
  const res = await authStore.updateProfile(editProfile.value)
  saving.value = false

  if (res.success) {
    showProfileModal.value = false
    await store.fetchAllData()
  } else {
    alert(res.error || 'Erreur lors de la mise à jour du profil')
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
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

/* Sidebar Footer */
.sidebar-footer {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-toggle-btn, .logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.6rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.logout-btn {
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.2);
  background: var(--accent-rose-light);
}

.logout-btn:hover {
  background: var(--accent-rose);
  color: white;
}

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
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

@media (max-width: 900px) {
  .sidebar {
    width: 100%;
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding: 1rem;
  }
  .family-widget, .user-profile-card {
    display: none;
  }
  .nav-menu {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }
  .nav-item span:not(.badge-count) {
    display: none;
  }
}
</style>
