<template>
  <div class="super-admin-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-badge">
          <ShieldAlert :size="16" />
          <span>{{ t('superAdmin.header.badge') }}</span>
        </div>
        <h1 class="page-title">{{ t('superAdmin.header.title') }}</h1>
        <p class="page-subtitle">{{ t('superAdmin.header.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <button @click="openImportFamilyModal()" class="btn btn-secondary">
          <Upload :size="18" />
          <span>{{ t('superAdmin.header.import') }}</span>
        </button>
        <button @click="openCreateFamilyModal" class="btn btn-primary">
          <Plus :size="18" />
          <span>{{ t('superAdmin.header.createFamily') }}</span>
        </button>
        <button @click="goToDashboard" class="btn btn-secondary">
          <ArrowLeft :size="18" />
          <span>{{ t('superAdmin.header.back') }}</span>
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
        <span>{{ t('superAdmin.tabs.families', { n: families.length }) }}</span>
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'users' }" 
        @click="activeTab = 'users'"
      >
        <Users :size="18" />
        <span>{{ t('superAdmin.tabs.users', { n: users.length }) }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'smtp' }"
        @click="activeTab = 'smtp'"
      >
        <Globe :size="18" />
        <span>{{ t('superAdmin.tabs.smtp') }}</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'alerts' }"
        @click="activeTab = 'alerts'"
      >
        <Bell :size="18" />
        <span>{{ t('superAdmin.tabs.alerts') }}</span>
      </button>
    </div>

    <!-- TAB 1: FAMILIES -->
    <div v-if="activeTab === 'families'" class="tab-content">
      <div v-if="loadingFamilies" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('superAdmin.families.loading') }}</p>
      </div>

      <div v-else class="families-list-container glass-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('superAdmin.families.cols.name') }}</th>
              <th>{{ t('superAdmin.families.cols.slug') }}</th>
              <th>{{ t('superAdmin.families.cols.members') }}</th>
              <th>{{ t('superAdmin.families.cols.status') }}</th>
              <th>{{ t('superAdmin.families.cols.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="fam in families" :key="fam._id">
              <td class="cell-primary" :data-label="t('superAdmin.families.labels.family')">
                <strong>{{ fam.name }}</strong>
              </td>
              <td class="cell-slug" :data-label="t('superAdmin.families.labels.slug')">
                <code>/{{ fam.slug }}</code>
              </td>
              <td :data-label="t('superAdmin.families.labels.members')">
                <span class="quota-pill">
                  {{ t('superAdmin.families.quota', { n: fam.memberCount || 0, max: fam.maxMembers }) }}
                </span>
              </td>
              <td :data-label="t('superAdmin.families.labels.status')">
                <span class="status-pill" :class="{ active: fam.isActive, inactive: !fam.isActive }">
                  {{ fam.isActive ? t('superAdmin.families.active') : t('superAdmin.families.inactive') }}
                </span>
              </td>
              <td class="cell-actions" :data-label="t('superAdmin.families.cols.actions')">
                <button 
                  @click="openAddAdminModal(fam)" 
                  class="btn-icon btn-icon-sm text-indigo" 
                  :title="t('superAdmin.families.addAdmin')"
                >
                  <UserPlus :size="16" />
                </button>
                <button 
                  @click="openEditFamilyModal(fam)" 
                  class="btn-icon btn-icon-sm text-indigo" 
                  :title="t('superAdmin.families.edit')"
                >
                  <Edit2 :size="16" />
                </button>
                <button 
                  @click="toggleFamilyActive(fam)" 
                  class="btn-icon btn-icon-sm" 
                  :class="{ 'text-danger': fam.isActive, 'text-success': !fam.isActive }"
                  :title="fam.isActive ? t('superAdmin.families.deactivate') : t('superAdmin.families.activate')"
                >
                  <Power :size="16" />
                </button>
                <button 
                  @click="openImportFamilyModal(fam)" 
                  class="btn-icon btn-icon-sm text-amber" 
                  :title="t('superAdmin.families.importInto')"
                >
                  <Upload :size="16" />
                </button>
                <button 
                  @click="switchAndGo(fam.slug)" 
                  class="btn-icon btn-icon-sm text-primary" 
                  :title="t('superAdmin.families.open')"
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
        <p>{{ t('superAdmin.users.loading') }}</p>
      </div>

      <div v-else class="users-list-container glass-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('superAdmin.users.cols.user') }}</th>
              <th>{{ t('superAdmin.users.cols.email') }}</th>
              <th>{{ t('superAdmin.users.cols.globalRole') }}</th>
              <th>{{ t('superAdmin.users.cols.families') }}</th>
              <th>{{ t('superAdmin.families.cols.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id || u._id">
              <td :data-label="t('superAdmin.users.cols.user')">
                <div class="user-cell">
                  <UserAvatar :avatar="u.avatar" :name="u.firstName" size="sm" />
                  <div>
                    <strong>{{ u.firstName }} {{ u.lastName }}</strong>
                  </div>
                </div>
              </td>
              <td class="cell-email" :data-label="t('superAdmin.users.cols.email')">{{ u.email }}</td>
              <td :data-label="t('superAdmin.users.cols.globalRole')">
                <span v-if="u.isSuperAdmin" class="role-pill super-admin-role">
                  <ShieldAlert :size="14" /> {{ t('superAdmin.users.superAdmin') }}
                </span>
                <span v-else class="role-pill standard-user-role">
                  {{ t('superAdmin.users.standardUser') }}
                </span>
              </td>
              <td :data-label="t('superAdmin.users.labels.families')">
                <div class="family-tags">
                  <span 
                    v-for="f in u.families" 
                    :key="f.slug || f.familyId" 
                    class="family-tag"
                    :class="{ 'admin-tag': f.isAdmin }"
                  >
                    <ShieldCheck v-if="f.isAdmin" :size="12" class="tag-icon" />
                    {{ f.name }} <small>({{ translateValue('role', f.role) }})</small>
                    <button 
                      v-if="!u.isSuperAdmin"
                      type="button"
                      @click="toggleUserFamilyAdmin(u, f)" 
                      class="tag-toggle-btn"
                      :title="f.isAdmin ? t('superAdmin.users.demoteTitle') : t('superAdmin.users.promoteTitle')"
                    >
                      {{ f.isAdmin ? '👑 ' + t('superAdmin.users.demote') : '⭐ ' + t('superAdmin.users.promote') }}
                    </button>
                  </span>
                  <span v-if="!u.families || u.families.length === 0" class="text-muted">
                    {{ t('superAdmin.users.noFamily') }}
                  </span>
                </div>
              </td>
              <td class="cell-actions" :data-label="t('superAdmin.families.cols.actions')">
                <button 
                  @click="openManageUserModal(u)" 
                  class="btn-icon btn-icon-sm text-indigo" 
                  :title="t('superAdmin.users.manage')"
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
          <h3>{{ t('superAdmin.smtp.title') }}</h3>
          <p>
            {{ t('superAdmin.smtp.intro') }}
          </p>
        </div>

        <form @submit.prevent="saveGlobalSmtp" class="smtp-form">
          <!-- Section URL Publique de la plateforme -->
          <div class="form-group margin-bottom-lg">
            <label class="form-label">
              <strong>{{ t('superAdmin.smtp.serverUrl') }}</strong>
            </label>
            <input
              v-model="smtpConfig.serverUrl"
              type="text"
              :placeholder="t('superAdmin.smtp.serverUrlPlaceholder')"
              class="form-input"
              required
            />
            <span class="help-subtext">
              <i18n-t keypath="superAdmin.smtp.serverUrlHelp" tag="span"><template #example1><code>https://famille.mondomaine.fr</code></template><template #example2><code>http://localhost:5000</code></template></i18n-t>
            </span>
          </div>

          <div class="separator-divider"></div>
          <h4 class="sub-section-title margin-top-md">{{ t('superAdmin.smtp.serverTitle') }}</h4>

          <div class="form-group margin-bottom-lg">
            <label class="form-label">{{ t('superAdmin.smtp.provider') }}</label>
            <div class="smtp-preset-buttons">
              <button
                type="button"
                @click="applyGlobalSmtpPreset('gmail')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'gmail' }"
              >
                Gmail
              </button>
              <button
                type="button"
                @click="applyGlobalSmtpPreset('outlook')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'outlook' }"
              >
                Outlook
              </button>
              <button
                type="button"
                @click="applyGlobalSmtpPreset('brevo-smtp')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'brevo-smtp' }"
              >
                Brevo (SMTP)
              </button>
              <button
                type="button"
                @click="applyGlobalSmtpPreset('brevo-api')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'brevo-api' }"
              >
                Brevo (API)
              </button>
              <button
                type="button"
                @click="applyGlobalSmtpPreset('resend')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'resend' }"
              >
                Resend
              </button>
              <button
                type="button"
                @click="applyGlobalSmtpPreset('custom')"
                class="smtp-preset-btn"
                :class="{ active: smtpConfig.providerPreset === 'custom' }"
              >
                {{ t('superAdmin.smtp.custom') }}
              </button>
            </div>
            <span v-if="smtpConfig.providerPreset === 'resend'" class="help-subtext">
              <i18n-t keypath="superAdmin.smtp.help.resend" tag="span"><template #site><code>resend.com</code></template><template #user><code>resend</code></template><template #key><code>re_xxxxxxxxx</code></template></i18n-t>
            </span>
            <span v-if="smtpConfig.providerPreset === 'brevo-smtp'" class="help-subtext">
              <i18n-t keypath="superAdmin.smtp.help.brevoSmtp" tag="span"><template #site><code>brevo.com</code></template><template #smtpKey><strong>{{ t('superAdmin.smtp.help.smtpKey') }}</strong></template></i18n-t>
            </span>
            <span v-if="smtpConfig.providerPreset === 'brevo-api'" class="help-subtext">
              <i18n-t keypath="superAdmin.smtp.help.brevoApi" tag="span"><template #apiKey><strong>{{ t('superAdmin.smtp.help.apiKey') }}</strong></template><template #prefix><code>xkeysib-...</code></template></i18n-t>
            </span>
          </div>

          <div class="grid-2" v-if="smtpConfig.providerPreset !== 'brevo-api'">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.smtp.host') }}</label>
              <input
                v-model="smtpConfig.host"
                type="text"
                :placeholder="t('superAdmin.smtp.hostPlaceholder')"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.smtp.port') }}</label>
              <input
                v-model.number="smtpConfig.port"
                type="number"
                :placeholder="t('superAdmin.smtp.portPlaceholder')"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="grid-2" v-if="smtpConfig.providerPreset !== 'brevo-api'">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.smtp.user') }}</label>
              <input
                v-model="smtpConfig.user"
                type="text"
                :placeholder="t('superAdmin.smtp.userPlaceholder')"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.smtp.password') }}</label>
              <input
                v-model="smtpConfig.password"
                type="password"
                :placeholder="t('superAdmin.smtp.passwordPlaceholder')"
                class="form-input"
              />
            </div>
          </div>
          <div class="form-group margin-bottom-lg" v-else>
            <label class="form-label">{{ t('superAdmin.smtp.brevoKey') }}</label>
            <input
              v-model="smtpConfig.password"
              type="password"
              placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              class="form-input"
              required
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.smtp.from') }}</label>
              <input
                v-model="smtpConfig.from"
                type="email"
                :placeholder="t('superAdmin.smtp.fromPlaceholder')"
                class="form-input"
                required
              />
            </div>
            <div class="form-group flex-center-y" v-if="smtpConfig.providerPreset !== 'brevo-api'">
              <label class="checkbox-container">
                <input v-model="smtpConfig.secure" type="checkbox" />
                <span class="checkmark"></span>
                <span>{{ t('superAdmin.smtp.secure') }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.smtp.testRecipient') }}</label>
            <input 
              v-model="testRecipient" 
              type="email" 
              :placeholder="t('superAdmin.smtp.testRecipientPlaceholder')" 
              class="form-input" 
            />
            <span class="help-subtext">{{ t('superAdmin.smtp.testRecipientHelp') }}</span>
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
              <span>{{ testingSmtp ? t('superAdmin.smtp.testing') : t('superAdmin.smtp.test') }}</span>
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="savingSmtp || testingSmtp"
            >
              <Check :size="16" />
              <span>{{ savingSmtp ? t('common.saving') : t('superAdmin.smtp.save') }}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="smtp-container glass-card margin-top-lg">
        <div class="smtp-intro">
          <h3 class="section-title"><Clock :size="20" /> {{ t('superAdmin.digest.title') }}</h3>
          <p class="section-subtitle">
            {{ t('superAdmin.digest.intro') }}
          </p>
        </div>

        <form @submit.prevent="saveDigestSchedule" class="smtp-form">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.digest.hour') }}</label>
              <input
                type="number"
                v-model.number="digestSchedule.digestHour"
                min="0"
                max="23"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.digest.minute') }}</label>
              <input
                type="number"
                v-model.number="digestSchedule.digestMinute"
                min="0"
                max="59"
                class="form-input"
              />
            </div>
          </div>

          <div v-if="digestScheduleMessage" class="alert-box" :class="digestScheduleSuccess ? 'alert-success' : 'alert-error'">
            {{ digestScheduleMessage }}
          </div>

          <div class="smtp-actions">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="sendingDigestNow"
              @click="sendDigestNow"
              :title="t('superAdmin.digest.sendNowTitle')"
            >
              <Send :size="16" />
              <span>{{ sendingDigestNow ? t('superAdmin.sending') : t('superAdmin.digest.sendNow') }}</span>
            </button>
            <button type="submit" class="btn btn-primary" :disabled="savingDigestSchedule">
              <Check :size="16" />
              <span>{{ savingDigestSchedule ? t('common.saving') : t('superAdmin.digest.save') }}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="smtp-container glass-card margin-top-lg">
        <div class="smtp-intro">
          <h3 class="section-title"><ShieldCheck :size="20" /> {{ t('superAdmin.legal.title') }}</h3>
          <p class="section-subtitle">
            <i18n-t keypath="superAdmin.legal.intro" tag="span"><template #legalUrl><code>/mentions-legales</code></template><template #privacyUrl><code>/confidentialite</code></template></i18n-t>
          </p>
        </div>

        <form @submit.prevent="saveLegal" class="smtp-form">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.legal.notice') }}</label>
            <textarea
              v-model="legalContent.legalNotice"
              class="form-input legal-textarea"
              rows="10"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.legal.privacy') }}</label>
            <textarea
              v-model="legalContent.privacyPolicy"
              class="form-input legal-textarea"
              rows="16"
            ></textarea>
          </div>

          <div v-if="legalMessage" class="alert-box" :class="legalSuccess ? 'alert-success' : 'alert-error'">
            {{ legalMessage }}
          </div>

          <div class="smtp-actions">
            <button type="submit" class="btn btn-primary" :disabled="savingLegal">
              <Check :size="16" />
              <span>{{ savingLegal ? t('common.saving') : t('superAdmin.legal.save') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB 4: ALERT LOGS -->
    <div v-if="activeTab === 'alerts'" class="tab-content">
      <div class="alert-filters glass-card">
        <div class="grid-4">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.alerts.family') }}</label>
            <select v-model="alertFilters.familyId" class="form-input">
              <option value="">{{ t('superAdmin.alerts.allFamilies') }}</option>
              <option v-for="f in alertMeta.families" :key="f._id" :value="f._id">{{ f.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.alerts.actionType') }}</label>
            <select v-model="alertFilters.action" class="form-input">
              <option value="">{{ t('superAdmin.alerts.allActions') }}</option>
              <option v-for="a in alertMeta.actions" :key="a.code" :value="a.code">{{ alertActionLabel(a.code, a.label) }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.alerts.from') }}</label>
            <input v-model="alertFilters.from" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.alerts.to') }}</label>
            <input v-model="alertFilters.to" type="date" class="form-input" />
          </div>
        </div>
        <div class="alert-filters-actions">
          <button type="button" class="btn btn-secondary" @click="resetAlertFilters">
            <RotateCcw :size="16" />
            <span>{{ t('superAdmin.alerts.reset') }}</span>
          </button>
          <button type="button" class="btn btn-primary" @click="fetchAlertLogs(1)">
            <Filter :size="16" />
            <span>{{ t('superAdmin.alerts.filter') }}</span>
          </button>
        </div>
      </div>

      <div v-if="loadingAlertLogs" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('superAdmin.alerts.loading') }}</p>
      </div>

      <div v-else-if="alertLogs.length === 0" class="empty-state glass-card">
        <Bell :size="32" />
        <p>{{ t('superAdmin.alerts.empty') }}</p>
      </div>

      <div v-else class="alert-log-list-container glass-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('superAdmin.alerts.cols.date') }}</th>
              <th>{{ t('superAdmin.alerts.cols.family') }}</th>
              <th>{{ t('superAdmin.alerts.cols.user') }}</th>
              <th>{{ t('superAdmin.alerts.cols.action') }}</th>
              <th>{{ t('superAdmin.alerts.cols.channels') }}</th>
              <th>{{ t('superAdmin.alerts.cols.details') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in alertLogs" :key="log._id">
              <td :data-label="t('superAdmin.alerts.cols.date')">
                <div class="alert-datetime">
                  <strong>{{ formatAlertDate(log.createdAt) }}</strong>
                  <span class="text-muted">{{ formatAlertTime(log.createdAt) }}</span>
                </div>
              </td>
              <td :data-label="t('superAdmin.alerts.cols.family')">{{ log.familyName || '—' }}</td>
              <td :data-label="t('superAdmin.alerts.cols.user')">{{ log.actorName || t('superAdmin.alerts.system') }}</td>
              <td :data-label="t('superAdmin.alerts.cols.action')">
                <span class="role-pill standard-user-role">{{ alertActionLabel(log.action, log.actionLabel) }}</span>
              </td>
              <td :data-label="t('superAdmin.alerts.cols.channels')">
                <div class="channel-pills">
                  <span
                    v-for="(ch, idx) in log.channels"
                    :key="idx"
                    class="channel-pill"
                    :class="`channel-${ch.status}`"
                  >
                    {{ ch.type === 'push' ? '📱' : '✉️' }} {{ ch.recipientCount }}
                  </span>
                  <span v-if="!log.channels || log.channels.length === 0" class="text-muted">—</span>
                </div>
              </td>
              <td class="cell-actions" :data-label="t('superAdmin.alerts.cols.details')">
                <button
                  @click="selectedAlertLog = log"
                  class="btn-icon btn-icon-sm text-indigo"
                  :title="t('superAdmin.alerts.viewRecipients')"
                >
                  <Eye :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="alert-pagination">
          <span class="text-muted">
            {{ t('superAdmin.alerts.pagination', { total: alertPagination.total, page: alertPagination.page, pages: alertPagination.totalPages }, alertPagination.total) }}
          </span>
          <div class="alert-pagination-actions">
            <button
              class="btn btn-secondary btn-sm"
              :disabled="alertPagination.page <= 1"
              @click="fetchAlertLogs(alertPagination.page - 1)"
            >
              <ChevronLeft :size="16" />
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="alertPagination.page >= alertPagination.totalPages"
              @click="fetchAlertLogs(alertPagination.page + 1)"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ALERT LOG RECIPIENTS -->
    <div v-if="selectedAlertLog" class="modal-overlay" @click.self="selectedAlertLog = null">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ alertActionLabel(selectedAlertLog.action, selectedAlertLog.actionLabel) }}</h3>
          <button @click="selectedAlertLog = null" class="btn-close">&times;</button>
        </div>
        <p class="modal-subtitle">{{ selectedAlertLog.title }}</p>
        <div class="alert-detail-meta">
          <span><strong>{{ t('superAdmin.alerts.detail.family') }}</strong> {{ selectedAlertLog.familyName || '—' }}</span>
          <span><strong>{{ t('superAdmin.alerts.detail.by') }}</strong> {{ selectedAlertLog.actorName || t('superAdmin.alerts.system') }}</span>
          <span><strong>{{ t('superAdmin.alerts.detail.on') }}</strong> {{ t('superAdmin.alerts.detail.dateAt', { date: formatAlertDate(selectedAlertLog.createdAt), time: formatAlertTime(selectedAlertLog.createdAt) }) }}</span>
        </div>
        <div v-for="(ch, idx) in selectedAlertLog.channels" :key="idx" class="alert-channel-block">
          <h4>
            {{ ch.type === 'push' ? '📱 ' + t('superAdmin.alerts.channelPush') : '✉️ ' + t('superAdmin.alerts.channelEmail') }}
            <span class="channel-pill" :class="`channel-${ch.status}`">{{ alertChannelStatusLabel(ch.status) }}</span>
          </h4>
          <p v-if="ch.reason" class="text-muted alert-channel-reason">{{ alertReasonLabel(ch.reason) }}</p>
          <ul v-if="ch.recipients && ch.recipients.length > 0" class="alert-recipient-list">
            <li v-for="(r, rIdx) in ch.recipients" :key="rIdx">
              {{ r.name || r.email || t('superAdmin.alerts.member') }} <span v-if="r.email" class="text-muted">({{ r.email }})</span>
            </li>
          </ul>
          <p v-else class="text-muted">{{ t('superAdmin.alerts.noRecipient') }}</p>
        </div>
      </div>
    </div>

    <!-- MODAL CREATE FAMILY -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ t('superAdmin.createFamily.title') }}</h3>
          <button @click="showCreateModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleCreateFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.familyForm.name') }}</label>
            <input 
              v-model="newFamily.name" 
              @input="onFamilyNameChange" 
              type="text" 
              :placeholder="t('superAdmin.familyForm.namePlaceholder')" 
              class="form-input" 
              required 
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.familyForm.slug') }}</label>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">family-gest/</span>
              <input 
                v-model="newFamily.slug" 
                @input="checkSlugAvailability" 
                type="text" 
                :placeholder="t('superAdmin.familyForm.slugPlaceholder')" 
                class="form-input slug-input" 
                required 
              />
            </div>
            <div v-if="slugStatus.checked" class="slug-status" :class="{ available: slugStatus.available, unavailable: !slugStatus.available }">
              <span v-if="slugStatus.available">✓ {{ t('superAdmin.familyForm.slugAvailable') }}</span>
              <span v-else>✗ {{ slugStatus.message || t('superAdmin.familyForm.slugTaken') }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.familyForm.quota') }}</label>
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
          <h4 class="sub-section-title">{{ t('superAdmin.createFamily.initialAdmin') }}</h4>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.createFamily.adminEmail') }}</label>
            <input 
              v-model="newFamily.adminEmail" 
              @blur="checkAdminEmail" 
              type="email" 
              :placeholder="t('superAdmin.createFamily.adminEmailPlaceholder')" 
              class="form-input" 
              required 
            />
            <div v-if="adminUserCheck.checked" class="user-check-info">
              <span v-if="adminUserCheck.exists" class="text-info">
                ℹ️ {{ t('superAdmin.createFamily.existingAccount', { name: `${adminUserCheck.user.firstName} ${adminUserCheck.user.lastName}` }) }}
              </span>
              <span v-else class="text-muted">
                ℹ️ {{ t('superAdmin.createFamily.newAccount') }}
              </span>
            </div>
          </div>

          <!-- Si nouveau compte -->
          <div v-if="adminUserCheck.checked && !adminUserCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.firstName') }}</label>
              <input v-model="newFamily.adminFirstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.lastName') }}</label>
              <input v-model="newFamily.adminLastName" type="text" class="form-input" required />
            </div>
          </div>

          <div v-if="createError" class="alert-box alert-error">
            {{ createError }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="submittingFamily || (slugStatus.checked && !slugStatus.available)"
            >
              {{ submittingFamily ? t('superAdmin.createFamily.creating') : t('superAdmin.createFamily.submit') }}
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
            <h3>{{ t('superAdmin.editFamily.title') }}</h3>
            <p class="modal-subtitle">{{ t('superAdmin.familyLabel') }} <strong>{{ selectedFamily?.name }}</strong></p>
          </div>
          <button @click="showEditFamilyModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveEditFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.familyForm.name') }}</label>
            <input 
              v-model="editFamilyForm.name" 
              type="text" 
              :placeholder="t('superAdmin.familyForm.namePlaceholder')" 
              class="form-input" 
              required 
            />
          </div>

          <div class="form-group">
            <div class="label-with-action">
              <label class="form-label">{{ t('superAdmin.familyForm.slug') }}</label>
              <button 
                type="button" 
                @click="generateSlugFromEditName" 
                class="btn-link-action"
                :title="t('superAdmin.editFamily.generateTitle')"
              >
                🪄 {{ t('superAdmin.editFamily.generate') }}
              </button>
            </div>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">family-gest/</span>
              <input 
                v-model="editFamilyForm.slug" 
                @input="checkEditSlugAvailability" 
                type="text" 
                :placeholder="t('superAdmin.familyForm.slugPlaceholder')" 
                class="form-input slug-input" 
                required 
              />
            </div>
            <div v-if="editSlugStatus.checked" class="slug-status" :class="{ available: editSlugStatus.available, unavailable: !editSlugStatus.available }">
              <span v-if="editSlugStatus.available">✓ {{ t('superAdmin.familyForm.slugAvailable') }}</span>
              <span v-else>✗ {{ editSlugStatus.message || t('superAdmin.familyForm.slugTaken') }}</span>
            </div>
            <span class="help-subtext">
              ⚠️ <i18n-t keypath="superAdmin.editFamily.slugWarning" tag="span"><template #url><code>/{{ editFamilyForm.slug || '...' }}</code></template></i18n-t>
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.familyForm.quota') }}</label>
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
            <button type="button" @click="showEditFamilyModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="savingFamily || (editSlugStatus.checked && !editSlugStatus.available)"
            >
              {{ savingFamily ? t('common.saving') : t('superAdmin.editFamily.submit') }}
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
            <h3>{{ t('superAdmin.families.addAdmin') }}</h3>
            <p class="modal-subtitle">{{ t('superAdmin.familyLabel') }} <strong>{{ selectedFamilyForAdmin?.name }}</strong></p>
          </div>
          <button @click="showAddAdminModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddAdminToFamily" class="modal-form">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.addAdmin.email') }}</label>
            <input 
              v-model="newAdmin.email" 
              @blur="checkNewAdminEmail" 
              type="email" 
              :placeholder="t('superAdmin.addAdmin.emailPlaceholder')" 
              class="form-input" 
              required 
            />
            <div v-if="newAdminUserCheck.checked" class="user-check-info">
              <span v-if="newAdminUserCheck.exists" class="text-info">
                ℹ️ {{ t('superAdmin.addAdmin.existingAccount', { name: `${newAdminUserCheck.user?.firstName} ${newAdminUserCheck.user?.lastName}` }) }}
              </span>
              <span v-else class="text-muted">
                ℹ️ {{ t('superAdmin.addAdmin.newAccount') }}
              </span>
            </div>
          </div>

          <!-- Si nouveau compte -->
          <div v-if="newAdminUserCheck.checked && !newAdminUserCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.firstName') }}</label>
              <input v-model="newAdmin.firstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('superAdmin.lastName') }}</label>
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
            <button type="button" @click="showAddAdminModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="submittingAdmin"
            >
              <Send :size="15" />
              <span>{{ submittingAdmin ? t('superAdmin.sending') : t('superAdmin.addAdmin.submit') }}</span>
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
            <h3>{{ t('superAdmin.userModal.title') }}</h3>
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
              <Users :size="16" /> {{ t('superAdmin.userModal.general') }}
            </h4>
            <form @submit.prevent="handleUpdateUserProfile" class="modal-form">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">{{ t('superAdmin.firstName') }}</label>
                  <input v-model="userForm.firstName" type="text" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ t('superAdmin.lastName') }}</label>
                  <input v-model="userForm.lastName" type="text" class="form-input" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">{{ t('superAdmin.userModal.email') }}</label>
                <input v-model="userForm.email" type="email" class="form-input" required />
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="userForm.isSuperAdmin" type="checkbox" />
                  <span>
                    <strong>{{ t('superAdmin.userModal.superAdmin') }}</strong>
                    <small class="help-text">{{ t('superAdmin.userModal.superAdminHelp') }}</small>
                  </span>
                </label>
              </div>
              <div class="form-actions-right">
                <button type="submit" class="btn btn-primary btn-sm" :disabled="savingUser">
                  {{ savingUser ? t('common.saving') : t('superAdmin.userModal.updateProfile') }}
                </button>
              </div>
            </form>
          </div>

          <div class="separator-divider"></div>

          <!-- Section 2: Familles Associées & Rôles Familiaux -->
          <div class="card-section">
            <h4 class="sub-section-title">
              <Home :size="16" /> {{ t('superAdmin.userModal.families') }}
            </h4>
            <div v-if="!selectedUser?.families || selectedUser.families.length === 0" class="empty-state-text">
              {{ t('superAdmin.userModal.noFamily') }}
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
                    :placeholder="t('superAdmin.userModal.rolePlaceholder')" 
                    class="form-input form-input-sm"
                  />
                </div>
                <div class="family-admin-col">
                  <label class="admin-checkbox-label">
                    <input v-model="f.isAdmin" type="checkbox" />
                    <span>{{ t('superAdmin.userModal.familyAdmin') }}</span>
                  </label>
                </div>
                <div class="family-actions-col">
                  <button 
                    type="button" 
                    @click="handleUpdateFamilyRole(f)" 
                    class="btn btn-sm btn-secondary" 
                    :title="t('superAdmin.userModal.saveForFamily')"
                  >
                    <Check :size="14" />
                    <span>{{ t('common.save') }}</span>
                  </button>
                  <button 
                    type="button" 
                    @click="handleRemoveFromFamily(f)" 
                    class="btn btn-sm btn-danger-outline"
                    :title="t('superAdmin.userModal.removeFromFamily')"
                  >
                    <UserMinus :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Ajouter à une nouvelle famille -->
            <div class="add-to-family-box margin-top-md">
              <h5 class="sub-box-title">{{ t('superAdmin.userModal.attachTitle') }}</h5>
              <form @submit.prevent="handleAttachFamily" class="attach-family-form">
                <div class="form-group flex-1">
                  <select v-model="newFamilyAttach.familyId" class="form-select form-input-sm" required>
                    <option value="" disabled>{{ t('superAdmin.userModal.selectFamily') }}</option>
                    <option v-for="fam in unassignedFamilies" :key="fam._id" :value="fam._id">
                      {{ fam.name }} ({{ fam.memberCount || 0 }}/{{ fam.maxMembers }})
                    </option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <input 
                    v-model="newFamilyAttach.role" 
                    type="text" 
                    :placeholder="t('superAdmin.userModal.attachRolePlaceholder')" 
                    class="form-input form-input-sm" 
                  />
                </div>
                <div class="form-group flex-checkbox">
                  <label class="admin-checkbox-label">
                    <input v-model="newFamilyAttach.isAdmin" type="checkbox" />
                    <span>{{ t('menu.badges.admin') }}</span>
                  </label>
                </div>
                <button 
                  type="submit" 
                  class="btn btn-primary btn-sm" 
                  :disabled="!newFamilyAttach.familyId || attachingFamily"
                >
                  <Plus :size="14" />
                  <span>{{ t('superAdmin.userModal.attach') }}</span>
                </button>
              </form>
            </div>
          </div>

          <div class="separator-divider"></div>

          <!-- Section 3: Zone Danger - Suppression de compte -->
          <div class="card-section danger-zone">
            <h4 class="sub-section-title text-danger">
              <Trash2 :size="16" /> {{ t('superAdmin.userModal.dangerZone') }}
            </h4>
            <div class="danger-zone-content">
              <div>
                <strong>{{ t('superAdmin.userModal.deleteTitle') }}</strong>
                <p class="text-sm text-muted">
                  {{ t('superAdmin.userModal.deleteText') }}
                </p>
              </div>
              <button 
                type="button" 
                @click="handleDeleteUser" 
                class="btn btn-danger btn-sm" 
                :disabled="deletingUser"
              >
                <Trash2 :size="14" />
                <span>{{ deletingUser ? t('superAdmin.userModal.deleting') : t('superAdmin.userModal.delete') }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" @click="showUserModal = false" class="btn btn-secondary">{{ t('common.close') }}</button>
        </div>
      </div>
    </div>

    <!-- MODAL IMPORT FAMILY -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-content glass-card modal-md">
        <div class="modal-header">
          <div>
            <h3>{{ t('superAdmin.import.title') }}</h3>
            <p class="modal-subtitle">{{ t('superAdmin.import.subtitle') }}</p>
          </div>
          <button @click="showImportModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleExecuteImport" class="modal-body">
          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.import.target') }} *</label>
            <select v-model="importTargetFamilyId" class="form-select" required>
              <option value="" disabled>-- {{ t('superAdmin.import.chooseTarget') }} --</option>
              <option v-for="fam in families" :key="fam._id" :value="fam._id">
                {{ fam.name }} (/{{ fam.slug }})
              </option>
            </select>
            <span class="help-text">{{ t('superAdmin.import.targetHelp') }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('superAdmin.import.file') }} *</label>
            <input 
              type="file" 
              accept=".json,application/json" 
              @change="handleFileSelected" 
              class="form-input" 
              required 
            />
            <div v-if="importFileName" class="text-sm font-semibold text-indigo margin-top-xs">
              📄 {{ t('superAdmin.import.selectedFile', { name: importFileName }) }}
            </div>
          </div>

          <!-- Avertissement écrasement des données -->
          <div class="alert-box alert-warning">
            <AlertTriangle :size="20" class="flex-shrink-0" />
            <div>
              <strong>{{ t('superAdmin.import.warningTitle') }}</strong>
              <p class="margin-top-xs text-sm">
                <i18n-t keypath="superAdmin.import.warningText" tag="span"><template #all><strong>{{ t('superAdmin.import.allData') }}</strong></template></i18n-t>
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
            <button type="button" @click="showImportModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="importing || !importTargetFamilyId || !importFileContent"
            >
              <Upload v-if="!importing" :size="16" />
              <Loader2 v-else :size="16" class="spin" />
              <span>{{ importing ? t('superAdmin.import.importing') : t('superAdmin.import.submit') }}</span>
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
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'
import { intlLocale } from '../i18n/format'
import { translateValue } from '../i18n/values'
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
  Loader2,
  Bell,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Filter,
  Clock
} from '@lucide/vue'

const { t, te } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const familyStore = useFamilyStore()
const { confirm } = useConfirm()

const activeTab = ref('families')
const families = ref([])
const users = ref([])
const loadingFamilies = ref(false)
const loadingUsers = ref(false)

// Global Platform & SMTP State
const smtpConfig = reactive({
  serverUrl: 'http://localhost:5173',
  providerPreset: 'gmail',
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  from: ''
})

const smtpPresets = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  'brevo-smtp': { host: 'smtp-relay.brevo.com', port: 587, secure: false },
  'brevo-api': { host: '', port: '', secure: false, user: '' },
  resend: { host: 'smtp.resend.com', port: 465, secure: true, user: 'resend' },
  custom: {}
}

const applyGlobalSmtpPreset = (presetName) => {
  smtpConfig.providerPreset = presetName
  const preset = smtpPresets[presetName]
  if (preset) {
    if (preset.host !== undefined) smtpConfig.host = preset.host
    if (preset.port !== undefined) smtpConfig.port = preset.port
    if (preset.secure !== undefined) smtpConfig.secure = preset.secure
    if (preset.user !== undefined) smtpConfig.user = preset.user
  }
}
const savingSmtp = ref(false)
const testingSmtp = ref(false)
const smtpMessage = ref('')
const smtpSuccess = ref(false)
const testRecipient = ref(authStore.user?.email || '')

// Heure d'envoi du récapitulatif quotidien (GlobalConfig.digestHour/digestMinute)
const digestSchedule = reactive({ digestHour: 8, digestMinute: 0 })
const savingDigestSchedule = ref(false)
const digestScheduleMessage = ref('')
const digestScheduleSuccess = ref(false)
const sendingDigestNow = ref(false)

// Contenu légal RGPD (GlobalConfig.legalNotice/privacyPolicy), affiché publiquement sur
// /mentions-legales et /confidentialite
const legalContent = reactive({ legalNotice: '', privacyPolicy: '' })
const savingLegal = ref(false)
const legalMessage = ref('')
const legalSuccess = ref(false)

// Alert Log Journal State
const alertLogs = ref([])
const loadingAlertLogs = ref(false)
const selectedAlertLog = ref(null)
const alertMeta = reactive({ actions: [], families: [] })
const alertFilters = reactive({ familyId: '', action: '', from: '', to: '' })
const alertPagination = reactive({ page: 1, limit: 25, total: 0, totalPages: 1 })

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
      importError.value = t('superAdmin.import.invalidJson', { message: err.message })
      importFileContent.value = null
    }
  }
  reader.onerror = () => {
    importError.value = t('superAdmin.import.readError')
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
      importSuccess.value = result.message || t('superAdmin.import.success')
      await fetchFamilies()
      await fetchUsers()
      setTimeout(() => {
        showImportModal.value = false
      }, 1800)
    } else {
      importError.value = result.error || t('superAdmin.import.error')
    }
  } catch (err) {
    importError.value = t('superAdmin.errors.networkWithMessage', { message: err.message })
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
      smtpConfig.providerPreset = data.providerPreset || 'gmail'
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

const fetchDigestSchedule = async () => {
  try {
    const res = await fetch('/api/super-admin/digest-schedule', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      digestSchedule.digestHour = data.digestHour ?? 8
      digestSchedule.digestMinute = data.digestMinute ?? 0
    }
  } catch (err) {
    console.error('Erreur fetchDigestSchedule', err)
  }
}

const saveDigestSchedule = async () => {
  savingDigestSchedule.value = true
  digestScheduleMessage.value = ''
  try {
    const res = await fetch('/api/super-admin/digest-schedule', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ digestHour: digestSchedule.digestHour, digestMinute: digestSchedule.digestMinute })
    })
    const data = await res.json()
    if (res.ok) {
      digestScheduleSuccess.value = true
      digestScheduleMessage.value = '✓ ' + t('superAdmin.digest.saved')
    } else {
      digestScheduleSuccess.value = false
      digestScheduleMessage.value = data.error || t('superAdmin.errors.save')
    }
  } catch (err) {
    digestScheduleSuccess.value = false
    digestScheduleMessage.value = err.message
  } finally {
    savingDigestSchedule.value = false
  }
}

const fetchLegal = async () => {
  try {
    const res = await fetch('/api/legal')
    if (res.ok) {
      const data = await res.json()
      legalContent.legalNotice = data.legalNotice || ''
      legalContent.privacyPolicy = data.privacyPolicy || ''
    }
  } catch (err) {
    console.error('Erreur fetchLegal', err)
  }
}

const saveLegal = async () => {
  savingLegal.value = true
  legalMessage.value = ''
  try {
    const res = await fetch('/api/super-admin/legal', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ legalNotice: legalContent.legalNotice, privacyPolicy: legalContent.privacyPolicy })
    })
    const data = await res.json()
    if (res.ok) {
      legalSuccess.value = true
      legalMessage.value = '✓ ' + t('superAdmin.legal.saved')
    } else {
      legalSuccess.value = false
      legalMessage.value = data.error || t('superAdmin.errors.save')
    }
  } catch (err) {
    legalSuccess.value = false
    legalMessage.value = err.message
  } finally {
    savingLegal.value = false
  }
}

const sendDigestNow = async () => {
  const ok = await confirm({
    title: t('superAdmin.digest.confirmTitle'),
    message: t('superAdmin.digest.confirmMessage'),
    confirmText: t('superAdmin.digest.sendNow'),
    type: 'primary'
  })
  if (!ok) return

  sendingDigestNow.value = true
  digestScheduleMessage.value = ''
  try {
    const res = await fetch('/api/super-admin/digest/send-now', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (res.ok) {
      digestScheduleSuccess.value = true
      digestScheduleMessage.value = data.message || '✓ ' + t('superAdmin.digest.triggered')
    } else {
      digestScheduleSuccess.value = false
      digestScheduleMessage.value = data.error || t('superAdmin.digest.triggerError')
    }
  } catch (err) {
    digestScheduleSuccess.value = false
    digestScheduleMessage.value = err.message
  } finally {
    sendingDigestNow.value = false
  }
}

const fetchAlertMeta = async () => {
  try {
    const res = await fetch('/api/super-admin/alert-logs/meta', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      alertMeta.actions = data.actions || []
      alertMeta.families = data.families || []
    }
  } catch (err) {
    console.error('Erreur fetchAlertMeta', err)
  }
}

const fetchAlertLogs = async (page = 1) => {
  loadingAlertLogs.value = true
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(alertPagination.limit) })
    if (alertFilters.familyId) params.set('familyId', alertFilters.familyId)
    if (alertFilters.action) params.set('action', alertFilters.action)
    if (alertFilters.from) params.set('from', alertFilters.from)
    if (alertFilters.to) params.set('to', alertFilters.to)

    const res = await fetch(`/api/super-admin/alert-logs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      alertLogs.value = data.logs || []
      Object.assign(alertPagination, data.pagination || {})
    }
  } catch (err) {
    console.error('Erreur fetchAlertLogs', err)
  } finally {
    loadingAlertLogs.value = false
  }
}

const resetAlertFilters = () => {
  alertFilters.familyId = ''
  alertFilters.action = ''
  alertFilters.from = ''
  alertFilters.to = ''
  fetchAlertLogs(1)
}

const formatAlertDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatAlertTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const alertChannelStatusLabel = (status) => {
  if (status === 'sent') return t('superAdmin.alerts.status.sent')
  if (status === 'skipped') return t('superAdmin.alerts.status.skipped')
  return t('superAdmin.alerts.status.error')
}

// Libellé d'un type d'alerte : traduit d'après son code, sinon libellé enregistré par le serveur
const alertActionLabel = (code, fallback) => {
  const key = `superAdmin.alertActions.${String(code || '').replace(/\./g, '_')}`
  return code && te(key) ? t(key) : fallback
}

const alertReasonLabel = (reason) => {
  const key = `superAdmin.alerts.reasons.${reason}`
  return te(key) ? t(key) : reason
}

onMounted(() => {
  if (!authStore.isSuperAdmin) {
    router.push('/')
    return
  }
  fetchFamilies()
  fetchUsers()
  fetchSmtp()
  fetchDigestSchedule()
  fetchLegal()
  fetchAlertMeta()
  fetchAlertLogs()
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
      createError.value = data.error || t('superAdmin.createFamily.error')
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
      editSlugStatus.message = data.reason || (data.available ? '' : t('superAdmin.familyForm.slugTaken'))
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
      throw new Error(data.error || t('superAdmin.editFamily.error'))
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
      addAdminError.value = data.error || t('superAdmin.addAdmin.error')
      return
    }
    addAdminSuccess.value = '✓ ' + t('superAdmin.addAdmin.success', { email: newAdmin.email })
    await fetchFamilies()
    await fetchUsers()
    setTimeout(() => {
      showAddAdminModal.value = false
    }, 1800)
  } catch (err) {
    addAdminError.value = err.message || t('superAdmin.errors.network')
  } finally {
    submittingAdmin.value = false
  }
}

const toggleUserFamilyAdmin = async (u, f) => {
  const newAdminStatus = !f.isAdmin
  const familyId = f.familyId || f._id || f.id
  const params = { name: `<strong>${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)}</strong>`, family: escapeHtml(f.name) }
  const actionText = newAdminStatus
    ? t('superAdmin.adminRights.promoteMessage', params)
    : t('superAdmin.adminRights.demoteMessage', params)
  const ok = await confirm({
    title: t('superAdmin.adminRights.title'),
    message: actionText,
    type: 'warning',
    confirmText: newAdminStatus ? t('superAdmin.adminRights.promote') : t('superAdmin.adminRights.demote')
  })
  if (!ok) return

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
      alert(err.error || t('superAdmin.adminRights.error'))
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
      userModalError.value = data.error || t('superAdmin.userModal.updateError')
      return
    }
    userModalSuccess.value = '✓ ' + t('superAdmin.userModal.updated')
    selectedUser.value.firstName = userForm.firstName
    selectedUser.value.lastName = userForm.lastName
    selectedUser.value.email = userForm.email
    selectedUser.value.isSuperAdmin = userForm.isSuperAdmin
    await fetchUsers()
  } catch (err) {
    userModalError.value = err.message || t('superAdmin.errors.network')
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
      userModalError.value = data.error || t('superAdmin.userModal.roleError')
      return
    }
    userModalSuccess.value = '✓ ' + t('superAdmin.userModal.roleUpdated', { family: f.name })
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || t('superAdmin.errors.network')
  }
}

const handleRemoveFromFamily = async (f) => {
  if (!selectedUser.value) return
  const ok = await confirm({
    title: t('superAdmin.userModal.removeTitle'),
    message: t('superAdmin.userModal.removeMessage', { name: `<strong>${escapeHtml(selectedUser.value.firstName)} ${escapeHtml(selectedUser.value.lastName || '')}</strong>`, family: escapeHtml(f.name) }),
    confirmText: t('superAdmin.userModal.remove'),
    type: 'danger'
  })
  if (!ok) return
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
      userModalError.value = data.error || t('superAdmin.userModal.removeError')
      return
    }
    userModalSuccess.value = '✓ ' + t('superAdmin.userModal.removed', { family: f.name })
    selectedUser.value.families = selectedUser.value.families.filter(
      item => (item.familyId || item._id || item.id) !== familyId
    )
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || t('superAdmin.errors.network')
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
      userModalError.value = data.error || t('superAdmin.userModal.attachError')
      return
    }
    userModalSuccess.value = '✓ ' + t('superAdmin.userModal.attached')
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
    userModalError.value = err.message || t('superAdmin.errors.network')
  } finally {
    attachingFamily.value = false
  }
}

const handleDeleteUser = async () => {
  if (!selectedUser.value) return
  const fullName = `${selectedUser.value.firstName} ${selectedUser.value.lastName}`
  const ok = await confirm({
    title: t('superAdmin.userModal.deleteConfirmTitle'),
    message: t('superAdmin.userModal.deleteConfirmMessage', { name: `<strong>${escapeHtml(fullName)}</strong>` }),
    warning: t('superAdmin.userModal.deleteConfirmWarning'),
    confirmText: t('superAdmin.userModal.delete'),
    type: 'danger'
  })
  if (!ok) return
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
      userModalError.value = data.error || t('superAdmin.userModal.deleteError')
      return
    }
    showUserModal.value = false
    await fetchUsers()
    await fetchFamilies()
  } catch (err) {
    userModalError.value = err.message || t('superAdmin.errors.network')
  } finally {
    deletingUser.value = false
  }
}

const toggleFamilyActive = async (fam) => {
  const name = `<strong>${escapeHtml(fam.name)}</strong>`
  const ok = await confirm({
    title: fam.isActive ? t('superAdmin.families.deactivate') : t('superAdmin.families.activate'),
    message: fam.isActive ? t('superAdmin.families.deactivateMessage', { name }) : t('superAdmin.families.activateMessage', { name }),
    warning: fam.isActive ? t('superAdmin.families.deactivateWarning') : undefined,
    confirmText: fam.isActive ? t('superAdmin.families.deactivateShort') : t('superAdmin.families.activateShort'),
    type: fam.isActive ? 'warning' : 'primary'
  })
  if (!ok) return
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
      providerPreset: smtpConfig.providerPreset,
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
      smtpMessage.value = '✓ ' + t('superAdmin.smtp.saved')
    } else {
      smtpSuccess.value = false
      smtpMessage.value = data.error || t('superAdmin.errors.save')
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
      smtpMessage.value = `✓ ${data.message || t('superAdmin.smtp.testSuccess')}`
    } else {
      smtpSuccess.value = false
      smtpMessage.value = t('superAdmin.smtp.testFailed', { error: data.error || t('superAdmin.smtp.cannotConnect') })
    }
  } catch (err) {
    smtpSuccess.value = false
    smtpMessage.value = t('superAdmin.errors.networkWithMessage', { message: err.message })
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
  border-radius: var(--radius-full);
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

/* .btn-icon (forme et taille) vient du style global ; ici uniquement les teintes de survol par contexte */
.btn-icon.text-indigo {
  color: var(--accent-primary);
}

.btn-icon.text-indigo:hover {
  color: var(--accent-primary-hover);
  background: var(--accent-primary-light);
}

.modal-subtitle {
  color: var(--text-muted, #64748b);
  font-size: 0.88rem;
  margin-top: 0.2rem;
}

.btn-icon.text-danger:hover {
  color: var(--accent-rose);
  background: var(--accent-rose-light);
}

.btn-icon.text-success:hover {
  color: var(--accent-secondary);
  background: var(--accent-secondary-light);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-cell {
  font-size: 1.4rem;
}

/* .role-pill et ses variantes viennent du style global (src/style.css) */

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

.legal-textarea {
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
}

.smtp-preset-buttons {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin-top: 0.5rem;
}

@media (max-width: 900px) {
  .smtp-preset-buttons {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .smtp-preset-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

.smtp-preset-btn {
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

.smtp-preset-btn:hover {
  border-color: var(--accent-indigo, #6366f1);
  transform: translateY(-1px);
}

.smtp-preset-btn.active {
  border-color: var(--accent-indigo, #6366f1);
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-indigo, #6366f1);
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

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .grid-4 {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .grid-4 {
    grid-template-columns: 1fr;
  }
}

/* Alert log journal */
.alert-filters {
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.alert-filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.alert-datetime {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.alert-datetime .text-muted {
  font-size: 0.8rem;
}

.channel-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.channel-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--text-muted, #64748b);
}

.channel-pill.channel-sent {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.channel-pill.channel-skipped {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.channel-pill.channel-error {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.alert-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
}

[data-theme='dark'] .alert-pagination {
  border-color: rgba(51, 65, 85, 0.6);
}

.alert-pagination-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  padding: 2.5rem 1.5rem;
  text-align: center;
  color: var(--text-muted, #64748b);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.alert-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  margin: 0.75rem 0 1.25rem;
  padding: 0.75rem 1rem;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 8px;
}

.alert-channel-block {
  margin-bottom: 1.25rem;
}

.alert-channel-block h4 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.alert-channel-reason {
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}

.alert-recipient-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.85rem;
  line-height: 1.6;
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

/* .modal-content (fond, rayon, ombre, largeur par defaut) vient du style global (src/style.css) */

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

/* .btn-danger-outline vient du style global (src/style.css) */

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

/* ==============================================================================
   RESPONSIVE DESIGN MOBILE & TABLETTE (SuperAdminView)
   ============================================================================== */
@media (max-width: 900px) {
  .super-admin-view {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }

  .super-admin-view .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    margin-bottom: 1.25rem;
    padding-right: 0 !important;
  }

  .header-content {
    width: 100%;
  }

  .super-admin-view .header-badge {
    align-self: flex-start;
  }

  .super-admin-view .page-title {
    font-size: 1.45rem;
    line-height: 1.25;
    word-break: break-word;
  }

  .super-admin-view .page-subtitle {
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .header-actions {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 0.55rem;
  }

  .header-actions .btn {
    width: 100%;
    justify-content: center;
    padding: 0.7rem 1rem;
    font-size: 0.88rem;
  }

  /* Navigation Tabs sur Mobile (Scrollable horizontalement) */
  .tabs-nav {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 0.35rem;
    padding: 0.35rem;
    margin-bottom: 1.25rem;
    border-radius: var(--radius-md, 12px);
  }

  .tabs-nav::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 0.55rem 0.85rem;
    font-size: 0.82rem;
    border-radius: 8px;
  }

  /* Transformation des tableaux en cartes sur Mobile */
  .families-list-container,
  .users-list-container {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .data-table thead {
    display: none;
  }

  .data-table,
  .data-table tbody,
  .data-table tr,
  .data-table td {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  .data-table tr {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: var(--radius-md, 12px);
    padding: 1rem;
    margin-bottom: 0.85rem;
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
  }

  [data-theme='dark'] .data-table tr {
    background: var(--bg-card, #1e293b);
    border-color: var(--border-color, rgba(255, 255, 255, 0.08));
  }

  .data-table td {
    padding: 0.45rem 0;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: right;
    gap: 0.5rem;
    min-height: 2.2rem;
  }

  .data-table td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted, #64748b);
    text-align: left;
    flex-shrink: 0;
  }

  .data-table td.cell-actions {
    margin-top: 0.6rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, rgba(226, 232, 240, 0.6));
    justify-content: space-around;
    gap: 0.5rem;
  }

  [data-theme='dark'] .data-table td.cell-actions {
    border-color: rgba(51, 65, 85, 0.6);
  }

  .data-table td.cell-actions::before {
    display: none;
  }

  .btn-icon {
    background: var(--bg-secondary, rgba(0, 0, 0, 0.03));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.05));
  }

  .user-cell {
    justify-content: flex-end;
  }

  .cell-email {
    word-break: break-all;
    font-size: 0.85rem;
  }

  .family-tags {
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-width: 70%;
  }

  .family-tag {
    font-size: 0.75rem;
    padding: 0.2rem 0.45rem;
  }

  /* SMTP Tab sur Mobile */
  .smtp-container {
    padding: 1.25rem 1rem;
  }

  .smtp-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.6rem;
  }

  .smtp-actions .btn {
    width: 100%;
    justify-content: center;
  }

  /* Modales sur Mobile */
  .modal-content {
    padding: 1.25rem;
    max-height: 90vh;
  }

  .modal-footer {
    flex-direction: column-reverse;
    width: 100%;
    gap: 0.5rem;
  }

  .modal-footer .btn {
    width: 100%;
    justify-content: center;
  }

  .attach-family-form {
    flex-direction: column;
    align-items: stretch;
  }

  .attach-family-form .btn {
    width: 100%;
  }
}
</style>
