<template>
  <div class="dashboard-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <span>Bonjour {{ authStore.user?.firstName || 'la Famille' }} !</span> 👋
        </h1>
        <p class="page-subtitle">Voici l'aperçu de l'organisation et des activités d'aujourd'hui.</p>
      </div>

      <div class="quick-actions">
        <!-- Add Member Button: Only visible to Admin -->
        <button v-if="authStore.isAdmin" @click="showAddMemberModal = true" class="btn btn-secondary">
          <UserPlus :size="18" />
          <span>+ Ajouter un Membre</span>
        </button>

        <router-link to="/tasks" class="btn btn-primary">
          <Plus :size="18" />
          <span>Nouvelle Tâche</span>
        </router-link>
      </div>
    </div>

    <!-- Summary Metrics Grid -->
    <div class="grid-4 metric-grid">
      <!-- Card 1: Task Completion -->
      <router-link to="/tasks" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper indigo">
          <CheckSquare :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Progression des Tâches</span>
          <div class="metric-value">{{ store.taskCompletionPercentage }}%</div>
          <div class="progress-bar-bg margin-top-xs">
            <div class="progress-bar-fill" :style="{ width: store.taskCompletionPercentage + '%' }"></div>
          </div>
          <span class="metric-subtext">{{ store.pendingTasksCount }} tâche(s) en attente</span>
        </div>
      </router-link>

      <!-- Card 2: Upcoming Events -->
      <router-link to="/calendar" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper purple">
          <Calendar :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Événements à venir</span>
          <div class="metric-value">{{ store.events.length }}</div>
          <span class="metric-subtext" v-if="nextEvent">
            Prochain : {{ nextEvent.title }} ({{ formatDate(nextEvent.date) }})
          </span>
          <span class="metric-subtext" v-else>Aucun événement planifié</span>
        </div>
      </router-link>

      <!-- Card 3: Absences & Meals Today -->
      <router-link to="/absences" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper emerald">
          <UtensilsCrossed :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Repas & Invités</span>
          <div class="metric-value" :class="{ 'metric-value-text': store.todayAbsences.length === 0 && store.todayMealGuests.length === 0 }">
            {{ todayMealsCardValue }}
          </div>
          <span class="metric-subtext">
            {{ formatTodayAbsencesSubtext() }}
          </span>
        </div>
      </router-link>

      <!-- Card 4: Shopping Items -->
      <router-link to="/shopping" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper amber">
          <ShoppingCart :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">Articles à Acheter</span>
          <div class="metric-value">{{ store.pendingShoppingCount }}</div>
          <span class="metric-subtext">
            {{ urgentShoppingCount }} article(s) urgent(s)
          </span>
        </div>
      </router-link>
    </div>

    <!-- Main Content Section: 2 Columns -->
    <div class="grid-2 dashboard-main-grid">
      <!-- Column 1: Today's Tasks Checklist -->
      <div class="glass-card section-card">
        <div class="section-card-header">
          <div class="header-title">
            <CheckSquare :size="20" class="text-indigo" />
            <h2>Tâches à Réaliser</h2>
          </div>
          <router-link to="/tasks" class="view-all-link">Tout voir &rarr;</router-link>
        </div>

        <div class="tasks-list">
          <div 
            v-for="task in dashboardTasks" 
            :key="task.id"
            class="task-item-row"
            :class="{ completed: task.completed }"
          >
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="store.toggleTask(task.id)" 
              class="custom-checkbox"
            />
            <div class="task-info">
              <span class="task-title-text">{{ task.title }}</span>
              <div class="task-meta">
                <span class="badge badge-indigo">{{ task.category }}</span>
                <span class="assigned-tag">
                  {{ getMemberName(task.assignedTo) }}
                </span>
              </div>
            </div>
            <span class="task-points-pill">+{{ task.points }} pts</span>
          </div>

          <div v-if="dashboardTasks.length === 0" class="empty-state">
            🎉 Toutes les tâches sont terminées ! Bravo !
          </div>
        </div>
      </div>

      <!-- Column 2: Upcoming Calendar Events & Members Overview -->
      <div class="dashboard-column-right">
        <!-- Today's Meals & Night Breakdown Widget -->
        <div class="glass-card section-card margin-bottom-md today-meals-widget">
          <div class="section-card-header">
            <div class="header-title">
              <UtensilsCrossed :size="20" class="text-emerald" />
              <h2>Repas & Nuit d'Aujourd'hui</h2>
            </div>
            <router-link to="/absences" class="view-all-link">Voir le planning &rarr;</router-link>
          </div>

          <div class="today-slots-list">
            <!-- Déjeuner (Midi) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <span class="slot-row-icon">☀️</span>
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Déjeuner</span>
                    <span class="slot-row-subtitle">Midi</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-lunch">
                    <strong>{{ lunchHeadcount }}</strong> à table
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayLunchAbsents.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayLunchAbsents.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="abs in todayLunchAbsents" 
                      :key="'l-abs-' + abs.id" 
                      class="person-tag absent-tag"
                      :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                    >
                      {{ getMemberAvatar(abs.memberId) }} {{ getMemberFirstName(abs.memberId) }}
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayLunchGuests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayLunchGuests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayLunchGuests" 
                      :key="'l-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Invité'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet -->
                <div v-if="todayLunchAbsents.length === 0 && todayLunchGuests.length === 0" class="slot-all-present">
                  🎉 Au complet ({{ store.members.length }} membres) sans invité
                </div>
              </div>
            </div>

            <!-- Dîner (Soir) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <span class="slot-row-icon">🌙</span>
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Dîner</span>
                    <span class="slot-row-subtitle">Soir</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-dinner">
                    <strong>{{ dinnerHeadcount }}</strong> à table
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayDinnerAbsents.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayDinnerAbsents.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="abs in todayDinnerAbsents" 
                      :key="'d-abs-' + abs.id" 
                      class="person-tag absent-tag"
                      :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                    >
                      {{ getMemberAvatar(abs.memberId) }} {{ getMemberFirstName(abs.memberId) }}
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayDinnerGuests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayDinnerGuests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayDinnerGuests" 
                      :key="'d-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Invité'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet -->
                <div v-if="todayDinnerAbsents.length === 0 && todayDinnerGuests.length === 0" class="slot-all-present">
                  🎉 Au complet ({{ store.members.length }} membres) sans invité
                </div>
              </div>
            </div>

            <!-- Nuit (Couchage) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <span class="slot-row-icon">🛌</span>
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">Nuit</span>
                    <span class="slot-row-subtitle">Couchage</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-night">
                    <strong>{{ nightHeadcount }}</strong> présent{{ nightHeadcount > 1 ? 's' : '' }}
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents (dorment ailleurs) -->
                <div v-if="todayNightAbsents.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">Absents ({{ todayNightAbsents.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="abs in todayNightAbsents" 
                      :key="'n-abs-' + abs.id" 
                      class="person-tag absent-tag"
                      :title="abs.note ? `Motif: ${abs.note}` : 'Dort ailleurs'"
                    >
                      {{ getMemberAvatar(abs.memberId) }} {{ getMemberFirstName(abs.memberId) }}
                    </span>
                  </div>
                </div>

                <!-- Invités (dorment à la maison) -->
                <div v-if="todayNightGuests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">Invités ({{ todayNightGuests.length }}) :</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayNightGuests" 
                      :key="'n-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? `Note: ${g.note}` : 'Dort à la maison'"
                    >
                      👥 {{ g.name }}
                    </span>
                  </div>
                </div>

                <!-- Au complet -->
                <div v-if="todayNightAbsents.length === 0 && todayNightGuests.length === 0" class="slot-all-present">
                  💤 Tout le monde dort à la maison ({{ store.members.length }})
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Events List Widget -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <Calendar :size="20" class="text-purple" />
              <h2>Prochains Événements</h2>
            </div>
            <router-link to="/calendar" class="view-all-link">Voir l'agenda &rarr;</router-link>
          </div>

          <div class="events-list">
            <div 
              v-for="event in dashboardEvents" 
              :key="event.id"
              class="event-item-row"
            >
              <div class="event-date-box" :style="{ borderColor: event.color }">
                <span class="event-day">{{ getDayNumber(event.date) }}</span>
                <span class="event-month">{{ getMonthShort(event.date) }}</span>
              </div>
              <div class="event-details">
                <span class="event-item-title">{{ event.title }}</span>
                <div class="event-meta-info">
                  <Clock :size="14" />
                  <span>{{ event.time }}</span>
                  <MapPin :size="14" class="margin-left-xs" />
                  <span>{{ event.location }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Members Points & Rewards -->
        <div class="glass-card section-card">
          <div class="section-card-header">
            <div class="header-title">
              <Users :size="20" class="text-amber" />
              <h2>Membres ({{ store.members.length }})</h2>
            </div>

            <!-- Only Admin can see + Membre button -->
            <button v-if="authStore.isAdmin" @click="showAddMemberModal = true" class="btn btn-sm btn-secondary">
              <UserPlus :size="14" />
              <span>+ Membre</span>
            </button>
            <span v-else class="admin-only-tag" title="Seul l'administrateur peut gérer les membres">
              <ShieldAlert :size="14" /> Lecture seule
            </span>
          </div>

          <!-- Members Grid (Clickable by Admin to Edit Member) -->
          <div class="members-cards-grid">
            <div 
              v-for="member in store.members" 
              :key="member.id" 
              class="member-card"
              :class="{ clickable: authStore.isAdmin }"
              @click="authStore.isAdmin && openEditMemberModal(member)"
              :title="authStore.isAdmin ? 'Cliquez pour modifier les informations de ce membre' : ''"
            >
              <div class="member-card-header">
                <span class="avatar-emoji">{{ member.avatar }}</span>
                <div class="member-card-name">
                  <div class="member-title-line">
                    <strong>{{ member.name }}</strong>
                    <span v-if="member.isAdmin" class="admin-badge-mini" title="Administrateur">
                      <ShieldCheck :size="12" /> Admin
                    </span>
                  </div>
                  <span>{{ member.role }}</span>
                  <span v-if="member.email" class="member-email-sub">{{ member.email }}</span>
                </div>

                <div class="member-actions">
                  <span class="pts-badge" :style="{ backgroundColor: member.color + '20', color: member.color }">
                    {{ member.points }} pts
                  </span>

                  <!-- Edit icon button for Admin -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="openEditMemberModal(member)" 
                    class="btn-icon-action"
                    title="Modifier ce membre"
                  >
                    <Edit3 :size="14" />
                  </button>

                  <!-- Toggle Admin status button (Admin only) -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="handleToggleAdmin(member)" 
                    class="btn-icon-action"
                    :class="{ 'is-admin': member.isAdmin }"
                    :title="member.isAdmin ? 'Rétrograder en membre standard' : 'Nommer administrateur'"
                  >
                    <ShieldCheck v-if="member.isAdmin" :size="14" />
                    <Shield v-else :size="14" />
                  </button>

                  <!-- Delete member icon (Admin only) -->
                  <button 
                    v-if="authStore.isAdmin" 
                    @click.stop="handleDeleteMember(member)" 
                    class="btn-icon-action delete"
                    title="Supprimer ce membre (Administrateur)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
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
          <h3>Ajouter un Membre de la Famille</h3>
          <button @click="showAddMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleAddMember">
          <div class="grid-2">
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
              <label class="form-label">Adresse Email (Login)</label>
              <input 
                v-model="newMember.email" 
                type="email" 
                required 
                placeholder="lucas@family-gest.org"
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Mot de passe temporaire</label>
              <input 
                v-model="newMember.password" 
                type="password" 
                required 
                placeholder="10 car. min, Maj, min, chiffre, spécial"
                class="form-input" 
              />
              <PasswordStrengthIndicator :password="newMember.password" />
            </div>
          </div>

          <div class="welcome-email-tip">
            <Mail :size="16" class="text-indigo flex-shrink-0" />
            <span>Un email de bienvenue contenant un lien d'activation sécurisé (validité 2h) sera automatiquement envoyé pour lui permettre de choisir son mot de passe.</span>
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
                  <strong>Définir comme Administrateur</strong>
                </span>
              </label>
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
                :class="{ selected: newMember.avatar === emoji }"
                @click="newMember.avatar = emoji"
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
                :class="{ selected: newMember.color === c }"
                @click="newMember.color = c"
              ></button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="showAddMemberModal = false" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary">Créer le membre</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Modifier un Membre (Administrateur Uniquement) -->
    <div v-if="showEditMemberModal" class="modal-overlay" @click.self="showEditMemberModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Modifier le Membre : {{ editingMember?.name }}</h3>
          <button @click="showEditMemberModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSaveEditMember">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input 
                v-model="editMemberForm.firstName" 
                type="text" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nom de famille</label>
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
              <label class="form-label">Adresse Email (Login)</label>
              <input 
                v-model="editMemberForm.email" 
                type="email" 
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nouveau Mot de passe (Optionnel)</label>
              <input 
                v-model="editMemberForm.password" 
                type="password" 
                placeholder="Laisser vide pour ne pas changer"
                class="form-input" 
              />
              <PasswordStrengthIndicator v-if="editMemberForm.password" :password="editMemberForm.password" />
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label class="form-label">Rôle familial</label>
              <select v-model="editMemberForm.role" class="form-select">
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
              <label class="form-label">Points</label>
              <input 
                v-model.number="editMemberForm.points" 
                type="number" 
                min="0" 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Administrateur</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="editMemberForm.isAdmin" class="custom-checkbox" />
                <span class="checkbox-text">
                  <ShieldCheck :size="16" class="text-indigo" />
                  <strong>Admin</strong>
                </span>
              </label>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Notifications Web (PWA)</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="editMemberForm.pushNotificationsEnabled" class="custom-checkbox" />
                <span class="checkbox-text">
                  <Bell :size="16" class="text-indigo" />
                  <strong>Alertes Web</strong>
                </span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Notifications par Email</label>
              <label class="admin-checkbox-card">
                <input type="checkbox" v-model="editMemberForm.emailNotificationsEnabled" class="custom-checkbox" />
                <span class="checkbox-text">
                  <Mail :size="16" class="text-indigo" />
                  <strong>Alertes Email</strong>
                </span>
              </label>
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
                :class="{ selected: editMemberForm.avatar === emoji }"
                @click="editMemberForm.avatar = emoji"
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
              title="Envoyer un email avec un nouveau lien d'activation valable 2 heures"
            >
              <Mail :size="15" />
              <span>{{ resendingEmail ? 'Envoi...' : 'Renvoyer l\'email de bienvenue' }}</span>
            </button>

            <div class="modal-actions-right">
              <button type="button" @click="showEditMemberModal = false" class="btn btn-secondary">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="savingEdit">
                <span v-if="!savingEdit">Enregistrer les modifications</span>
                <span v-else>Enregistrement...</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  CheckSquare, 
  Calendar, 
  UtensilsCrossed, 
  ShoppingCart, 
  Plus, 
  UserPlus,
  Trash2,
  Clock, 
  MapPin, 
  Users,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Edit3,
  Mail,
  Bell
} from '@lucide/vue'
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator.vue'
import { isPasswordValid, getPasswordErrorMessage } from '../utils/passwordValidator'

const authStore = useAuthStore()
const store = useFamilyStore()

const todayMealsCardValue = computed(() => {
  const absCount = store.todayAbsences.length
  const guestsCount = store.todayMealGuests.length

  if (absCount === 0 && guestsCount === 0) return 'Au complet'
  if (absCount === 0 && guestsCount > 0) return `+${guestsCount} invité${guestsCount > 1 ? 's' : ''}`
  if (absCount > 0 && guestsCount === 0) return `${absCount} absent${absCount > 1 ? 's' : ''}`
  return `-${absCount} / +${guestsCount}`
})

const formatTodayAbsencesSubtext = () => {
  const absCount = store.todayAbsences.length
  const guestsCount = store.todayMealGuests.length

  if (absCount === 0 && guestsCount === 0) {
    return 'Aucune absence signalée'
  }

  const parts = []
  if (absCount > 0) {
    const lunch = store.todayAbsences.filter(a => a.lunch).length
    const dinner = store.todayAbsences.filter(a => a.dinner).length
    const night = store.todayAbsences.filter(a => a.night).length
    const absParts = []
    if (lunch > 0) absParts.push(`☀️ ${lunch}`)
    if (dinner > 0) absParts.push(`🌙 ${dinner}`)
    if (night > 0) absParts.push(`🛌 ${night}`)
    parts.push(`Absents (${absParts.join(' ')})`)
  }

  if (guestsCount > 0) {
    parts.push(`👥 ${guestsCount} invité${guestsCount > 1 ? 's' : ''}`)
  }

  return parts.join(' • ')
}

const todayLunchAbsents = computed(() => store.todayAbsences.filter(a => a.lunch))
const todayDinnerAbsents = computed(() => store.todayAbsences.filter(a => a.dinner))
const todayNightAbsents = computed(() => store.todayAbsences.filter(a => a.night))

const todayLunchGuests = computed(() => store.todayMealGuests.filter(g => g.lunch))
const todayDinnerGuests = computed(() => store.todayMealGuests.filter(g => g.dinner))
const todayNightGuests = computed(() => store.todayMealGuests.filter(g => g.night))

const lunchHeadcount = computed(() => {
  return Math.max(0, store.members.length - todayLunchAbsents.value.length) + todayLunchGuests.value.length
})

const dinnerHeadcount = computed(() => {
  return Math.max(0, store.members.length - todayDinnerAbsents.value.length) + todayDinnerGuests.value.length
})

const nightHeadcount = computed(() => {
  return Math.max(0, store.members.length - todayNightAbsents.value.length) + todayNightGuests.value.length
})

const getMemberAvatar = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  return m ? m.avatar : '👤'
}

const getMemberFirstName = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  if (!m) return 'Inconnu'
  return m.firstName || (m.name ? m.name.split(' ')[0] : 'Membre')
}

const showAddMemberModal = ref(false)
const showEditMemberModal = ref(false)
const editingMember = ref(null)
const savingEdit = ref(false)
const resendingEmail = ref(false)

const handleResendWelcomeEmail = async (memberId) => {
  if (!memberId) return
  resendingEmail.value = true
  const res = await store.resendWelcomeEmail(memberId)
  resendingEmail.value = false

  if (res.success) {
    alert(`✉️ ${res.message || 'Email de bienvenue envoyé avec succès !'}`)
  } else {
    alert(`⚠️ ${res.error || 'Erreur lors de l\'envoi de l\'email'}`)
  }
}

const avatarOptions = ['👨‍💼', '👩‍⚕️', '👦', '👧', '👶', '🧑', '👨‍🍳', '👵', '👴', '🐱', '🐶']
const colorOptions = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e']

const newMember = ref({
  firstName: '',
  lastName: 'Martin',
  email: '',
  password: 'Family2026!*',
  role: 'Fils',
  isAdmin: false,
  avatar: '👦',
  color: '#6366f1'
})

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
  color: '#6366f1'
})

const dashboardTasks = computed(() => {
  return store.tasks.slice(0, 5)
})

const dashboardEvents = computed(() => {
  return store.events.slice(0, 3)
})

const nextEvent = computed(() => {
  return store.events[0] || null
})

const urgentShoppingCount = computed(() => {
  return store.shoppingList.filter(item => item.urgent && !item.checked).length
})

const getMemberName = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  return m ? m.name : 'Tous'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const getDayNumber = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).getDate()
}

const getMonthShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
}

const handleAddMember = async () => {
  if (!newMember.value.firstName.trim() || !newMember.value.email.trim() || !newMember.value.password) return

  if (!isPasswordValid(newMember.value.password)) {
    alert(getPasswordErrorMessage(newMember.value.password))
    return
  }

  const result = await store.addMember(newMember.value)
  if (result.success) {
    showAddMemberModal.value = false
    newMember.value = {
      firstName: '',
      lastName: 'Martin',
      email: '',
      password: 'Family2026!*',
      role: 'Fils',
      isAdmin: false,
      avatar: '👦',
      color: '#6366f1'
    }
  } else {
    alert(result.error || 'Erreur lors de l\'ajout du membre')
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
    avatar: member.avatar || '👤',
    color: member.color || '#6366f1',
    pushNotificationsEnabled: member.pushNotificationsEnabled !== false,
    emailNotificationsEnabled: Boolean(member.emailNotificationsEnabled)
  }
  showEditMemberModal.value = true
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
      alert('Impossible de retirer le statut administrateur : il s\'agit du dernier administrateur du système.')
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
      alert(res.error || 'Erreur lors de la modification du membre')
    }
  } catch (err) {
    alert(err.message || 'Erreur lors de l\'enregistrement')
  } finally {
    savingEdit.value = false
  }
}

const handleToggleAdmin = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert('Impossible de retirer le statut administrateur : il s\'agit du dernier administrateur du système.')
      return
    }
  }
  const action = member.isAdmin ? 'retirer les droits d\'administrateur à' : 'nommer administrateur'
  if (confirm(`Voulez-vous ${action} ${member.name} ?`)) {
    await store.toggleAdminStatus(member.id)
  }
}

const handleDeleteMember = async (member) => {
  if (member.isAdmin) {
    const adminCount = store.members.filter(m => m.isAdmin).length
    if (adminCount <= 1) {
      alert('Impossible de supprimer cet administrateur : il s\'agit du dernier administrateur du système.')
      return
    }
  }
  if (confirm(`Voulez-vous vraiment supprimer ${member.name} de la famille ?`)) {
    await store.deleteMember(member.id)
  }
}
</script>

<style scoped>
.dashboard-view {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .quick-actions {
    width: 100%;
  }
  .quick-actions .btn {
    flex: 1;
    min-width: 130px;
    justify-content: center;
  }
}

.metric-grid {
  margin-bottom: 2rem;
}

.metric-card {
  padding: 1.25rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  text-decoration: none !important;
  color: inherit;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.metric-card.clickable-card {
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.metric-card.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(16, 185, 129, 0.4);
}

.metric-card * {
  text-decoration: none !important;
}

.metric-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.metric-icon-wrapper.indigo { background: linear-gradient(135deg, #6366f1, #818cf8); }
.metric-icon-wrapper.purple { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.metric-icon-wrapper.emerald { background: linear-gradient(135deg, #10b981, #34d399); }
.metric-icon-wrapper.amber { background: linear-gradient(135deg, #f59e0b, #fbbf24); }

.metric-details {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0.15rem 0;
  line-height: 1.2;
}

.metric-value.metric-value-text {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.metric-subtext {
  font-size: 0.775rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  overflow-wrap: break-word;
}

.margin-top-xs { margin-top: 0.4rem; }
.margin-bottom-md { margin-bottom: 1.5rem; }
.margin-left-xs { margin-left: 0.5rem; }

.section-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .section-card {
    padding: 1.1rem 0.9rem;
  }
}

.section-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.header-title h2 {
  font-size: 1.15rem;
  font-weight: 700;
  overflow-wrap: break-word;
}

.text-indigo { color: var(--accent-primary); }
.text-purple { color: var(--accent-purple); }
.text-amber { color: var(--accent-amber); }
.text-emerald { color: var(--accent-secondary); }

.admin-only-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.view-all-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-decoration: none;
}
.view-all-link:hover { text-decoration: underline; }

/* Today's Meals & Night Widget */
.today-slots-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.today-slot-row {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  min-width: 0;
  box-sizing: border-box;
}

.today-slot-row:hover {
  border-color: rgba(99, 102, 241, 0.25);
}

.slot-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.slot-header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.slot-row-icon {
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
}

.slot-row-title-col {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.slot-row-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.slot-row-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.headcount-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.headcount-badge strong {
  font-weight: 800;
}

.badge-lunch {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
[data-theme="dark"] .badge-lunch {
  color: #fbbf24;
}

.badge-dinner {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
[data-theme="dark"] .badge-dinner {
  color: #a5b4fc;
}

.badge-night {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
  border: 1px solid rgba(139, 92, 246, 0.25);
}
[data-theme="dark"] .badge-night {
  color: #c4b5fd;
}

.slot-row-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 1.9rem;
  min-width: 0;
}

.slot-detail-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail-badge-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.detail-badge-label.absent-badge {
  color: #ef4444;
}

.detail-badge-label.guest-badge {
  color: var(--accent-secondary);
}

.detail-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.person-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  font-weight: 600;
}

.absent-tag {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
[data-theme="dark"] .absent-tag {
  color: #f87171;
}

.guest-tag {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
[data-theme="dark"] .guest-tag {
  color: #34d399;
}

.slot-all-present {
  font-size: 0.785rem;
  color: var(--text-muted);
  font-weight: 500;
  word-break: break-word;
  overflow-wrap: break-word;
}

@media (max-width: 480px) {
  .today-slot-row {
    padding: 0.65rem 0.75rem;
  }
  .slot-row-content {
    padding-left: 0;
  }
  .headcount-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }
}

/* Tasks list styling */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.task-item-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
  min-width: 0;
  box-sizing: border-box;
}

.task-item-row.completed { opacity: 0.65; }
.task-item-row.completed .task-title-text { text-decoration: line-through; }

.custom-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--accent-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.task-title-text { 
  font-size: 0.925rem; 
  font-weight: 600; 
  word-break: break-word;
  overflow-wrap: break-word;
}

.task-meta { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  flex-wrap: wrap;
}

.assigned-tag { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }

.task-points-pill {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--accent-secondary);
  background: var(--accent-secondary-light);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

/* Events list */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.event-item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  min-width: 0;
  box-sizing: border-box;
}

.event-date-box {
  width: 44px;
  height: 48px;
  border-left: 4px solid var(--accent-purple);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.event-day { font-size: 1.1rem; font-weight: 800; line-height: 1; }
.event-month { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); }
.event-details { 
  display: flex; 
  flex-direction: column; 
  gap: 0.2rem; 
  min-width: 0;
  flex: 1;
}

.event-item-title { 
  font-size: 0.9rem; 
  font-weight: 700; 
  word-break: break-word;
  overflow-wrap: break-word;
}

.event-meta-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.775rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

/* Members Grid */
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

.member-card-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.avatar-emoji { 
  font-size: 1.4rem; 
  flex-shrink: 0;
}

.member-card-name {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.member-title-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.member-card-name strong { 
  font-size: 0.85rem; 
  word-break: break-word;
  overflow-wrap: break-word;
}

.member-card-name span { font-size: 0.725rem; color: var(--text-muted); }

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
  flex-wrap: wrap;
  margin-left: auto;
}

.pts-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
}

.btn-icon-action {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon-action.is-admin {
  background: var(--accent-rose-light);
  color: var(--accent-rose);
  border-color: rgba(244, 63, 94, 0.3);
}

.btn-icon-action:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-icon-action.delete:hover {
  border-color: var(--accent-rose);
  color: var(--accent-rose);
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

/* Avatar picker options */
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
.empty-state { 
  padding: 1.75rem 0.5rem; 
  text-align: center; 
  color: var(--text-muted); 
  font-weight: 600; 
  word-break: break-word;
  overflow-wrap: break-word;
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

.modal-footer.flex-between {
  justify-content: space-between;
  align-items: center;
}

.modal-actions-right {
  display: flex;
  gap: 0.75rem;
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

.flex-shrink-0 {
  flex-shrink: 0;
  margin-top: 2px;
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
</style>
