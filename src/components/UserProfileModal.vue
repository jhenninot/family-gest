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

        <!-- Notifications Web Push sur cet appareil -->
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

        <!-- Notifications par Email -->
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
          <button type="button" @click="close" class="btn btn-secondary">Annuler</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="!saving">Enregistrer les modifications</span>
            <span v-else>Enregistrement...</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { ShieldCheck, Shield, Mail, Bell, BellOff } from '@lucide/vue'
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

const saving = ref(false)
const devicePushStatus = ref('default') // 'active', 'inactive', 'denied', 'unsupported'
const initialDeviceSubscribed = ref(false)

const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const editProfile = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  avatar: DEFAULT_AVATAR,
  color: '#6366f1',
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  usualPresence: 'present'
})

const close = () => {
  emit('update:modelValue', false)
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

  editProfile.value = {
    firstName: authStore.user.firstName || '',
    lastName: authStore.user.lastName || '',
    email: authStore.user.email || '',
    password: '',
    role: authStore.user.role || 'Membre',
    avatar: authStore.user.avatar || DEFAULT_AVATAR,
    color: authStore.user.color || '#6366f1',
    pushNotificationsEnabled: initialDeviceSubscribed.value,
    emailNotificationsEnabled: Boolean(authStore.user.emailNotificationsEnabled),
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
</style>
