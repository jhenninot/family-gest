<template>
  <div class="page-container">
    <!-- View Header -->
    <div class="view-header">
      <div>
        <h1 class="page-title">
          <Settings :size="28" class="title-icon" /> Administration du Système
        </h1>
        <p class="page-subtitle">
          Configurez l'adresse d'accès au serveur et le compte d'envoi d'emails (SMTP) pour les invitations et notifications.
        </p>
      </div>

      <div class="header-right-actions">
        <button 
          v-if="store.isFamilyAdmin" 
          type="button" 
          @click="handleExportData" 
          class="btn btn-secondary btn-header-export"
          :disabled="exporting"
          title="Exporter l'ensemble des données de la famille au format JSON"
        >
          <Download v-if="!exporting" :size="18" />
          <Loader2 v-else :size="18" class="spin" />
          <span>{{ exporting ? 'Exportation...' : 'Exporter les données (JSON)' }}</span>
        </button>

        <button 
          v-if="store.isFamilyAdmin" 
          type="button" 
          @click="openAddMemberModal" 
          class="btn btn-primary btn-header-add-member"
          :disabled="isQuotaReached"
          :title="isQuotaReached ? 'Quota maximum de membres atteint' : 'Inviter un membre'"
        >
          <UserPlus :size="18" />
          <span>+ Inviter un Membre ({{ store.members.length }} / {{ store.currentFamilyQuota?.maxMembers || 10 }})</span>
        </button>

        <div class="header-badges">
          <span v-if="loading" class="status-badge loading">
            <Loader2 :size="14" class="spin" /> Chargement...
          </span>
          <span v-else-if="emailConfig.isConfigured" class="status-badge success">
            <CheckCircle2 :size="14" /> SMTP familial dédié
          </span>
          <span v-else-if="emailConfig.isUsingGlobalFallback" class="status-badge info">
            <Globe :size="14" /> SMTP global actif
          </span>
          <span v-else class="status-badge warning">
            <AlertTriangle :size="14" /> Aucun SMTP configuré
          </span>
        </div>
      </div>
    </div>

    <!-- Admin Protection Warning if non-admin -->
    <div v-if="!store.isFamilyAdmin" class="alert-box danger">
      <ShieldAlert :size="20" />
      <div>
        <strong>Accès Restreint :</strong> Seul un utilisateur disposant du rôle <strong>Administrateur de cette famille</strong> est autorisé à modifier ces paramètres.
      </div>
    </div>

    <div v-else class="admin-body-wrapper">
      <!-- Export Data Card: Sauvegarde et Export des données -->
      <div class="card glass-card export-config-card">
        <div class="export-config-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Download :size="20" class="title-icon-export" /> Sauvegarde et Export des données
            </h2>
            <p class="section-subtitle">
              Exportez l'ensemble des données de votre famille (utilisateurs avec mots de passe, liste de courses, catégories ordonnées, tâches, absences, invités, raccourcis et événements) au format JSON pour sauvegarde ou pour importation.
            </p>
          </div>
          <button 
            type="button" 
            @click="handleExportData" 
            class="btn btn-primary btn-export-data"
            :disabled="exporting"
          >
            <Download v-if="!exporting" :size="16" />
            <Loader2 v-else :size="16" class="spin" />
            <span>{{ exporting ? 'Exportation en cours...' : 'Télécharger l\'export (JSON)' }}</span>
          </button>
        </div>
      </div>

      <!-- Shopping Categories Card: Catégories de courses -->
      <div class="card glass-card shopping-cats-card margin-top-lg">
        <div class="shopping-cats-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <ShoppingCart :size="20" class="title-icon-shopping" /> Catégories de courses
            </h2>
            <p class="section-subtitle">
              Personnalisez les rayons de courses et réorganisez leur ordre d'affichage par simple glisser-déposer. Le rang numérique détermine l'ordre d'apparition dans la liste de courses.
            </p>
          </div>
          <button 
            type="button" 
            @click="openAddCategoryModal" 
            class="btn btn-primary btn-add-category"
          >
            <Plus :size="16" />
            <span>+ Nouvelle Catégorie</span>
          </button>
        </div>

        <!-- Categories List with Drag and Drop -->
        <div class="categories-dnd-list margin-top-md">
          <div v-if="!store.shoppingCategories || store.shoppingCategories.length === 0" class="empty-cats-notice">
            Aucune catégorie configurée. Cliquez sur « + Nouvelle Catégorie » pour en ajouter.
          </div>

          <div
            v-for="(cat, index) in sortedCategories"
            :key="cat.id"
            class="cat-drag-item"
            :class="{
              'is-dragging': draggedIndex === index,
              'drag-target-over': dragOverIndex === index
            }"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @dragleave="handleDragLeave(index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <!-- Drag handle -->
            <div class="drag-handle-wrapper" title="Glisser pour réorganiser l'ordre">
              <svg class="drag-handle-svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="2"/>
                <circle cx="9" cy="12" r="2"/>
                <circle cx="9" cy="19" r="2"/>
                <circle cx="15" cy="5" r="2"/>
                <circle cx="15" cy="12" r="2"/>
                <circle cx="15" cy="19" r="2"/>
              </svg>
            </div>

            <!-- Rank Badge -->
            <div class="cat-rank-badge" title="Rang d'affichage">
              Rang #{{ cat.rank }}
            </div>

            <!-- Icon -->
            <span class="cat-icon-tag">{{ cat.icon }}</span>

            <!-- Name -->
            <span class="cat-name-text">{{ cat.name }}</span>

            <!-- Quick move buttons (accessible alternative) -->
            <div class="cat-arrows-wrapper">
              <button 
                type="button" 
                class="btn-arrow-move" 
                :disabled="index === 0" 
                @click="moveCategory(index, -1)" 
                title="Monter le rang"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                type="button" 
                class="btn-arrow-move" 
                :disabled="index === sortedCategories.length - 1" 
                @click="moveCategory(index, 1)" 
                title="Descendre le rang"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Action buttons: Edit & Delete -->
            <div class="cat-item-actions">
              <button 
                type="button" 
                @click="openEditCategoryModal(cat)" 
                class="btn-cat-action edit" 
                title="Modifier la catégorie"
              >
                <Pencil :size="15" />
              </button>
              <button 
                type="button" 
                @click="confirmDeleteCategory(cat)" 
                class="btn-cat-action delete" 
                title="Supprimer la catégorie"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="dnd-hint-footer margin-top-sm">
          💡 <em>Astuce : Attrapez une catégorie par sa poignée ⠿ et glissez-la vers le haut ou vers le bas pour ajuster immédiatement son rang numérique d'affichage.</em>
        </div>
      </div>

      <div class="settings-grid">
      <!-- Left Column: Preset Selection & Configuration Form -->
      <div class="card glass-card form-card">
        <h2 class="section-title">
          <Settings :size="20" /> Paramètres du Compte Expediteur
        </h2>

        <!-- Preset Selection Tabs -->
        <div class="presets-wrapper">
          <label class="input-label">Fournisseur de Service Email :</label>
          <div class="preset-buttons">
            <button 
              @click="applyPreset('gmail')" 
              class="preset-btn" 
              :class="{ active: form.providerPreset === 'gmail' }"
            >
              <span class="preset-icon red">G</span>
              <span>Gmail (Google)</span>
            </button>

            <button 
              @click="applyPreset('outlook')" 
              class="preset-btn" 
              :class="{ active: form.providerPreset === 'outlook' }"
            >
              <span class="preset-icon blue">M</span>
              <span>Outlook / Office 365</span>
            </button>

            <button 
              @click="applyPreset('yahoo')" 
              class="preset-btn" 
              :class="{ active: form.providerPreset === 'yahoo' }"
            >
              <span class="preset-icon purple">Y</span>
              <span>Yahoo Mail</span>
            </button>

            <button 
              @click="applyPreset('custom')" 
              class="preset-btn" 
              :class="{ active: form.providerPreset === 'custom' }"
            >
              <span class="preset-icon gray">⚙️</span>
              <span>Serveur Personnalisé</span>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleSave" class="email-form">
          <div class="form-grid">
            <!-- Host & Port -->
            <div class="form-group col-8">
              <label class="input-label">Serveur d'envoi (SMTP) :</label>
              <input 
                v-model="form.host" 
                type="text" 
                class="form-input" 
                placeholder="smtp.gmail.com" 
                required 
              />
            </div>

            <div class="form-group col-4">
              <label class="input-label">Port :</label>
              <input 
                v-model.number="form.port" 
                type="number" 
                class="form-input" 
                placeholder="587" 
                required 
              />
            </div>

            <!-- Connection Security -->
            <div class="form-group col-12 checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.secure" />
                <span>Utiliser une connexion sécurisée SSL/TLS directe (Port 465)</span>
              </label>
              <span class="help-text">Décochez pour STARTTLS (Port standard 587 pour Gmail et Outlook)</span>
            </div>

            <!-- Email & Password -->
            <div class="form-group col-6">
              <label class="input-label">Adresse Email (Login) :</label>
              <input 
                v-model="form.user" 
                type="email" 
                class="form-input" 
                placeholder="votre.famille@gmail.com" 
                required 
              />
            </div>

            <div class="form-group col-6">
              <label class="input-label">
                Mot de passe / Pass Application :
                <span v-if="emailConfig.hasPassword" class="badge-saved">✓ Enregistré</span>
              </label>
              <div class="password-input-wrapper">
                <input 
                  v-model="form.pass" 
                  :type="showPassword ? 'text' : 'password'" 
                  class="form-input" 
                  :placeholder="emailConfig.hasPassword ? '•••••••••••••••• (Inchangé)' : 'Mot de passe ou pass d\'app'" 
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword" 
                  class="btn-toggle-password"
                  title="Afficher/Masquer le mot de passe"
                >
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
            </div>

            <!-- Sender Info -->
            <div class="form-group col-6">
              <label class="input-label">Nom d'affichage de l'expéditeur :</label>
              <input 
                v-model="form.fromName" 
                type="text" 
                class="form-input" 
                placeholder="Famille Gest" 
              />
            </div>

            <div class="form-group col-6">
              <label class="input-label">Adresse email d'expédition (Optionnel) :</label>
              <input 
                v-model="form.fromEmail" 
                type="email" 
                class="form-input" 
                placeholder="Laisser vide pour utiliser le login" 
              />
            </div>
          </div>

          <!-- Form Action Buttons -->
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="saving">
              <Save v-if="!saving" :size="18" />
              <Loader2 v-else :size="18" class="spin" />
              <span>{{ saving ? 'Enregistrement...' : 'Enregistrer la Configuration' }}</span>
            </button>

            <button 
              type="button" 
              @click="openTestModal" 
              class="btn-secondary" 
              :disabled="!emailConfig.isConfigured && !form.pass"
            >
              <Send :size="18" />
              <span>Tester l'Envoi d'Email</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Right Column: Instructions & Tips -->
      <div class="card glass-card info-card">
        <h2 class="section-title">
          <HelpCircle :size="20" /> Guide de Configuration Gmail & IMAP/SMTP
        </h2>

        <div class="info-content">
          <div class="guide-box">
            <h4><span class="icon-bubble red">G</span> Configuration d'un compte Gmail :</h4>
            <p>Pour des raisons de sécurité, Google requiert un <strong>Mot de Passe d'Application</strong> (App Password) :</p>
            <ol class="steps-list">
              <li>Activez la <strong>Validation en 2 étapes</strong> sur votre compte Google.</li>
              <li>Rendez-vous dans la section <em>Sécurité &gt; Mots de passe d'application</em>.</li>
              <li>Générez un mot de passe dédié (16 caractères) pour FamilyGest.</li>
              <li>Collez ce code à 16 lettres dans le champ <strong>Mot de passe / Pass Application</strong> ci-contre.</li>
            </ol>
          </div>

          <div class="guide-box">
            <h4><span class="icon-bubble blue">M</span> Configuration Outlook / Office 365 :</h4>
            <p>Utilisez le serveur <code>smtp.office365.com</code> sur le port <code>587</code> (SSL/TLS décoché).</p>
          </div>

          <div class="security-note">
            <ShieldCheck :size="18" />
            <span>Vos identifiants email sont chiffrés et stockés en toute sécurité dans votre base de données locale FamilyGest.</span>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Modal Envoi Email de Test -->
    <div v-if="showTestModal" class="modal-overlay" @click.self="showTestModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Envoyer un Email de Test</h3>
          <button @click="showTestModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSendTest" class="modal-body">
          <p class="modal-description">
            Saisissez une adresse email à laquelle vous avez accès pour vérifier que la connexion au serveur d'envoi fonctionne.
          </p>

          <div class="form-group">
            <label class="input-label">Adresse email destinataire :</label>
            <input 
              v-model="testRecipient" 
              type="email" 
              class="form-input" 
              placeholder="votre.email@exemple.com" 
              required 
            />
          </div>

          <div v-if="testResult" class="test-result-box" :class="testResult.success ? 'success' : 'error'">
            <CheckCircle2 v-if="testResult.success" :size="18" />
            <AlertCircle v-else :size="18" />
            <span>{{ testResult.message }}</span>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showTestModal = false" class="btn-ghost">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="sendingTest">
              <Send v-if="!sendingTest" :size="16" />
              <Loader2 v-else :size="16" class="spin" />
              <span>{{ sendingTest ? 'Envoi du message...' : 'Envoyer l\'email' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Ajouter un Membre (Administrateur Uniquement) -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Inviter un Membre dans la Famille</h3>
          <button @click="showAddMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddMember">
          <div class="form-group">
            <label class="form-label">Adresse Email du membre</label>
            <input 
              v-model="newMember.email" 
              @blur="checkMemberEmail" 
              type="email" 
              required 
              placeholder="ex: membre@exemple.fr"
              class="form-input" 
            />
            <div v-if="memberCheck.checked" class="email-check-info margin-top-xs">
              <span v-if="memberCheck.exists" class="text-info font-semibold">
                ℹ️ Compte existant détecté ({{ memberCheck.user?.firstName }} {{ memberCheck.user?.lastName }}). Une invitation lui sera envoyée pour rattacher votre famille à son compte.
              </span>
              <span v-else class="text-muted font-semibold">
                ℹ️ Nouveau compte : une invitation contenant un lien d'activation sécurisé lui permettra de créer son mot de passe.
              </span>
            </div>
          </div>

          <div v-if="!memberCheck.checked || !memberCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="newMember.firstName" 
                type="text" 
                required 
                placeholder="ex: Lucas..."
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nom de famille</label>
              <input 
                v-model="newMember.lastName" 
                type="text" 
                required 
                placeholder="ex: Martin..."
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Rôle familial</label>
              <select v-model="newMember.role" class="form-select">
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
              <label class="form-label">Statut d'Accès</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="newMember.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>Administrateur de cette famille</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Présence habituelle à la maison</label>
            <select v-model="newMember.usualPresence" class="form-select">
              <option value="present">🟢 Habituellement présent(e) (signale des absences)</option>
              <option value="absent">⚪ Habituellement absent(e) (signale des présences)</option>
            </select>
          </div>

          <div v-if="!memberCheck.checked || !memberCheck.exists">
            <div class="form-group">
              <label class="form-label">Avatar ou Photo</label>
              <AvatarPicker 
                v-model="newMember.avatar" 
                :color="newMember.color" 
                :name="`${newMember.firstName} ${newMember.lastName}`"
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
                  :class="{ selected: newMember.color === c }"
                  @click="newMember.color = c"
                ></button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddMemberModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="addingMember">
              {{ addingMember ? 'Envoi en cours...' : 'Envoyer l\'invitation' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Ajouter / Modifier une Catégorie de courses -->
    <div v-if="showCatModal" class="modal-overlay" @click.self="showCatModal = false">
      <div class="modal-content modal-cat-content">
        <div class="modal-header">
          <h3>{{ isEditingCat ? 'Modifier la Catégorie' : 'Ajouter une Catégorie de courses' }}</h3>
          <button @click="showCatModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveCategory">
          <div class="form-group">
            <label class="form-label">Nom de la catégorie *</label>
            <input 
              v-model="catForm.name" 
              type="text" 
              required 
              placeholder="ex: Boucherie, Surgelés, Bio..."
              class="form-input" 
              autofocus
            />
          </div>

          <div class="form-group">
            <label class="form-label">Icône / Emoji :</label>
            <div class="cat-icon-selector">
              <input 
                v-model="catForm.icon" 
                type="text" 
                maxlength="4" 
                class="form-input icon-preview-input" 
                placeholder="🛒" 
              />
              <span class="icon-help">Sélectionnez ci-dessous ou saisissez un emoji :</span>
            </div>
            
            <div class="emoji-preset-grid">
              <button 
                v-for="emoji in categoryEmojiPresets" 
                :key="emoji"
                type="button"
                class="emoji-pick-btn"
                :class="{ active: catForm.icon === emoji }"
                @click="catForm.icon = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showCatModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditingCat ? 'Enregistrer les modifications' : 'Créer la catégorie' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Confirmation Suppression Catégorie -->
    <div v-if="catToDelete" class="modal-overlay" @click.self="catToDelete = null">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>Supprimer la catégorie</h3>
          <button @click="catToDelete = null" class="btn-close">&times;</button>
        </div>
        <p class="confirm-text">
          Voulez-vous vraiment supprimer la catégorie <strong>« {{ catToDelete.icon }} {{ catToDelete.name }} »</strong> ?<br>
          Les articles de courses existants seront conservés.
        </p>
        <div class="modal-footer">
          <button type="button" @click="catToDelete = null" class="btn btn-secondary">Annuler</button>
          <button type="button" @click="executeDeleteCategory" class="btn btn-danger">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.vue'
import AvatarPicker from '../components/AvatarPicker.vue'
import { DEFAULT_AVATAR } from '../utils/avatarHelper'
import { 
  Mail, Settings, CheckCircle2, AlertTriangle, ShieldAlert, 
  Eye, EyeOff, Save, Send, HelpCircle, ShieldCheck, Loader2, AlertCircle, Globe,
  UserPlus, Download
} from 'lucide-vue-next'
import { ShoppingCart, Plus, Pencil, Trash2 } from '@lucide/vue'

const authStore = useAuthStore()
const store = useFamilyStore()

// --- Catégories de courses ---
const categoryEmojiPresets = [
  '🧀', '🥫', '🥦', '🥖', '🧃', '🏠', '🛒', '🥩', '🐟', '🍎',
  '🧼', '🧴', '📦', '☕', '🍰', '🍕', '🍼', '🍬', '🧹', '💊',
  '🍞', '❄️', '🥚', '🍝', '🍪'
]

const sortedCategories = computed(() => {
  return [...store.shoppingCategories].sort((a, b) => a.rank - b.rank)
})

const showCatModal = ref(false)
const isEditingCat = ref(false)
const catForm = ref({ id: null, name: '', icon: '🛒' })
const catToDelete = ref(null)

const draggedIndex = ref(null)
const dragOverIndex = ref(null)

const openAddCategoryModal = () => {
  isEditingCat.value = false
  catForm.value = { id: null, name: '', icon: '🛒' }
  showCatModal.value = true
}

const openEditCategoryModal = (cat) => {
  isEditingCat.value = true
  catForm.value = { id: cat.id, name: cat.name, icon: cat.icon }
  showCatModal.value = true
}

const handleSaveCategory = async () => {
  if (!catForm.value.name.trim()) return
  if (isEditingCat.value) {
    await store.updateShoppingCategory(catForm.value.id, {
      name: catForm.value.name.trim(),
      icon: catForm.value.icon.trim() || '🛒'
    })
  } else {
    await store.addShoppingCategory({
      name: catForm.value.name.trim(),
      icon: catForm.value.icon.trim() || '🛒'
    })
  }
  showCatModal.value = false
}

const confirmDeleteCategory = (cat) => {
  catToDelete.value = cat
}

const executeDeleteCategory = async () => {
  if (catToDelete.value) {
    await store.deleteShoppingCategory(catToDelete.value.id)
    catToDelete.value = null
  }
}

// Glisser-déposer (Drag & Drop)
const handleDragStart = (e, index) => {
  draggedIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', index)
}

const handleDragOver = (e, index) => {
  e.preventDefault()
  dragOverIndex.value = index
}

const handleDragLeave = (index) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

const handleDrop = async (e, targetIndex) => {
  e.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }

  const list = [...sortedCategories.value]
  const [movedItem] = list.splice(draggedIndex.value, 1)
  list.splice(targetIndex, 0, movedItem)

  const payload = list.map((cat, idx) => ({
    id: cat.id,
    rank: idx + 1
  }))

  await store.reorderShoppingCategories(payload)

  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const moveCategory = async (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= sortedCategories.value.length) return
  const list = [...sortedCategories.value]
  const temp = list[index]
  list[index] = list[targetIndex]
  list[targetIndex] = temp

  const payload = list.map((cat, idx) => ({
    id: cat.id,
    rank: idx + 1
  }))

  await store.reorderShoppingCategories(payload)
}

const showAddMemberModal = ref(false)
const addingMember = ref(false)

const isQuotaReached = computed(() => {
  const max = store.currentFamilyQuota?.maxMembers || 10
  return store.members.length >= max
})

const avatarOptions = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👨‍🍳', '👵', '👴', '🐱', '🐶']
const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const newMember = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: 'Membre',
  isAdmin: false,
  avatar: DEFAULT_AVATAR,
  color: '#6366f1',
  usualPresence: 'present'
})

const memberCheck = ref({
  checked: false,
  exists: false,
  user: null
})

const openAddMemberModal = () => {
  newMember.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'Membre',
    isAdmin: false,
    avatar: DEFAULT_AVATAR,
    color: '#6366f1',
    usualPresence: 'present'
  }
  memberCheck.value = {
    checked: false,
    exists: false,
    user: null
  }
  showAddMemberModal.value = true
}

const checkMemberEmail = async () => {
  if (!newMember.value.email || !newMember.value.email.includes('@')) {
    memberCheck.value.checked = false
    return
  }
  const res = await store.checkEmailInFamily(newMember.value.email)
  memberCheck.value.checked = true
  memberCheck.value.exists = res.exists
  memberCheck.value.user = res.user
  if (res.exists && res.user) {
    newMember.value.firstName = res.user.firstName || ''
    newMember.value.lastName = res.user.lastName || ''
    newMember.value.avatar = res.user.avatar || DEFAULT_AVATAR
    newMember.value.color = res.user.color || '#6366f1'
  }
}

const handleAddMember = async () => {
  if (!newMember.value.email.trim()) return

  addingMember.value = true
  try {
    const result = await store.inviteMember(newMember.value)
    if (result.success) {
      showAddMemberModal.value = false
      alert(memberCheck.value.exists 
        ? `✅ L'utilisateur ${newMember.value.firstName || ''} a été invité à rejoindre votre famille !` 
        : `✅ Une invitation a été envoyée par email à ${newMember.value.email} !`
      )
    } else {
      alert(result.error || "Erreur lors de l'invitation du membre")
    }
  } finally {
    addingMember.value = false
  }
}

const loading = ref(true)
const saving = ref(false)
const sendingTest = ref(false)
const showPassword = ref(false)
const showTestModal = ref(false)
const testRecipient = ref('')
const testResult = ref(null)

const emailConfig = ref({
  isConfigured: false,
  isUsingGlobalFallback: false,
  hasPassword: false
})

const getSettingsHeaders = () => {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authStore.token}`
  }
  const slug = store.currentFamily?.slug || localStorage.getItem('familygest_active_slug')
  if (slug) h['X-Family-Slug'] = slug
  return h
}

const form = ref({
  serverUrl: 'http://localhost:5173',
  providerPreset: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '',
  pass: '',
  fromName: 'FamilyGest',
  fromEmail: ''
})

const presets = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  yahoo: { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
  custom: { host: '', port: 587, secure: false }
}

const applyPreset = (presetName) => {
  form.value.providerPreset = presetName
  if (presets[presetName]) {
    if (presets[presetName].host) form.value.host = presets[presetName].host
    form.value.port = presets[presetName].port
    form.value.secure = presets[presetName].secure
  }
}

const fetchEmailConfig = async () => {
  loading.value = true
  try {
    const res = await fetch('/api/settings/email', {
      headers: getSettingsHeaders()
    })
    const data = await res.json()
    if (res.ok) {
      emailConfig.value = data
      form.value.serverUrl = data.serverUrl || 'http://localhost:5173'
      form.value.providerPreset = data.providerPreset || 'gmail'
      form.value.host = data.host || 'smtp.gmail.com'
      form.value.port = data.port || 587
      form.value.secure = Boolean(data.secure)
      form.value.user = data.user || ''
      form.value.fromName = data.fromName || 'FamilyGest'
      form.value.fromEmail = data.fromEmail || ''
      form.value.pass = ''
    }
  } catch (err) {
    console.error('Erreur lors du chargement de la config email:', err)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await fetch('/api/settings/email', {
      method: 'POST',
      headers: getSettingsHeaders(),
      body: JSON.stringify(form.value)
    })
    const data = await res.json()
    if (res.ok) {
      emailConfig.value = data
      form.value.pass = ''
      alert('✅ Paramètres enregistrés avec succès !')
    } else {
      alert(data.error || 'Erreur lors de l\'enregistrement de la configuration')
    }
  } catch (err) {
    alert('Erreur réseau lors de la sauvegarde : ' + err.message)
  } finally {
    saving.value = false
  }
}

const openTestModal = () => {
  testRecipient.value = authStore.user?.email || form.value.user || ''
  testResult.value = null
  showTestModal.value = true
}

const handleSendTest = async () => {
  if (!testRecipient.value.trim()) return
  sendingTest.value = true
  testResult.value = null

  try {
    // Save first if there is an unsaved password
    if (form.value.pass) {
      await handleSave()
    }

    const res = await fetch('/api/settings/email/test', {
      method: 'POST',
      headers: getSettingsHeaders(),
      body: JSON.stringify({ recipientEmail: testRecipient.value.trim() })
    })

    const data = await res.json()
    if (res.ok) {
      testResult.value = { success: true, message: data.message }
    } else {
      testResult.value = { success: false, message: data.error || 'Échec de l\'envoi de l\'email de test' }
    }
  } catch (err) {
    testResult.value = { success: false, message: 'Erreur réseau : ' + err.message }
  } finally {
    sendingTest.value = false
  }
}

// --- Export des données de la famille ---
const exporting = ref(false)

const handleExportData = async () => {
  exporting.value = true
  try {
    const res = await fetch('/api/admin/export', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erreur lors de l\'export des données')
    }
    const data = await res.json()
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `familygest-export-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    alert(`Erreur : ${err.message}`)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  if (store.isFamilyAdmin) {
    fetchEmailConfig()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.page-container {
  --accent-indigo: var(--accent-primary, #6366f1);
  padding: 2rem;
  max-width: 1300px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.title-icon {
  color: var(--accent-indigo);
}

.page-subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-header-add-member {
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
}

.header-badges {
  display: flex;
  gap: 0.5rem;
}

.admin-checkbox-card {
  display: flex;
  align-items: center;
  padding: 0.6rem 0.85rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: 0.2rem;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: 0.6rem;
  font-size: 0.85rem;
}

.welcome-email-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.8rem 1rem;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.22);
  color: var(--text-secondary);
  font-size: 0.825rem;
  line-height: 1.45;
  margin-bottom: 1.25rem;
}

.avatar-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

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

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.success {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.status-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.status-badge.loading {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.alert-box {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  margin-bottom: 1.5rem;
}

.alert-box.danger {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.admin-body-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.app-config-card {
  padding: 1.5rem 1.75rem;
}

.app-config-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.title-icon-globe {
  color: var(--accent-indigo, #6366f1);
}

.btn-save-url {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-primary, #6366f1), var(--accent-purple, #8b5cf6));
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
}

.btn-save-url:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.btn-save-url:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-url-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.input-url-wrapper .form-input {
  flex: 1;
  font-family: monospace;
  font-size: 0.95rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
}

@media (max-width: 992px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .app-config-header {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-save-url {
    width: 100%;
    justify-content: center;
  }
}

.card {
  padding: 1.75rem;
  border-radius: var(--radius-xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 1.25rem;
}

/* Presets */
.presets-wrapper {
  margin-bottom: 1.5rem;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  border-radius: var(--radius-md);
  color: var(--text-color);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: var(--accent-indigo);
  transform: translateY(-1px);
}

.preset-btn.active {
  border-color: var(--accent-indigo);
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-indigo);
}

.preset-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.75rem;
  color: white;
}

.preset-icon.red { background: #ea4335; }
.preset-icon.blue { background: #0078d4; }
.preset-icon.purple { background: #6001d2; }
.preset-icon.gray { background: #64748b; }

/* Form layout */
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.25rem;
}

.col-12 { grid-column: span 12; }
.col-8 { grid-column: span 8; }
.col-6 { grid-column: span 6; }
.col-4 { grid-column: span 4; }

@media (max-width: 640px) {
  .col-8, .col-6, .col-4 { grid-column: span 12; }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.input-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-color);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-indigo);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 2.75rem;
}

.btn-toggle-password {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.checkbox-group {
  margin-top: 0.25rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
  cursor: pointer;
}

.help-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-left: 1.5rem;
}

.badge-saved {
  font-size: 0.75rem;
  color: #10b981;
  font-weight: 600;
  margin-left: 0.5rem;
}

/* Actions */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-primary, #6366f1), var(--accent-purple, #8b5cf6));
  color: #ffffff !important;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-primary, #6366f1);
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Right Info Card */
.info-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.guide-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: var(--radius-lg);
}

.guide-box h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: var(--text-color);
}

.icon-bubble {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
}

.icon-bubble.red { background: #ea4335; }
.icon-bubble.blue { background: #0078d4; }

.guide-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.steps-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.steps-list li {
  margin-bottom: 0.4rem;
}

.security-note {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  font-size: 0.82rem;
  line-height: 1.4;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  padding: 1.5rem;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-description {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.test-result-box {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem;
  border-radius: var(--radius-md);
  margin-top: 1rem;
  font-size: 0.88rem;
}

.test-result-box.success {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.test-result-box.error {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-ghost {
  background: none;
  border: none;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  padding: 0.6rem 1rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Shopping Categories Card */
.shopping-cats-card {
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.shopping-cats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.title-icon-shopping {
  color: var(--accent-amber, #f59e0b);
}

.btn-add-category {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.categories-dnd-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.empty-cats-notice {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.cat-drag-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
  cursor: default;
  user-select: none;
}

.cat-drag-item:hover {
  border-color: var(--border-color-hover, rgba(99, 102, 241, 0.4));
  background: var(--bg-secondary);
}

.cat-drag-item.is-dragging {
  opacity: 0.4;
  border: 2px dashed var(--accent-primary, #6366f1);
  transform: scale(0.98);
}

.cat-drag-item.drag-target-over {
  border-color: var(--accent-primary, #6366f1);
  background: var(--accent-primary-light, rgba(99, 102, 241, 0.12));
  box-shadow: 0 0 0 2px var(--accent-primary, #6366f1);
}

.drag-handle-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: grab;
  padding: 0.35rem 0.2rem;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.drag-handle-wrapper:active {
  cursor: grabbing;
}

.drag-handle-wrapper:hover {
  color: var(--accent-primary, #6366f1);
}

.drag-handle-svg {
  flex-shrink: 0;
}

.cat-rank-badge {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-primary, #6366f1);
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  min-width: 4.8rem;
  text-align: center;
  flex-shrink: 0;
}

.cat-icon-tag {
  font-size: 1.35rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  flex-shrink: 0;
}

.cat-name-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.cat-arrows-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex-shrink: 0;
}

.btn-arrow-move {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.35rem;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all var(--transition-fast);
}

.btn-arrow-move:hover:not(:disabled) {
  color: var(--accent-primary, #6366f1);
  border-color: var(--accent-primary, #6366f1);
  background: rgba(99, 102, 241, 0.1);
}

.btn-arrow-move:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.cat-item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-cat-action {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.4rem;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-cat-action.edit:hover {
  color: var(--accent-primary, #6366f1);
  border-color: var(--accent-primary, #6366f1);
  background: rgba(99, 102, 241, 0.1);
}

.btn-cat-action.delete:hover {
  color: var(--accent-rose, #f43f5e);
  border-color: var(--accent-rose, #f43f5e);
  background: rgba(244, 63, 94, 0.1);
}

.dnd-hint-footer {
  font-size: 0.8rem;
  color: var(--text-muted);
  padding-left: 0.25rem;
}

/* Modal Catégories */
.modal-cat-content {
  max-width: 480px;
}

.cat-icon-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.icon-preview-input {
  width: 60px;
  text-align: center;
  font-size: 1.35rem;
  padding: 0.4rem;
}

.icon-help {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.emoji-preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  background: var(--bg-tertiary);
  padding: 0.65rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  max-height: 140px;
  overflow-y: auto;
}

.emoji-pick-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 1.25rem;
  width: 2.35rem;
  height: 2.35rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.emoji-pick-btn:hover {
  transform: scale(1.15);
  border-color: var(--accent-primary, #6366f1);
}

.emoji-pick-btn.active {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--accent-primary, #6366f1);
  transform: scale(1.1);
}

/* Export Config Card */
.export-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.title-icon-export {
  color: var(--accent-indigo, #6366f1);
}

.btn-export-data {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
  cursor: pointer;
}
</style>
