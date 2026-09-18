<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="close">
    <div class="modal-content profile-modal-content">
      <div class="modal-header">
        <h3>Modifier Mes Informations</h3>
        <button type="button" @click="close" class="btn-close">&times;</button>
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
            <label class="form-label">Statut dans cette famille</label>
            <div class="admin-status-box" :class="{ 'is-admin': store.isFamilyAdmin }">
              <ShieldCheck v-if="store.isFamilyAdmin" :size="16" />
              <Shield v-else :size="16" />
              <span>{{ store.isFamilyAdmin ? 'Administrateur de la famille' : 'Membre Standard' }}</span>
            </div>
            <span class="help-subtext">* Ce statut administrateur ne s'applique qu'à cet espace familial.</span>
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

        <!-- Sélecteur d'Avatar & Import de Photo -->
        <div class="form-group">
          <label class="form-label">Avatar ou Photo de profil</label>
          <AvatarPicker 
            v-model="editProfile.avatar" 
            :color="editProfile.color" 
            :name="`${editProfile.firstName} ${editProfile.lastName}`"
          />
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

        <!-- Notifications Web Push sur cet appareil (abonnement du navigateur, indépendant des
             préférences par catégorie ci-dessous : sans abonnement actif, aucune des alertes
             "Push" ne peut être délivrée à cet appareil) -->
        <div class="form-group notif-profile-group">
          <label
            class="notif-toggle-card"
            :class="{
              'is-active': editProfile.deviceSubscribed && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported',
              'is-disabled': devicePushStatus === 'denied' || devicePushStatus === 'unsupported'
            }"
          >
            <input
              type="checkbox"
              v-model="editProfile.deviceSubscribed"
              :disabled="devicePushStatus === 'denied' || devicePushStatus === 'unsupported'"
              class="notif-hidden-input"
            />
            <div class="notif-toggle-icon">
              <Bell v-if="editProfile.deviceSubscribed && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported'" :size="18" />
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
                <template v-else-if="editProfile.deviceSubscribed">
                  Actives sur ce navigateur (alertes directes)
                </template>
                <template v-else>
                  Inactives sur ce navigateur (cliquez pour activer)
                </template>
              </span>
            </div>
            <div class="toggle-switch" :class="{ active: editProfile.deviceSubscribed && devicePushStatus !== 'denied' && devicePushStatus !== 'unsupported' }">
              <span class="toggle-circle"></span>
            </div>
          </label>
        </div>

        <!-- Préférences de notification granulaires : 5 catégories x 2 canaux -->
        <div class="form-group notif-profile-group">
          <span class="notif-grid-label">Que voulez-vous recevoir, et par quel canal ?</span>
          <p v-if="devicePushStatus === 'denied' || devicePushStatus === 'unsupported'" class="notif-push-hint">
            Les notifications push nécessitent que les notifications soient activées sur cet appareil (ci-dessus).
          </p>
          <div class="notif-prefs-grid">
            <div class="notif-prefs-header">
              <span></span>
              <span class="notif-prefs-col-label"><Bell :size="14" /> Push</span>
              <span class="notif-prefs-col-label"><Mail :size="14" /> Email</span>
            </div>
            <div v-for="cat in NOTIFICATION_CATEGORIES" :key="cat.key" class="notif-prefs-row">
              <span class="notif-prefs-row-label">{{ cat.label }}</span>
              <label class="notif-prefs-checkbox" :class="{ 'is-disabled': devicePushStatus === 'denied' || devicePushStatus === 'unsupported' }">
                <input
                  type="checkbox"
                  v-model="editProfile.notificationPreferences[cat.key].push"
                  :disabled="devicePushStatus === 'denied' || devicePushStatus === 'unsupported'"
                />
              </label>
              <label class="notif-prefs-checkbox">
                <input type="checkbox" v-model="editProfile.notificationPreferences[cat.key].email" />
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="close" class="btn btn-secondary">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="!saving">Enregistrer les modifications</span>
            <span v-else>Enregistrement...</span>
          </button>
        </div>
      </form>

      <!-- Confidentialité & RGPD : accès/portabilité et droit à l'effacement, en self-service -->
      <div class="gdpr-section">
        <span class="notif-grid-label">Confidentialité &amp; données personnelles</span>

        <div class="gdpr-legal-links">
          <a href="/mentions-legales" target="_blank" rel="noopener">Mentions légales</a>
          <span aria-hidden="true">&bull;</span>
          <a href="/confidentialite" target="_blank" rel="noopener">Politique de confidentialité</a>
        </div>

        <button type="button" class="btn-gdpr-action" :disabled="exporting" @click="handleExportData">
          <Download :size="16" />
          <span>{{ exporting ? 'Export en cours...' : 'Exporter mes données (JSON)' }}</span>
        </button>

        <div v-if="!showDeleteConfirm" class="gdpr-danger-zone">
          <button type="button" class="btn-gdpr-danger" @click="showDeleteConfirm = true">
            <Trash2 :size="16" />
            <span>Supprimer définitivement mon compte</span>
          </button>
        </div>

        <div v-else class="gdpr-delete-confirm">
          <p class="gdpr-warning-text">
            <AlertTriangle :size="15" />
            Cette action est <strong>définitive et irréversible</strong> : votre compte et vos
            appartenances aux familles seront supprimés. Confirmez avec votre mot de passe.
          </p>
          <input
            v-model="deletePassword"
            type="password"
            placeholder="Votre mot de passe"
            class="form-input"
            @keyup.enter="handleDeleteAccount"
          />
          <span v-if="deleteError" class="gdpr-error-text">{{ deleteError }}</span>
          <div class="gdpr-confirm-actions">
            <button type="button" class="btn btn-secondary" @click="cancelDelete">Annuler</button>
            <button type="button" class="btn-gdpr-danger" :disabled="deleting" @click="handleDeleteAccount">
              {{ deleting ? 'Suppression...' : 'Confirmer la suppression' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { ShieldCheck, Shield, Mail, Bell, BellOff, Download, Trash2, AlertTriangle } from '@lucide/vue'
import AvatarPicker from './AvatarPicker.vue'
import PasswordStrengthIndicator from './PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'
import { DEFAULT_AVATAR } from '../utils/avatarHelper'
import { 
  subscribeUserToPush, 
  unsubscribeUserFromPush, 
  isDeviceSubscribedToPush, 
  isPushSupported, 
  getNotificationPermission 
} from '../utils/pushNotifications'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const store = useFamilyStore()
const router = useRouter()

const saving = ref(false)
const exporting = ref(false)
const showDeleteConfirm = ref(false)
const deletePassword = ref('')
const deleteError = ref('')
const deleting = ref(false)
const devicePushStatus = ref('default') // 'active', 'inactive', 'denied', 'unsupported'
const initialDeviceSubscribed = ref(false)

const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const NOTIFICATION_CATEGORIES = [
  { key: 'presence', label: 'Présences, absences & invités aux repas' },
  { key: 'meals', label: 'Repas' },
  { key: 'tasks', label: 'Tâches' },
  { key: 'events', label: 'Événements' },
  { key: 'digest', label: 'Récapitulatif quotidien' }
]

const defaultNotificationPreferences = () => ({
  presence: { push: true, email: false },
  meals: { push: true, email: false },
  tasks: { push: true, email: false },
  events: { push: true, email: false },
  digest: { push: false, email: true }
})

const editProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  avatar: DEFAULT_AVATAR,
  color: '#6366f1',
  // État local uniquement (abonnement du navigateur) : jamais envoyé à PUT /api/auth/profile.
  deviceSubscribed: false,
  notificationPreferences: defaultNotificationPreferences(),
  usualPresence: 'present'
})

const close = () => {
  cancelDelete()
  emit('update:modelValue', false)
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletePassword.value = ''
  deleteError.value = ''
}

const handleExportData = async () => {
  exporting.value = true
  const res = await authStore.exportMyData()
  exporting.value = false

  if (!res.success) {
    alert(res.error || 'Erreur lors de l\'export de vos données')
    return
  }

  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `familygest-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const handleDeleteAccount = async () => {
  if (!deletePassword.value) {
    deleteError.value = 'Veuillez saisir votre mot de passe'
    return
  }

  deleting.value = true
  deleteError.value = ''
  const res = await authStore.deleteMyAccount(deletePassword.value)
  deleting.value = false

  if (!res.success) {
    deleteError.value = res.error || 'Erreur lors de la suppression du compte'
    return
  }

  close()
  router.push({ name: 'login' })
}

const loadUserData = async () => {
  if (!authStore.user) return

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

  const storedPrefs = authStore.user.notificationPreferences
  const notificationPreferences = defaultNotificationPreferences()
  if (storedPrefs && typeof storedPrefs === 'object') {
    for (const cat of NOTIFICATION_CATEGORIES) {
      if (storedPrefs[cat.key]) {
        notificationPreferences[cat.key] = {
          push: Boolean(storedPrefs[cat.key].push),
          email: Boolean(storedPrefs[cat.key].email)
        }
      }
    }
  }

  editProfile.value = {
    firstName: authStore.user.firstName || '',
    lastName: authStore.user.lastName || '',
    email: authStore.user.email || '',
    password: '',
    role: authStore.user.role || 'Membre',
    avatar: authStore.user.avatar || DEFAULT_AVATAR,
    color: authStore.user.color || '#6366f1',
    deviceSubscribed: initialDeviceSubscribed.value,
    notificationPreferences,
    usualPresence: authStore.user.usualPresence || 'present'
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadUserData()
  }
}, { immediate: true })

const handleSaveProfile = async () => {
  if (editProfile.value.password && editProfile.value.password.trim().length > 0) {
    if (!isPasswordValid(editProfile.value.password.trim())) {
      alert(getPasswordErrorMessage(editProfile.value.password.trim()))
      return
    }
  }

  saving.value = true

  if (isPushSupported() && devicePushStatus.value !== 'denied' && devicePushStatus.value !== 'unsupported') {
    if (editProfile.value.deviceSubscribed && !initialDeviceSubscribed.value) {
      await subscribeUserToPush().catch(err => {
        console.warn('[WebPush] Erreur inscription push appareil:', err)
      })
    } else if (!editProfile.value.deviceSubscribed && initialDeviceSubscribed.value) {
      await unsubscribeUserFromPush().catch(err => {
        console.warn('[WebPush] Erreur désabonnement push appareil:', err)
      })
    }
  }

  // deviceSubscribed est un état local (abonnement du navigateur), jamais transmis au serveur.
  const { deviceSubscribed, ...profilePayload } = editProfile.value
  const res = await authStore.updateProfile(profilePayload)
  saving.value = false

  if (res.success) {
    close()
    await store.fetchAllData()
  } else {
    alert(res.error || 'Erreur lors de la mise à jour du profil')
  }
}
</script>

<style scoped>
.profile-modal-content {
  max-width: 550px;
}

.admin-status-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.admin-status-box.is-admin {
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.3);
  background: var(--accent-rose-light);
}

.help-subtext {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}



/* Color picker */
.color-picker-options {
  display: flex;
  gap: 0.5rem;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.color-btn.selected {
  border-color: var(--text-primary);
  transform: scale(1.15);
}

/* Notification Toggles */
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
  background: var(--accent-primary-light, rgba(99, 102, 241, 0.08));
}

.notif-toggle-card.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Notification Preferences Grid */
.notif-grid-label {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.notif-push-hint {
  font-size: 0.76rem;
  color: var(--text-secondary);
  margin: 0 0 0.6rem 0;
}

.notif-prefs-grid {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
}

.notif-prefs-header,
.notif-prefs-row {
  display: grid;
  grid-template-columns: 1fr 56px 56px;
  align-items: center;
  gap: 0.5rem;
}

.notif-prefs-header {
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.2rem;
}

.notif-prefs-col-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.notif-prefs-row {
  padding: 0.5rem 0;
}

.notif-prefs-row:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.notif-prefs-row-label {
  font-size: 0.82rem;
  color: var(--text-primary);
}

.notif-prefs-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.notif-prefs-checkbox.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notif-prefs-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-primary, #6366f1);
  cursor: inherit;
}

/* Confidentialité & RGPD */
.gdpr-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.btn-gdpr-action,
.btn-gdpr-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  width: fit-content;
}

.btn-gdpr-action {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn-gdpr-action:hover:not(:disabled) {
  border-color: var(--accent-primary, #6366f1);
  color: var(--text-primary);
}

.btn-gdpr-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-gdpr-danger {
  background: var(--accent-rose-light, rgba(244, 63, 94, 0.1));
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--accent-rose, #f43f5e);
}

.btn-gdpr-danger:hover:not(:disabled) {
  background: var(--accent-rose, #f43f5e);
  color: #ffffff;
}

.btn-gdpr-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gdpr-delete-confirm {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  background: var(--accent-rose-light, rgba(244, 63, 94, 0.06));
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: var(--radius-md);
}

.gdpr-warning-text {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.gdpr-warning-text svg {
  flex-shrink: 0;
  color: var(--accent-rose, #f43f5e);
  margin-top: 0.1rem;
}

.gdpr-error-text {
  font-size: 0.78rem;
  color: var(--accent-rose, #f43f5e);
  font-weight: 600;
}

.gdpr-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.gdpr-legal-links {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.gdpr-legal-links a {
  color: var(--text-secondary);
  text-decoration: none;
}

.gdpr-legal-links a:hover {
  color: var(--accent-primary);
  text-decoration: underline;
}

.gdpr-legal-links span {
  color: var(--text-muted);
}
</style>
