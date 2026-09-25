<template>
  <div class="page-container">
    <!-- View Header -->
    <div class="view-header">
      <div>
        <h1 class="page-title">
          <Settings :size="28" class="title-icon" /> {{ t('familySettings.title') }}
        </h1>
        <p class="page-subtitle">
          {{ t('familySettings.subtitle') }}
        </p>
      </div>

      <div class="header-right-actions">
        <button 
          v-if="store.isFamilyAdmin" 
          type="button" 
          @click="handleExportData" 
          class="btn btn-secondary btn-header-export"
          :disabled="exporting"
          :title="t('familySettings.export.buttonTitle')"
        >
          <Download v-if="!exporting" :size="18" />
          <Loader2 v-else :size="18" class="spin" />
          <span>{{ exporting ? t('familySettings.export.exporting') : t('familySettings.export.button') }}</span>
        </button>

        <button 
          v-if="store.isFamilyAdmin" 
          type="button" 
          @click="openAddMemberModal" 
          class="btn btn-primary btn-header-add-member"
          :disabled="isQuotaReached"
          :title="isQuotaReached ? t('familySettings.members.quotaReached') : t('familySettings.members.invite')"
        >
          <UserPlus :size="18" />
          <span>+ {{ t('familySettings.members.inviteWithQuota', { n: store.members.length, max: store.currentFamilyQuota?.maxMembers || 10 }) }}</span>
        </button>
      </div>
    </div>

    <!-- Admin Protection Warning if non-admin -->
    <div v-if="!store.isFamilyAdmin" class="alert-box danger">
      <ShieldAlert :size="20" />
      <div>
        <i18n-t keypath="familySettings.restricted.text" tag="span"><template #label><strong>{{ t('familySettings.restricted.label') }}</strong></template><template #role><strong>{{ t('familySettings.restricted.role') }}</strong></template></i18n-t>
      </div>
    </div>

    <div v-else class="admin-body-wrapper">
      <!-- Members Management Card: Gestion des membres de la famille -->
      <div class="card glass-card members-admin-card">
        <div class="members-admin-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Users :size="20" class="title-icon-members" /> {{ t('familySettings.members.title') }}
            </h2>
            <p class="section-subtitle">
              {{ t('familySettings.members.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            @click="openAddMemberModal"
            class="btn btn-primary btn-header-add-member"
            :disabled="isQuotaReached"
            :title="isQuotaReached ? t('familySettings.members.quotaReached') : t('familySettings.members.invite')"
          >
            <UserPlus :size="16" />
            <span>{{ t('familySettings.members.invite') }}</span>
          </button>
        </div>

        <div class="members-cards-grid margin-top-md">
          <div
            v-for="member in store.members"
            :key="member.id"
            class="member-card"
            :class="{ clickable: !member.isPending, 'is-pending-card': member.isPending }"
            @click="!member.isPending && openEditMemberModal(member)"
            :title="member.isPending ? t('familySettings.members.pendingTitle') : t('familySettings.members.clickToEdit')"
          >
            <div class="member-card-top">
              <UserAvatar :avatar="member.avatar" :name="member.name" size="md" :border-color="member.color" />
              <div class="member-card-name">
                <strong>{{ member.name }}</strong>
                <span v-if="member.isAdmin && !member.isPending" class="admin-badge-mini" :title="translateValue('role', 'Administrateur')">
                  <ShieldCheck :size="12" /> {{ t('menu.badges.admin') }}
                </span>
                <span v-if="member.isPending" class="pending-badge-mini" :title="t('familySettings.members.pendingBadgeTitle')">
                  ⏳ {{ t('familySettings.members.pending') }}
                </span>
              </div>
            </div>
            <div class="member-card-bottom">
              <div class="member-card-sub">
                <span class="member-role-text">{{ translateValue('role', member.role) }}</span>
                <span v-if="member.email" class="member-email-sub">{{ member.email }}</span>
              </div>
              <div class="member-actions" v-if="!member.isPending">
                <button
                  @click.stop="openEditMemberModal(member)"
                  class="btn-icon-chip"
                  :title="t('familySettings.members.editThis')"
                >
                  <Pencil :size="14" />
                </button>

                <button
                  @click.stop="handleToggleAdmin(member)"
                  class="btn-icon-chip"
                  :class="{ 'is-admin': member.isAdmin }"
                  :title="member.isAdmin ? t('familySettings.members.demote') : t('familySettings.members.promote')"
                >
                  <ShieldCheck v-if="member.isAdmin" :size="14" />
                  <Shield v-else :size="14" />
                </button>

                <button
                  @click.stop="handleDeleteMember(member)"
                  class="btn-icon-chip danger"
                  :title="t('familySettings.members.deleteThis')"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div v-if="store.members.length === 0" class="empty-state">
            👥 {{ t('familySettings.members.empty') }}
          </div>
        </div>
      </div>

      <!-- Export Data Card: Sauvegarde et Export des données -->
      <div class="card glass-card export-config-card margin-top-lg">
        <div class="export-config-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Download :size="20" class="title-icon-export" /> {{ t('familySettings.export.title') }}
            </h2>
            <p class="section-subtitle">
              {{ t('familySettings.export.subtitle') }}
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
            <span>{{ exporting ? t('familySettings.export.exportingLong') : t('familySettings.export.download') }}</span>
          </button>
        </div>
      </div>

      <!-- MCP Connector Card: pilotage de FamilyGest depuis Claude -->
      <div class="card glass-card mcp-connector-card margin-top-lg">
        <div class="mcp-connector-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Bot :size="20" class="title-icon-mcp" /> {{ t('familySettings.mcp.title') }}
            </h2>
            <p class="section-subtitle">
              {{ t('familySettings.mcp.subtitle') }}
            </p>
          </div>
        </div>

        <div class="mcp-connector-body margin-top-md">
          <div v-if="mcpLoading" class="mcp-status-line">
            <Loader2 :size="16" class="spin" /> {{ t('familySettings.mcp.loading') }}
          </div>

          <template v-else>
            <div v-if="mcpConnectorUrl" class="mcp-url-reveal">
              <p class="mcp-url-warning">
                <KeyRound :size="14" /> {{ t('familySettings.mcp.copyNow') }}
              </p>
              <div class="mcp-url-row">
                <input type="text" readonly :value="mcpConnectorUrl" class="mcp-url-input" @click="$event.target.select()" />
                <button type="button" class="btn btn-secondary" @click="copyMcpUrl">
                  <Copy :size="15" /> {{ t('familySettings.mcp.copy') }}
                </button>
              </div>
            </div>

            <div v-else-if="mcpStatus.exists" class="mcp-status-line">
              ✅ <i18n-t keypath="familySettings.mcp.active" tag="span"><template #token><code>...{{ mcpStatus.tokenPreview }}</code></template><template #created>{{ formatMcpDate(mcpStatus.createdAt) }}</template><template #lastUsed>{{ mcpStatus.lastUsedAt ? formatMcpDate(mcpStatus.lastUsedAt) : t('familySettings.mcp.never') }}</template></i18n-t>
            </div>

            <div v-else class="mcp-status-line">
              {{ t('familySettings.mcp.none') }}
            </div>

            <div class="mcp-connector-actions">
              <button type="button" class="btn btn-primary" :disabled="mcpActionLoading" @click="generateMcpConnector">
                <RefreshCw :size="15" />
                <span>{{ mcpStatus.exists ? t('familySettings.mcp.regenerate') : t('familySettings.mcp.generate') }}</span>
              </button>
              <button
                v-if="mcpStatus.exists"
                type="button"
                class="btn btn-danger"
                :disabled="mcpActionLoading"
                @click="revokeMcpConnector"
              >
                <Trash2 :size="15" /> {{ t('familySettings.mcp.revoke') }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Mealie Card: connexion au serveur de recettes Mealie de la famille -->
      <div class="card glass-card mealie-card margin-top-lg">
        <div class="section-title-group">
          <h2 class="section-title">
            <ChefHat :size="20" class="title-icon-mealie" /> {{ t('familySettings.mealie.title') }}
          </h2>
          <p class="section-subtitle">
            <i18n-t keypath="familySettings.mealie.subtitle" tag="span"><template #path><em>{{ t('familySettings.mealie.tokenPath') }}</em></template></i18n-t>
          </p>
        </div>

        <div class="margin-top-md">
          <div v-if="mealieLoading" class="mcp-status-line">
            <Loader2 :size="16" class="spin" /> {{ t('familySettings.mealie.loading') }}
          </div>

          <form v-else @submit.prevent="saveMealieConfig">
            <div v-if="mealieStatus.configured" class="mcp-status-line mealie-status">
              ✅ <i18n-t keypath="familySettings.mealie.connected" tag="span"><template #url><code>{{ mealieStatus.baseUrl }}</code></template><template #token><code>...{{ mealieStatus.tokenPreview }}</code></template></i18n-t>
              <span v-if="mealieConnectedAs"> · {{ t('familySettings.mealie.account', { name: mealieConnectedAs }) }}</span>
            </div>

            <div class="mealie-form-grid">
              <div class="form-group">
                <label class="form-label">{{ t('familySettings.mealie.url') }}</label>
                <input
                  v-model="mealieForm.baseUrl"
                  type="url"
                  required
                  :placeholder="t('familySettings.mealie.urlPlaceholder')"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ t('familySettings.mealie.token') }}</label>
                <input
                  v-model="mealieForm.apiToken"
                  type="password"
                  autocomplete="off"
                  :required="!mealieStatus.configured"
                  :placeholder="mealieStatus.configured ? t('familySettings.mealie.tokenKeep') : t('familySettings.mealie.tokenPlaceholder')"
                  class="form-input"
                />
              </div>
            </div>

            <p v-if="mealieError" class="mealie-error">{{ mealieError }}</p>

            <div class="mcp-connector-actions">
              <button type="submit" class="btn btn-primary" :disabled="mealieSaving">
                <Loader2 v-if="mealieSaving" :size="15" class="spin" />
                <Plug v-else :size="15" />
                <span>{{ mealieSaving ? t('familySettings.mealie.checking') : t('familySettings.mealie.testAndSave') }}</span>
              </button>
              <button
                v-if="mealieStatus.configured"
                type="button"
                class="btn btn-danger"
                :disabled="mealieSaving"
                @click="removeMealieConfig"
              >
                <Trash2 :size="15" /> {{ t('familySettings.mealie.disconnect') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Shopping Categories Card: Catégories de courses -->
      <div class="card glass-card shopping-cats-card margin-top-lg">
        <div class="shopping-cats-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <ShoppingCart :size="20" class="title-icon-shopping" /> {{ t('familySettings.categories.title') }}
            </h2>
            <p class="section-subtitle">
              {{ t('familySettings.categories.subtitle') }}
            </p>
          </div>
          <button 
            type="button" 
            @click="openAddCategoryModal" 
            class="btn btn-primary btn-add-category"
          >
            <Plus :size="16" />
            <span>{{ t('familySettings.categories.new') }}</span>
          </button>
        </div>

        <!-- Categories List with Drag and Drop -->
        <div class="categories-dnd-list margin-top-md">
          <div v-if="!store.shoppingCategories || store.shoppingCategories.length === 0" class="empty-cats-notice">
            {{ t('familySettings.categories.empty') }}
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
            <div class="drag-handle-wrapper" :title="t('familySettings.categories.dragTitle')">
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
            <div class="cat-rank-badge" :title="t('familySettings.categories.rankTitle')">
              {{ t('familySettings.categories.rank', { n: cat.rank }) }}
            </div>

            <!-- Icon -->
            <span class="cat-icon-tag">{{ cat.icon }}</span>

            <!-- Name -->
            <span class="cat-name-text">{{ translateValue('shoppingCategory', cat.name) }}</span>

            <!-- Quick move buttons (accessible alternative) -->
            <div class="cat-arrows-wrapper">
              <button 
                type="button" 
                class="btn-arrow-move" 
                :disabled="index === 0" 
                @click="moveCategory(index, -1)" 
                :title="t('familySettings.categories.moveUp')"
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
                :title="t('familySettings.categories.moveDown')"
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
                :title="t('familySettings.categories.edit')"
              >
                <Pencil :size="15" />
              </button>
              <button 
                type="button" 
                @click="confirmDeleteCategory(cat)" 
                class="btn-cat-action delete" 
                :title="t('familySettings.categories.delete')"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="dnd-hint-footer margin-top-sm">
          💡 <em>{{ t('familySettings.categories.tip') }}</em>
        </div>
      </div>

      <!-- Shortcuts Card: Raccourcis Web & Applications -->
      <div class="card glass-card shortcuts-admin-card margin-top-lg">
        <div class="shortcuts-admin-header">
          <div class="section-title-group">
            <h2 class="section-title">
              <Globe :size="20" class="title-icon-shortcuts" /> {{ t('familySettings.shortcuts.title') }}
            </h2>
            <p class="section-subtitle">
              {{ t('familySettings.shortcuts.subtitle') }}
            </p>
          </div>
          <button 
            type="button" 
            @click="openAddShortcutModal" 
            class="btn btn-primary btn-add-shortcut"
          >
            <Plus :size="16" />
            <span>{{ t('familySettings.shortcuts.new') }}</span>
          </button>
        </div>

        <!-- Shortcuts Grid or Empty State -->
        <div class="shortcuts-admin-body margin-top-md">
          <div v-if="!store.shortcuts || store.shortcuts.length === 0" class="empty-shortcuts-notice">
            {{ t('familySettings.shortcuts.empty') }}
          </div>

          <div v-else class="shortcuts-admin-grid">
            <div 
              v-for="shortcut in store.shortcuts" 
              :key="shortcut.id"
              class="shortcut-admin-card-item"
            >
              <span class="shortcut-item-emoji">{{ shortcut.icon || '🌐' }}</span>
              <div class="shortcut-item-details">
                <span class="shortcut-item-title">{{ shortcut.title }}</span>
                <a :href="shortcut.url" target="_blank" rel="noopener noreferrer" class="shortcut-item-url" :title="t('familySettings.shortcuts.open', { url: shortcut.url })">
                  <span class="url-text">{{ shortcut.url }}</span>
                  <ExternalLink :size="12" />
                </a>
              </div>
              <div class="shortcut-item-actions">
                <button 
                  type="button" 
                  @click="openEditShortcutModal(shortcut)" 
                  class="btn-sc-action edit" 
                  :title="t('familySettings.shortcuts.edit')"
                >
                  <Pencil :size="15" />
                </button>
                <button 
                  type="button" 
                  @click="confirmDeleteShortcut(shortcut)" 
                  class="btn-sc-action delete" 
                  :title="t('familySettings.shortcuts.delete')"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

  </div>

    <!-- Modal Ajouter un Membre (Administrateur Uniquement) -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('familySettings.addMember.title') }}</h3>
          <button @click="showAddMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddMember">
          <div class="form-group">
            <label class="form-label">{{ t('familySettings.addMember.email') }}</label>
            <input 
              v-model="newMember.email" 
              @blur="checkMemberEmail" 
              type="email" 
              required 
              :placeholder="t('familySettings.addMember.emailPlaceholder')"
              class="form-input" 
            />
            <div v-if="memberCheck.checked" class="email-check-info margin-top-xs">
              <span v-if="memberCheck.exists" class="text-info font-semibold">
                ℹ️ {{ t('familySettings.addMember.existing', { name: `${memberCheck.user?.firstName} ${memberCheck.user?.lastName}` }) }}
              </span>
              <span v-else class="text-muted font-semibold">
                ℹ️ {{ t('familySettings.addMember.newAccount') }}
              </span>
            </div>
          </div>

          <div v-if="!memberCheck.checked || !memberCheck.exists" class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('invitation.firstName') }}</label>
              <input 
                v-model="newMember.firstName" 
                type="text" 
                required 
                :placeholder="t('familySettings.addMember.firstNamePlaceholder')"
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('profile.lastName') }}</label>
              <input 
                v-model="newMember.lastName" 
                type="text" 
                required 
                :placeholder="t('familySettings.addMember.lastNamePlaceholder')"
                class="form-input" 
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('profile.role') }}</label>
              <select v-model="newMember.role" class="form-select">
                <option v-for="r in FAMILY_ROLE_VALUES" :key="r" :value="r">{{ translateValue('role', r) }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('familySettings.addMember.access') }}</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="newMember.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>{{ t('familySettings.restricted.role') }}</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('profile.usualPresence') }}</label>
            <select v-model="newMember.usualPresence" class="form-select">
              <option value="present">🟢 {{ t('presence.editor.usuallyPresentOption') }}</option>
              <option value="absent">⚪ {{ t('presence.editor.usuallyAbsentOption') }}</option>
            </select>
            <!-- Volontairement limité au réglage simple : l'invitation ne transporte pas de
                 grille détaillée (FamilyInvitation n'a aucun champ de présence). -->
            <span class="help-subtext">
              {{ t('familySettings.addMember.detailedLater') }}
            </span>
          </div>

          <div v-if="!memberCheck.checked || !memberCheck.exists">
            <div class="form-group">
              <label class="form-label">{{ t('invitation.avatar') }}</label>
              <AvatarPicker 
                v-model="newMember.avatar" 
                :color="newMember.color" 
                :name="`${newMember.firstName} ${newMember.lastName}`"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('invitation.color') }}</label>
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
            <button type="button" @click="showAddMemberModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="addingMember">
              {{ addingMember ? t('familySettings.addMember.sending') : t('familySettings.addMember.send') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Modifier un Membre (Administrateur Uniquement) -->
    <div v-if="showEditMemberModal" class="modal-overlay" @click.self="showEditMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ t('familySettings.editMember.title', { name: editingMember?.name }) }}</h3>
          <button @click="showEditMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveEditMember">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('invitation.firstName') }}</label>
              <input
                v-model="editMemberForm.firstName"
                type="text"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('profile.lastName') }}</label>
              <input
                v-model="editMemberForm.lastName"
                type="text"
                required
                class="form-input"
              />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">{{ t('login.emailLabel') }}</label>
              <input
                v-model="editMemberForm.email"
                type="email"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ t('profile.newPassword') }}</label>
              <input
                v-model="editMemberForm.password"
                type="password"
                :placeholder="t('profile.newPasswordPlaceholder')"
                class="form-input"
              />
              <PasswordStrengthIndicator v-if="editMemberForm.password" :password="editMemberForm.password" />
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">{{ t('profile.role') }}</label>
              <select v-model="editMemberForm.role" class="form-select">
                <option v-for="r in FAMILY_ROLE_VALUES" :key="r" :value="r">{{ translateValue('role', r) }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">{{ translateValue('role', 'Administrateur') }}</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="editMemberForm.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>{{ t('menu.badges.admin') }}</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('profile.usualPresence') }}</label>
            <UsualPresenceEditor
              v-model="editMemberForm.usualPresenceConfig"
              :legacy-usual-presence="editMemberForm.usualPresence"
              :week-anchor="store.presenceWeekAnchor"
              :today="store.todayStr"
              subject="member"
            />
            <!-- L'ancrage A/B est commun à toute la famille : on ne l'expose ici que lorsqu'il
                 sert réellement, pour éviter de le déplacer par inadvertance. -->
            <div v-if="editMemberForm.usualPresenceConfig?.alternating" class="anchor-row">
              <span class="help-subtext">
                <i18n-t keypath="absences.usual.currentWeek" tag="span"><template #week><strong>{{ t('presence.editor.weekTab', { week: store.getWeekPhase(store.todayStr) }) }}</strong></template></i18n-t>
              </span>
              <button type="button" class="btn btn-secondary btn-sm" @click="declareCurrentWeekAsA">
                {{ t('absences.usual.declareCurrentAsA') }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('invitation.avatar') }}</label>
            <AvatarPicker
              v-model="editMemberForm.avatar"
              :color="editMemberForm.color"
              :name="`${editMemberForm.firstName} ${editMemberForm.lastName}`"
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('invitation.color') }}</label>
            <div class="color-picker-options">
              <button
                v-for="c in colorOptions"
                :key="c"
                type="button"
                class="color-btn"
                :style="{ backgroundColor: c }"
                :class="{ selected: editMemberForm.color === c }"
                @click="editMemberForm.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer flex-between">
            <button
              type="button"
              @click="handleResendWelcomeEmail(editMemberForm.id)"
              class="btn btn-secondary btn-resend-welcome"
              :disabled="resendingEmail"
              :title="t('familySettings.editMember.resendTitle')"
            >
              <Mail :size="15" />
              <span>{{ resendingEmail ? t('familySettings.editMember.resending') : t('familySettings.editMember.resend') }}</span>
            </button>

            <div class="modal-actions-right">
              <button type="button" @click="showEditMemberModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn btn-primary" :disabled="savingEdit">
                <span v-if="!savingEdit">{{ t('profile.save') }}</span>
                <span v-else>{{ t('common.saving') }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Ajouter / Modifier une Catégorie de courses -->
    <div v-if="showCatModal" class="modal-overlay" @click.self="showCatModal = false">
      <div class="modal-content modal-cat-content">
        <div class="modal-header">
          <h3>{{ isEditingCat ? t('familySettings.categories.edit') : t('familySettings.categories.addTitle') }}</h3>
          <button @click="showCatModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveCategory">
          <div class="form-group">
            <label class="form-label">{{ t('familySettings.categories.name') }} *</label>
            <input 
              v-model="catForm.name" 
              type="text" 
              required 
              :placeholder="t('familySettings.categories.namePlaceholder')"
              class="form-input" 
              autofocus
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('familySettings.iconLabel') }}</label>
            <div class="cat-icon-selector">
              <input 
                v-model="catForm.icon" 
                type="text" 
                maxlength="4" 
                class="form-input icon-preview-input" 
                placeholder="🛒" 
              />
              <span class="icon-help">{{ t('familySettings.iconHelp') }}</span>
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
            <button type="button" @click="showCatModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary">
              {{ isEditingCat ? t('profile.save') : t('familySettings.categories.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Confirmation Suppression Catégorie -->
    <div v-if="catToDelete" class="modal-overlay" @click.self="catToDelete = null">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>{{ t('familySettings.categories.delete') }}</h3>
          <button @click="catToDelete = null" class="btn-close">&times;</button>
        </div>
        <p class="confirm-text">
          <i18n-t keypath="familySettings.categories.deleteConfirm" tag="span"><template #name><strong>« {{ catToDelete.icon }} {{ translateValue('shoppingCategory', catToDelete.name) }} »</strong></template></i18n-t><br>
          {{ t('familySettings.categories.itemsKept') }}
        </p>
        <div class="modal-footer">
          <button type="button" @click="catToDelete = null" class="btn btn-secondary">{{ t('common.cancel') }}</button>
          <button type="button" @click="executeDeleteCategory" class="btn btn-danger">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal Ajouter / Modifier un Raccourci -->
    <div v-if="showShortcutModal" class="modal-overlay" @click.self="showShortcutModal = false">
      <div class="modal-content modal-shortcut-content">
        <div class="modal-header">
          <h3>{{ editingShortcutId ? t('familySettings.shortcuts.edit') : t('familySettings.shortcuts.addTitle') }}</h3>
          <button @click="showShortcutModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveShortcut">
          <div class="form-group">
            <label class="form-label">{{ t('familySettings.shortcuts.name') }} *</label>
            <input 
              v-model="shortcutForm.title" 
              type="text" 
              required 
              :placeholder="t('familySettings.shortcuts.namePlaceholder')"
              class="form-input" 
              autofocus
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('familySettings.shortcuts.url') }} *</label>
            <input 
              v-model="shortcutForm.url" 
              type="url" 
              required 
              placeholder="https://..."
              class="form-input" 
            />
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('familySettings.iconLabel') }}</label>
            <div class="cat-icon-selector">
              <input 
                v-model="shortcutForm.icon" 
                type="text" 
                maxlength="4" 
                class="form-input icon-preview-input" 
                placeholder="🌐" 
              />
              <span class="icon-help">{{ t('familySettings.iconHelp') }}</span>
            </div>
            
            <div class="emoji-preset-grid">
              <button 
                v-for="emoji in shortcutEmojiPresets" 
                :key="emoji"
                type="button"
                class="emoji-pick-btn"
                :class="{ active: shortcutForm.icon === emoji }"
                @click="shortcutForm.icon = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showShortcutModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="savingShortcut">
              <Loader2 v-if="savingShortcut" :size="16" class="spin" />
              <span>{{ editingShortcutId ? t('profile.save') : t('familySettings.shortcuts.create') }}</span>
            </button>
          </div>
        </form>
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
import UserAvatar from '../components/UserAvatar.vue'
import UsualPresenceEditor from '../components/UsualPresenceEditor.vue'
import { normalizeUsualPresenceConfig } from '@shared/presence.js'
import { DEFAULT_AVATAR } from '../utils/avatarHelper'
import {
  Mail, Settings, ShieldAlert,
  ShieldCheck, Loader2, Globe,
  UserPlus, Download, ShoppingCart, Plus, Pencil, Trash2, ExternalLink,
  Users, Shield,
  Bot, RefreshCw, Copy, KeyRound, ChefHat, Plug
} from '@lucide/vue'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'
import { useI18n } from 'vue-i18n'
import { intlLocale } from '../i18n/format'
import { FAMILY_ROLE_VALUES, translateValue } from '../i18n/values'

const authStore = useAuthStore()
const store = useFamilyStore()
const { t } = useI18n()
const { confirm } = useConfirm()

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

// --- Raccourcis Web & Applications ---
const shortcutEmojiPresets = [
  '🌐', '🏠', '🎓', '🏫', '📚', '🎬', '🎵', '💾', '☁️', '🔒',
  '🎮', '⚡', '📊', '🛒', '🛠️', '📧', '📺', '💡', '🤖', '📸',
  '🚌', '🏥', '⚽', '🏊'
]

const showShortcutModal = ref(false)
const editingShortcutId = ref(null)
const savingShortcut = ref(false)
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
    icon: '🌐'
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
  if (!shortcutForm.value.title?.trim() || !shortcutForm.value.url?.trim()) return
  savingShortcut.value = true
  try {
    if (editingShortcutId.value) {
      await store.updateShortcut(editingShortcutId.value, {
        title: shortcutForm.value.title.trim(),
        url: shortcutForm.value.url.trim(),
        icon: shortcutForm.value.icon?.trim() || '🌐'
      })
    } else {
      await store.addShortcut({
        title: shortcutForm.value.title.trim(),
        url: shortcutForm.value.url.trim(),
        icon: shortcutForm.value.icon?.trim() || '🌐'
      })
    }
    showShortcutModal.value = false
  } catch (err) {
    console.error('Erreur sauvegarde raccourci', err)
  } finally {
    savingShortcut.value = false
  }
}

const confirmDeleteShortcut = async (shortcut) => {
  const ok = await confirm({
    title: t('familySettings.shortcuts.delete'),
    message: t('familySettings.shortcuts.deleteMessage', { title: escapeHtml(shortcut.title) }),
    description: t('familySettings.shortcuts.deleteDescription'),
    confirmText: t('common.delete'),
    type: 'danger'
  })
  if (ok) {
    await store.deleteShortcut(shortcut.id)
  }
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
        ? `✅ ${t('familySettings.addMember.existingInvited', { name: newMember.value.firstName || '' })}`
        : `✅ ${t('familySettings.addMember.emailSent', { email: newMember.value.email })}`
      )
    } else {
      alert(result.error || t('familySettings.addMember.error'))
    }
  } finally {
    addingMember.value = false
  }
}

const showEditMemberModal = ref(false)
const editingMember = ref(null)
const savingEdit = ref(false)
const resendingEmail = ref(false)

const editMemberForm = ref({
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'Membre',
  points: 0,
  isAdmin: false,
  avatar: '👤',
  color: '#6366f1',
  usualPresence: 'present',
  usualPresenceConfig: null
})

const handleResendWelcomeEmail = async (memberId) => {
  if (!memberId) return
  resendingEmail.value = true
  const res = await store.resendWelcomeEmail(memberId)
  resendingEmail.value = false

  if (res.success) {
    alert(`✉️ ${t('familySettings.editMember.resent')}`)
  } else {
    alert(`⚠️ ${res.error || t('familySettings.editMember.resendError')}`)
  }
}

const openEditMemberModal = (member) => {
  editingMember.value = member
  const nameParts = (member.name || '').split(' ')
  const fName = member.firstName || nameParts[0] || ''
  const lName = member.lastName || nameParts.slice(1).join(' ') || ''

  editMemberForm.value = {
    id: member.id,
    firstName: fName,
    lastName: lName,
    email: member.email || '',
    password: '',
    role: member.role || 'Membre',
    points: member.points || 0,
    isAdmin: Boolean(member.isAdmin),
    avatar: member.avatar || DEFAULT_AVATAR,
    color: member.color || '#6366f1',
    usualPresence: member.usualPresence || 'present',
    usualPresenceConfig: normalizeUsualPresenceConfig(member.usualPresenceConfig, member.usualPresence)
  }
  showEditMemberModal.value = true
}

const declareCurrentWeekAsA = async () => {
  const res = await store.updateFamilyPresenceAnchor(store.todayStr)
  if (!res.success) alert(res.error || 'Enregistrement impossible')
}

const handleSaveEditMember = async () => {
  if (!editMemberForm.value.firstName.trim() || !editMemberForm.value.email.trim()) return

  if (editMemberForm.value.password && editMemberForm.value.password.trim().length > 0) {
    if (!isPasswordValid(editMemberForm.value.password.trim())) {
      alert(getPasswordErrorMessage(editMemberForm.value.password.trim()))
      return
    }
  }

  if (editingMember.value && editingMember.value.isAdmin && !editMemberForm.value.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert(t('familySettings.members.lastAdminDemote'))
      return
    }
  }

  savingEdit.value = true
  try {
    const res = await store.updateMember(editMemberForm.value.id, editMemberForm.value)
    if (res.success) {
      showEditMemberModal.value = false
      await store.fetchAllData()
    } else {
      alert(res.error || t('familySettings.editMember.error'))
    }
  } catch (err) {
    alert(err.message || t('familySettings.editMember.saveError'))
  } finally {
    savingEdit.value = false
  }
}

const handleToggleAdmin = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert(t('familySettings.members.lastAdminDemote'))
      return
    }
  }
  const ok = await confirm({
    title: member.isAdmin ? t('familySettings.members.demoteTitle') : t('familySettings.members.promote'),
    message: member.isAdmin
      ? t('familySettings.members.demoteMessage', { name: escapeHtml(member.name) })
      : t('familySettings.members.promoteMessage', { name: escapeHtml(member.name) }),
    confirmText: t('confirm.confirm'),
    type: member.isAdmin ? 'warning' : 'primary'
  })
  if (ok) {
    await store.toggleAdminStatus(member.id)
  }
}

const handleDeleteMember = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert(t('familySettings.members.lastAdminDelete'))
      return
    }
  }
  const ok = await confirm({
    title: t('familySettings.members.removeTitle'),
    message: t('familySettings.members.removeMessage', { name: escapeHtml(member.name) }),
    description: t('familySettings.members.removeDescription'),
    confirmText: t('familySettings.members.removeConfirm'),
    type: 'danger'
  })
  if (ok) {
    await store.deleteMember(member.id)
  }
}

const getSettingsHeaders = () => {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authStore.token}`
  }
  const slug = store.currentFamily?.slug || localStorage.getItem('familygest_active_slug')
  if (slug) h['X-Family-Slug'] = slug
  return h
}

// --- Export des données de la famille ---
const exporting = ref(false)

const handleExportData = async () => {
  exporting.value = true
  try {
    const res = await fetch('/api/admin/export', {
      headers: getSettingsHeaders()
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || t('profile.gdpr.exportError'))
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
    alert(t('common.errorPrefix', { message: err.message }))
  } finally {
    exporting.value = false
  }
}

// --- Connecteur MCP (pilotage depuis Claude) ---
const mcpLoading = ref(true)
const mcpActionLoading = ref(false)
const mcpStatus = ref({ exists: false })
const mcpConnectorUrl = ref('')

const formatMcpDate = (isoDate) => {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleString(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' })
}

const fetchMcpConnectorStatus = async () => {
  mcpLoading.value = true
  try {
    const res = await fetch('/api/family-settings/mcp-connector', { headers: getSettingsHeaders() })
    if (!res.ok) throw new Error(t('familySettings.mcp.errors.status'))
    mcpStatus.value = await res.json()
  } catch (err) {
    console.error(err)
  } finally {
    mcpLoading.value = false
  }
}

const generateMcpConnector = async () => {
  if (mcpStatus.value.exists) {
    const ok = await confirm({
      title: t('familySettings.mcp.regenerateTitle'),
      message: t('familySettings.mcp.regenerateMessage'),
      confirmText: t('familySettings.mcp.regenerateConfirm'),
      type: 'danger'
    })
    if (!ok) return
  }

  mcpActionLoading.value = true
  try {
    const res = await fetch('/api/family-settings/mcp-connector', { method: 'POST', headers: getSettingsHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || t('familySettings.mcp.errors.generate'))
    }
    const data = await res.json()
    mcpConnectorUrl.value = data.url
    mcpStatus.value = { exists: true, tokenPreview: data.tokenPreview, createdAt: data.createdAt, lastUsedAt: null, requestCount: 0 }
  } catch (err) {
    alert(t('common.errorPrefix', { message: err.message }))
  } finally {
    mcpActionLoading.value = false
  }
}

const revokeMcpConnector = async () => {
  const ok = await confirm({
    title: t('familySettings.mcp.revokeTitle'),
    message: t('familySettings.mcp.revokeMessage'),
    confirmText: t('familySettings.mcp.revoke'),
    type: 'danger'
  })
  if (!ok) return

  mcpActionLoading.value = true
  try {
    const res = await fetch('/api/family-settings/mcp-connector', { method: 'DELETE', headers: getSettingsHeaders() })
    if (!res.ok) throw new Error(t('familySettings.mcp.errors.revoke'))
    mcpConnectorUrl.value = ''
    mcpStatus.value = { exists: false }
  } catch (err) {
    alert(t('common.errorPrefix', { message: err.message }))
  } finally {
    mcpActionLoading.value = false
  }
}

const copyMcpUrl = async () => {
  try {
    await navigator.clipboard.writeText(mcpConnectorUrl.value)
  } catch (err) {
    console.error('Copie dans le presse-papiers impossible :', err)
  }
}

// --- Connexion au serveur de recettes Mealie ---
const mealieLoading = ref(true)
const mealieSaving = ref(false)
const mealieStatus = ref({ configured: false })
const mealieForm = ref({ baseUrl: '', apiToken: '' })
const mealieError = ref('')
const mealieConnectedAs = ref('')

// Le drapeau de la famille courante pilote l'affichage de la recherche Mealie dans la vue Repas.
const setFamilyMealieEnabled = (enabled) => {
  if (store.currentFamily) store.currentFamily.mealieEnabled = enabled
}

const fetchMealieConfig = async () => {
  mealieLoading.value = true
  try {
    const res = await fetch('/api/family-settings/mealie', { headers: getSettingsHeaders() })
    if (!res.ok) throw new Error(t('familySettings.mealie.errors.load'))
    mealieStatus.value = await res.json()
    mealieForm.value = { baseUrl: mealieStatus.value.baseUrl || '', apiToken: '' }
  } catch (err) {
    console.error(err)
  } finally {
    mealieLoading.value = false
  }
}

const saveMealieConfig = async () => {
  mealieError.value = ''
  mealieSaving.value = true
  try {
    const res = await fetch('/api/family-settings/mealie', {
      method: 'PUT',
      headers: getSettingsHeaders(),
      body: JSON.stringify({
        baseUrl: mealieForm.value.baseUrl.trim(),
        apiToken: mealieForm.value.apiToken.trim()
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || t('familySettings.mealie.errors.save'))
    mealieStatus.value = data
    mealieConnectedAs.value = data.mealieUser || ''
    mealieForm.value = { baseUrl: data.baseUrl, apiToken: '' }
    setFamilyMealieEnabled(true)
  } catch (err) {
    mealieError.value = err.message
  } finally {
    mealieSaving.value = false
  }
}

const removeMealieConfig = async () => {
  const ok = await confirm({
    title: t('familySettings.mealie.disconnectTitle'),
    message: t('familySettings.mealie.disconnectMessage'),
    confirmText: t('familySettings.mealie.disconnect'),
    type: 'danger'
  })
  if (!ok) return

  mealieSaving.value = true
  try {
    const res = await fetch('/api/family-settings/mealie', { method: 'DELETE', headers: getSettingsHeaders() })
    if (!res.ok) throw new Error(t('familySettings.mealie.errors.delete'))
    mealieStatus.value = { configured: false }
    mealieConnectedAs.value = ''
    mealieForm.value = { baseUrl: '', apiToken: '' }
    mealieError.value = ''
    setFamilyMealieEnabled(false)
  } catch (err) {
    alert(t('common.errorPrefix', { message: err.message }))
  } finally {
    mealieSaving.value = false
  }
}

onMounted(() => {
  if (store.isFamilyAdmin) {
    fetchMcpConnectorStatus()
    fetchMealieConfig()
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

/* .modal-content (fond, rayon, largeur par defaut, ombre) vient du style global (src/style.css) */
.modal-content.modal-sm {
  max-width: 420px;
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
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
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

/* Shopping Categories Card & Shortcuts Card */
.shopping-cats-card,
.shortcuts-admin-card {
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.shopping-cats-header,
.shortcuts-admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.section-title-group {
  flex: 1;
  min-width: 0;
}

.title-icon-shopping {
  color: var(--accent-amber, #f59e0b);
}

.title-icon-shortcuts {
  color: var(--accent-primary, #6366f1);
}

.btn-add-category,
.btn-add-shortcut {
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

/* Members Admin Card */
.members-admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.title-icon-members {
  color: var(--accent-rose, #f43f5e);
}

.btn-header-add-member {
  white-space: nowrap;
}

.members-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

@media (max-width: 850px) {
  .members-cards-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.member-card {
  padding: 0.85rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  min-width: 0;
  box-sizing: border-box;
}

.member-card.clickable {
  cursor: pointer;
}

.member-card.clickable:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: var(--bg-card-hover);
}

.member-card-top {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  margin-bottom: 0.55rem;
}

.member-card-name {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.member-card-name strong {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: normal;
  word-break: break-word;
  line-height: 1.2;
}

.admin-badge-mini {
  font-size: 0.625rem;
  font-weight: 800;
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
}

.pending-badge-mini {
  font-size: 0.625rem;
  font-weight: 800;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}

.member-card.is-pending-card {
  opacity: 0.85;
  border-style: dashed;
  border-color: rgba(245, 158, 11, 0.4);
}

.member-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  width: 100%;
}

.member-card-sub {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.member-role-text {
  font-size: 0.725rem;
  color: var(--text-muted);
}

.member-email-sub {
  font-size: 0.675rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

/* .btn-icon-chip vient du style global (src/style.css) ; .is-admin est un etat permanent propre a cette vue */
.btn-icon-chip.is-admin {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.3);
}

/* Ce modificateur manquait déjà pour la modale à L853 (justify-content restait flex-end par défaut) */
.modal-footer.flex-between {
  justify-content: space-between;
}

.modal-actions-right {
  display: flex;
  gap: 0.75rem;
}

.btn-resend-welcome {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary);
  border-color: rgba(99, 102, 241, 0.3);
}

.btn-resend-welcome:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: var(--accent-primary);
}

@media (max-width: 640px) {
  .members-admin-header {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-header-add-member {
    width: 100%;
    justify-content: center;
  }
  .modal-footer.flex-between {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .btn-resend-welcome {
    width: 100%;
    justify-content: center;
  }
  .modal-actions-right {
    justify-content: flex-end;
  }
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

/* MCP Connector Card */
.mcp-connector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.title-icon-mcp {
  color: var(--accent-indigo, #6366f1);
}

.mcp-status-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.mcp-status-line code {
  background: var(--bg-tertiary);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm, 4px);
}

.mcp-url-reveal {
  background: var(--bg-tertiary);
  border: 1px dashed var(--accent-indigo, #6366f1);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1rem;
}

.mcp-url-warning {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.6rem 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-warning, #d97706);
}

.mcp-url-row {
  display: flex;
  gap: 0.5rem;
}

.mcp-url-input {
  flex: 1;
  min-width: 0;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.85rem;
}

.mcp-connector-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

/* Mealie Card */
.title-icon-mealie {
  color: var(--accent-amber, #f59e0b);
}

.mealie-status {
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.mealie-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0 1rem;
}

.mealie-error {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: var(--accent-rose);
}

/* Shortcuts Admin Card */
.empty-shortcuts-notice {
  padding: 1.75rem;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
}

.shortcuts-admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.85rem;
}

.shortcut-admin-card-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.shortcut-admin-card-item:hover {
  border-color: var(--accent-primary, #6366f1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.shortcut-item-emoji {
  font-size: 1.6rem;
  line-height: 1;
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.shortcut-item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.shortcut-item-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-item-url {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.shortcut-item-url .url-text {
  max-width: 190px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-item-url:hover {
  color: var(--accent-primary, #6366f1);
}

.shortcut-item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-sc-action {
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

.btn-sc-action.edit:hover {
  color: var(--accent-primary, #6366f1);
  border-color: var(--accent-primary, #6366f1);
  background: rgba(99, 102, 241, 0.1);
}

.btn-sc-action.delete:hover {
  color: var(--accent-rose, #f43f5e);
  border-color: var(--accent-rose, #f43f5e);
  background: rgba(244, 63, 94, 0.1);
}

.modal-shortcut-content {
  max-width: 480px;
}

.help-subtext {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.35rem;
}

/* Ancrage de l'alternance A/B, affiché sous la grille de présence habituelle */
.anchor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.9rem;
  padding: 0.7rem 0.8rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.anchor-row .help-subtext {
  margin-top: 0;
  flex: 1;
  min-width: 200px;
}
</style>
