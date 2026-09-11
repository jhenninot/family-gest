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

    <!-- Family Switcher Dropdown -->
    <div class="family-switcher-section">
      <FamilySwitcher />
    </div>


    <!-- Navigation Menu -->
    <nav class="nav-menu">
      <router-link :to="getPath('')" class="nav-item" active-class="active">
        <LayoutDashboard :size="20" />
        <span>Tableau de bord</span>
      </router-link>

      <router-link :to="getPath('/tasks')" class="nav-item" active-class="active">
        <CheckSquare :size="20" />
        <span>Tâches</span>
        <span v-if="store.pendingTasksCount > 0" class="badge-count">{{ store.pendingTasksCount }}</span>
      </router-link>

      <router-link :to="getPath('/calendar')" class="nav-item" active-class="active">
        <Calendar :size="20" />
        <span>Calendrier</span>
        <span v-if="store.events.length > 0" class="badge-count info">{{ store.events.length }}</span>
      </router-link>

      <router-link :to="getPath('/absences')" class="nav-item" active-class="active">
        <HouseUser :size="20" />
        <span>Présence</span>
        <span v-if="store.todayAbsences.length > 0" class="badge-count warning" title="Absence(s) aujourd'hui">
          {{ store.todayAbsences.length }}
        </span>
      </router-link>

      <router-link :to="getPath('/shopping')" class="nav-item" active-class="active">
        <ShoppingCart :size="20" />
        <span>Liste de courses</span>
        <span v-if="store.pendingShoppingCount > 0" class="badge-count warning">{{ store.pendingShoppingCount }}</span>
      </router-link>

      <router-link v-if="store.isFamilyAdmin" :to="getPath('/settings/email')" class="nav-item admin-nav" active-class="active">
        <Settings :size="20" />
        <span>Administration</span>
      </router-link>

      <router-link v-if="authStore.isSuperAdmin" to="/super-admin" class="nav-item super-admin-nav" active-class="active">
        <ShieldAlert :size="20" />
        <span>Super Admin</span>
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
          v-if="store.isFamilyAdmin" 
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
            v-if="store.isFamilyAdmin" 
            @click.stop="openEditShortcutModal(item)" 
            class="shortcut-edit-btn-mini"
            title="Modifier / Supprimer ce raccourci"
          >
            <MoreVertical :size="13" />
          </button>
        </div>
      </div>

      <!-- Empty state for Admin -->
      <div v-else-if="store.isFamilyAdmin" class="shortcuts-empty-admin">
        <button @click="openAddShortcutModal" class="btn-create-first-shortcut">
          <Plus :size="13" />
          <span>Ajouter un raccourci</span>
        </button>
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
  ShieldAlert,
  Settings, 
  Globe, 
  Plus, 
  ExternalLink, 
  MoreVertical, 
  Trash2
} from '@lucide/vue'
import HouseUser from './icons/HouseUser.vue'
import FamilySwitcher from './FamilySwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()

const currentSlug = computed(() => store.currentFamily?.slug || localStorage.getItem('familygest_active_slug') || '')
const getPath = (sub) => currentSlug.value ? `/${currentSlug.value}${sub}` : (sub || '/')

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

.family-switcher-section {
  margin-bottom: 0.5rem;
}

.nav-item.super-admin-nav {
  color: #d97706;
  border: 1px dashed rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.05);
  margin-top: 0.25rem;
}

.nav-item.super-admin-nav:hover,
.nav-item.super-admin-nav.active {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
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



.help-subtext {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
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

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
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
  .family-widget {
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
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-bottom: 0.35rem;
    max-height: none;
    overflow: visible;
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

</style>
