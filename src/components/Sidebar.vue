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

    <!-- Logged in User Badge -->
    <div v-if="authStore.user" class="user-profile-card glass-card">
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
  </aside>
</template>

<script setup>
import { computed } from 'vue'
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
  ShieldCheck 
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()

const sortedMembers = computed(() => {
  return [...store.members].sort((a, b) => b.points - a.points)
})

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
}

.user-avatar-emoji {
  font-size: 1.5rem;
}

.user-profile-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
