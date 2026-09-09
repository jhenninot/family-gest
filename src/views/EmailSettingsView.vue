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

      <div class="header-badges">
        <span v-if="loading" class="status-badge loading">
          <Loader2 :size="14" class="spin" /> Chargement...
        </span>
        <span v-else-if="emailConfig.isConfigured" class="status-badge success">
          <CheckCircle2 :size="14" /> SMTP configuré
        </span>
        <span v-else class="status-badge warning">
          <AlertTriangle :size="14" /> SMTP non configuré
        </span>
      </div>
    </div>

    <!-- Admin Protection Warning if non-admin -->
    <div v-if="!authStore.isAdmin" class="alert-box danger">
      <ShieldAlert :size="20" />
      <div>
        <strong>Accès Restreint :</strong> Seul un utilisateur disposant du rôle <strong>Administrateur</strong> est autorisé à modifier les paramètres du système.
      </div>
    </div>

    <div v-else class="admin-body-wrapper">
      <!-- App Settings Card: Paramétrage de l'application -->
      <div class="card glass-card app-config-card">
        <div class="app-config-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Globe :size="20" class="title-icon-globe" /> Paramétrage de l'application
            </h2>
            <p class="section-subtitle">
              Adresse web globale de FamilyGest utilisée pour expédier les emails de bienvenue avec lien d'activation sécurisé (2h).
            </p>
          </div>
          <button 
            type="button" 
            @click="handleSave" 
            class="btn btn-primary btn-save-url"
            :disabled="saving"
          >
            <Save :size="15" />
            <span>{{ saving ? 'Enregistrement...' : 'Enregistrer les paramètres' }}</span>
          </button>
        </div>

        <div class="app-config-fields margin-top-md">
          <div class="form-group">
            <label class="input-label">URL du serveur / de l'application :</label>
            <div class="input-url-wrapper">
              <input 
                v-model="form.serverUrl" 
                type="text" 
                class="form-input" 
                placeholder="http://localhost:5173" 
                required 
              />
            </div>
            <span class="help-text">
              Exemple : <code>http://localhost:5173</code> (en local / développement), ou votre nom de domaine / adresse réseau (ex: <code>https://famille.mondomaine.fr</code>). Cette adresse sera insérée dans les emails de bienvenue pour que les nouveaux membres puissent définir leur mot de passe.
            </span>
          </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { 
  Mail, Settings, CheckCircle2, AlertTriangle, ShieldAlert, 
  Eye, EyeOff, Save, Send, HelpCircle, ShieldCheck, Loader2, AlertCircle, Globe
} from 'lucide-vue-next'

const authStore = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const sendingTest = ref(false)
const showPassword = ref(false)
const showTestModal = ref(false)
const testRecipient = ref('')
const testResult = ref(null)

const emailConfig = ref({
  isConfigured: false,
  hasPassword: false
})

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
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
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

onMounted(() => {
  if (authStore.isAdmin) {
    fetchEmailConfig()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
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

.header-badges {
  display: flex;
  gap: 0.5rem;
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
  gap: 0.4rem;
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
  background: var(--accent-indigo);
  color: white;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
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
  color: var(--accent-indigo);
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
</style>
