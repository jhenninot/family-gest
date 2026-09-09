<template>
  <div class="absences-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <UtensilsCrossed :size="28" class="text-indigo" />
          <span>Absences, Repas & Invités</span>
        </h1>
        <p class="page-subtitle">Indiquez vos absences ou vos invités au déjeuner, dîner et pour la nuit pour organiser sereinement les repas de famille.</p>
      </div>

      <div class="header-actions-group">
        <button @click="openAddGuestModal()" class="btn btn-secondary">
          <UserPlus :size="18" />
          <span>+ Invité(s)</span>
        </button>
        <button @click="openAddModal()" class="btn btn-primary">
          <Plus :size="18" />
          <span>Signaler une Absence</span>
        </button>
      </div>
    </div>

    <!-- Today's Meal Summary Banner -->
    <div class="today-banner glass-card">
      <div class="today-banner-header">
        <div class="today-title">
          <CalendarCheck :size="18" class="text-indigo" />
          <span>Présences, Repas & Invités d'Aujourd'hui ({{ formatDisplayDate(store.todayStr) }})</span>
        </div>
        <div class="today-header-btns">
          <button @click="openAddGuestModal(store.todayStr)" class="btn-today-add guest-btn">
            <UserPlus :size="14" /> + Invité aujourd'hui
          </button>
          <button @click="openAddModal(store.todayStr)" class="btn-today-add">
            <Plus :size="14" /> Signaler une absence
          </button>
        </div>
      </div>

      <div class="today-slots-grid">
        <!-- Déjeuner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayLunchAbsents.length > 0, 'has-guests': todayLunchGuests.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">☀️</span>
            <div class="slot-title-col">
              <span class="slot-name">Déjeuner (Midi)</span>
              <span class="slot-headcount">{{ getSlotHeadcount('lunch') }}</span>
            </div>
            <button @click="openAddGuestModal(store.todayStr, 'lunch')" class="btn-slot-quick-guest" title="Ajouter un invité pour ce midi">
              + Invité
            </button>
          </div>

          <div class="slot-members-list">
            <!-- Absents -->
            <div v-if="todayLunchAbsents.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="abs in todayLunchAbsents" 
                  :key="'abs-' + abs.id" 
                  class="member-absent-chip"
                  :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                  @click="openEditModal(abs)"
                >
                  {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayLunchGuests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayLunchGuests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Invité(e)'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayLunchAbsents.length === 0 && todayLunchGuests.length === 0" class="all-present-text">
              🎉 Toute la famille déjeune ensemble sans invité
            </div>
          </div>
        </div>

        <!-- Dîner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayDinnerAbsents.length > 0, 'has-guests': todayDinnerGuests.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">🌙</span>
            <div class="slot-title-col">
              <span class="slot-name">Dîner (Soir)</span>
              <span class="slot-headcount">{{ getSlotHeadcount('dinner') }}</span>
            </div>
            <button @click="openAddGuestModal(store.todayStr, 'dinner')" class="btn-slot-quick-guest" title="Ajouter un invité pour ce soir">
              + Invité
            </button>
          </div>

          <div class="slot-members-list">
            <!-- Absents -->
            <div v-if="todayDinnerAbsents.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="abs in todayDinnerAbsents" 
                  :key="'abs-' + abs.id" 
                  class="member-absent-chip"
                  :title="abs.note ? `Motif: ${abs.note}` : 'Absent'"
                  @click="openEditModal(abs)"
                >
                  {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayDinnerGuests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayDinnerGuests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Invité(e)'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayDinnerAbsents.length === 0 && todayDinnerGuests.length === 0" class="all-present-text">
              🎉 Tout le monde dîne à la maison sans invité
            </div>
          </div>
        </div>

        <!-- Nuit -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayNightAbsents.length > 0, 'has-guests': todayNightGuests.length > 0 }">
          <div class="slot-header">
            <span class="slot-icon">🛌</span>
            <div class="slot-title-col">
              <span class="slot-name">Nuit (Couchage)</span>
              <span class="slot-headcount">{{ getSlotHeadcount('night') }}</span>
            </div>
            <button @click="openAddGuestModal(store.todayStr, 'night')" class="btn-slot-quick-guest" title="Ajouter un invité qui dort ce soir">
              + Invité
            </button>
          </div>

          <div class="slot-members-list">
            <!-- Absents -->
            <div v-if="todayNightAbsents.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="abs in todayNightAbsents" 
                  :key="'abs-' + abs.id" 
                  class="member-absent-chip"
                  :title="abs.note ? `Motif: ${abs.note}` : 'Dort ailleurs'"
                  @click="openEditModal(abs)"
                >
                  {{ getMemberAvatar(abs.memberId) }} {{ getMemberName(abs.memberId) }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayNightGuests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayNightGuests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Dort à la maison'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayNightAbsents.length === 0 && todayNightGuests.length === 0" class="all-present-text">
              💤 Tout le monde dort à la maison sans invité
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter by Member -->
    <div class="filter-bar">
      <span class="filter-label">Filtrer par membre :</span>
      <div class="filter-pills">
        <button 
          class="filter-pill" 
          :class="{ active: selectedMemberFilter === null }"
          @click="selectedMemberFilter = null"
        >
          Tous les membres
        </button>
        <button 
          v-for="member in store.members" 
          :key="member.id"
          class="filter-pill"
          :class="{ active: selectedMemberFilter === member.id }"
          @click="selectedMemberFilter = member.id"
        >
          <span>{{ member.avatar }}</span>
          <span>{{ member.firstName || member.name.split(' ')[0] }}</span>
        </button>
      </div>
    </div>

    <!-- Main Grid: Calendar & Upcoming List -->
    <div class="grid-2 absences-main-grid">
      <!-- Calendar View Column -->
      <div class="glass-card section-card">
        <div class="section-card-header flex-between">
          <div class="calendar-nav-title">
            <h2>{{ currentMonthName }} {{ currentYear }}</h2>
          </div>
          <div class="calendar-nav-controls">
            <button @click="prevMonth" class="btn-icon" title="Mois précédent">
              <ChevronLeft :size="18" />
            </button>
            <button @click="goToToday" class="btn-today-nav">
              Aujourd'hui
            </button>
            <button @click="nextMonth" class="btn-icon" title="Mois suivant">
              <ChevronRight :size="18" />
            </button>
          </div>
        </div>

        <!-- Days of week -->
        <div class="calendar-grid-header">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>

        <!-- Calendar Days Grid -->
        <div class="calendar-days-grid">
          <!-- Leading empty/padding days -->
          <div 
            v-for="pad in leadingPaddingDays" 
            :key="'pad-' + pad" 
            class="day-cell day-empty"
          ></div>

          <!-- Month Days -->
          <div 
            v-for="day in daysInCurrentMonth" 
            :key="'day-' + day"
            class="day-cell"
            :class="{ 
              today: isDayToday(day),
              'has-absences': getDayAbsences(day).length > 0,
              'has-day-guests': getDayGuests(day).length > 0
            }"
            @click="openDayDetailModal(formatDateStr(currentYear, currentMonth, day))"
            :title="'Cliquer pour voir le détail du ' + day + ' ' + currentMonthName"
          >
            <div class="day-cell-top">
              <span class="day-number">{{ day }}</span>
              <div class="day-indicators">
                <span v-if="getDayAbsences(day).length > 0" class="mini-indicator absence" title="Absence(s)">
                  {{ getDayAbsences(day).length }} absent{{ getDayAbsences(day).length > 1 ? 's' : '' }}
                </span>
                <span v-if="getDayGuests(day).length > 0" class="mini-indicator guest" title="Invité(s)">
                  👥 {{ getDayGuests(day).length }}
                </span>
              </div>
            </div>

            <!-- Absences & Guests preview inside this day -->
            <div class="day-absences-container">
              <!-- Absences preview -->
              <div 
                v-for="abs in getDayAbsences(day).slice(0, 2)" 
                :key="'abs-' + abs.id" 
                class="day-absence-chip"
              >
                <span class="chip-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
                <span class="chip-name">{{ getMemberFirstName(abs.memberId) }}</span>
                <div class="chip-icons">
                  <span v-if="abs.lunch">☀️</span>
                  <span v-if="abs.dinner">🌙</span>
                  <span v-if="abs.night">🛌</span>
                </div>
              </div>
              <span v-if="getDayAbsences(day).length > 2" class="more-items-count">
                +{{ getDayAbsences(day).length - 2 }} autre(s)
              </span>

              <!-- Guests preview -->
              <div 
                v-for="g in getDayGuests(day).slice(0, 2)" 
                :key="'gst-' + g.id" 
                class="day-guest-chip"
              >
                <span class="chip-avatar">👥</span>
                <span class="chip-name">{{ g.name }}</span>
                <div class="chip-icons">
                  <span v-if="g.lunch">☀️</span>
                  <span v-if="g.dinner">🌙</span>
                  <span v-if="g.night">🛌</span>
                </div>
              </div>
              <span v-if="getDayGuests(day).length > 2" class="more-items-count guest">
                +{{ getDayGuests(day).length - 2 }} invité(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Absences & Guests Column -->
      <div class="glass-card section-card">
        <!-- Segmented Tabs -->
        <div class="upcoming-tabs-header">
          <button 
            class="tab-btn" 
            :class="{ active: activeUpcomingTab === 'absences' }"
            @click="activeUpcomingTab = 'absences'"
          >
            <Clock :size="16" />
            <span>Absences</span>
            <span class="tab-badge">{{ filteredUpcomingAbsences.length }}</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeUpcomingTab === 'guests' }"
            @click="activeUpcomingTab = 'guests'"
          >
            <Users :size="16" />
            <span>Invités</span>
            <span class="tab-badge indigo">{{ upcomingGuestsList.length }}</span>
          </button>
        </div>

        <!-- Absences Tab Content -->
        <div v-if="activeUpcomingTab === 'absences'" class="upcoming-absences-list">
          <div 
            v-for="abs in filteredUpcomingAbsences" 
            :key="abs.id"
            class="upcoming-absence-card"
          >
            <div class="upcoming-avatar-col">
              <span class="upcoming-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
            </div>

            <div class="upcoming-content-col">
              <div class="upcoming-card-header">
                <div class="member-name-date">
                  <strong>{{ getMemberName(abs.memberId) }}</strong>
                  <span class="absence-date-badge" :class="{ 'is-today': abs.date === store.todayStr }">
                    {{ formatRelativeDate(abs.date) }}
                  </span>
                </div>

                <div class="card-action-buttons">
                  <button 
                    v-if="canEdit(abs)" 
                    @click="openEditModal(abs)" 
                    class="btn-icon-action" 
                    title="Modifier cette absence"
                  >
                    <Edit3 :size="14" />
                  </button>
                  <button 
                    v-if="canEdit(abs)" 
                    @click="handleDelete(abs.id)" 
                    class="btn-icon-action text-danger" 
                    title="Supprimer cette absence"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <div class="slots-pill-row">
                <span v-if="abs.lunch" class="slot-tag lunch">
                  ☀️ Déjeuner
                </span>
                <span v-if="abs.dinner" class="slot-tag dinner">
                  🌙 Dîner
                </span>
                <span v-if="abs.night" class="slot-tag night">
                  🛌 Nuit
                </span>
              </div>

              <p v-if="abs.note" class="absence-note-text">
                💬 <em>{{ abs.note }}</em>
              </p>
            </div>
          </div>

          <div v-if="filteredUpcomingAbsences.length === 0" class="empty-state">
            🎉 Aucune absence à venir ! Toute la famille est réunie.
          </div>
        </div>

        <!-- Guests Tab Content -->
        <div v-else class="upcoming-absences-list">
          <div 
            v-for="g in upcomingGuestsList" 
            :key="g.id"
            class="upcoming-absence-card guest-card-theme"
          >
            <div class="upcoming-avatar-col">
              <span class="upcoming-avatar guest-avatar-badge">👥</span>
            </div>

            <div class="upcoming-content-col">
              <div class="upcoming-card-header">
                <div class="member-name-date">
                  <strong>{{ g.name }}</strong>
                  <span class="absence-date-badge is-guest-date" :class="{ 'is-today': g.date === store.todayStr }">
                    {{ formatRelativeDate(g.date) }}
                  </span>
                  <span v-if="g.invitedBy" class="guest-host-tag" :title="'Invité par ' + getMemberName(g.invitedBy)">
                    Invité par {{ getMemberFirstName(g.invitedBy) }}
                  </span>
                </div>

                <div class="card-action-buttons">
                  <button 
                    @click="openEditGuestModal(g)" 
                    class="btn-icon-action" 
                    title="Modifier cet invité"
                  >
                    <Edit3 :size="14" />
                  </button>
                  <button 
                    @click="handleDeleteGuest(g.id)" 
                    class="btn-icon-action text-danger" 
                    title="Supprimer cet invité"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <div class="slots-pill-row">
                <span v-if="g.lunch" class="slot-tag lunch">
                  ☀️ Déjeuner
                </span>
                <span v-if="g.dinner" class="slot-tag dinner">
                  🌙 Dîner
                </span>
                <span v-if="g.night" class="slot-tag night">
                  🛌 Nuit
                </span>
              </div>

              <p v-if="g.note" class="absence-note-text">
                💬 <em>{{ g.note }}</em>
              </p>
            </div>
          </div>

          <div v-if="upcomingGuestsList.length === 0" class="empty-state">
            🍽️ Aucun invité prévu prochainement.
            <button @click="openAddGuestModal()" class="btn btn-sm btn-secondary margin-top-xs">
              <UserPlus :size="14" /> + Ajouter un invité
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Signaler / Modifier Absence -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content absence-modal">
        <div class="modal-header">
          <h3>{{ editingId ? 'Modifier l\'Absence' : 'Signaler une Absence' }}</h3>
          <button @click="showModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <!-- Member selection -->
          <div class="form-group">
            <label class="form-label">Membre de la famille</label>
            <select v-model="form.memberId" class="form-select" required>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ m.avatar }} {{ m.name }} {{ m.id === authStore.user?.id ? '(Moi)' : '' }}
              </option>
            </select>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label class="form-label">Date de l'absence</label>
            <input 
              v-model="form.date" 
              type="date" 
              required 
              class="form-input" 
            />
          </div>

          <!-- Slots selection cards -->
          <div class="form-group">
            <label class="form-label">Créneau(x) d'absence :</label>
            <div class="slots-toggle-grid">
              <!-- Déjeuner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.lunch }"
                @click="form.lunch = !form.lunch"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">☀️</span>
                  <input type="checkbox" v-model="form.lunch" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Déjeuner</strong>
                <span class="slot-toggle-sub">Repas du midi</span>
              </div>

              <!-- Dîner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.dinner }"
                @click="form.dinner = !form.dinner"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🌙</span>
                  <input type="checkbox" v-model="form.dinner" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Dîner</strong>
                <span class="slot-toggle-sub">Repas du soir</span>
              </div>

              <!-- Nuit -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.night }"
                @click="form.night = !form.night"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🛌</span>
                  <input type="checkbox" v-model="form.night" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Nuit</strong>
                <span class="slot-toggle-sub">Dort ailleurs</span>
              </div>
            </div>
            <span v-if="!form.lunch && !form.dinner && !form.night" class="text-error">
              * Veuillez cocher au moins un créneau d'absence.
            </span>
          </div>

          <!-- Note / Reason -->
          <div class="form-group">
            <label class="form-label">Motif / Commentaire (Optionnel)</label>
            <input 
              v-model="form.note" 
              type="text" 
              placeholder="Ex: Invité chez Lucas, Déplacement boulot, Soirée..."
              class="form-input" 
            />
          </div>

          <div class="modal-footer flex-between">
            <button 
              v-if="editingId" 
              type="button" 
              @click="handleDelete(editingId)" 
              class="btn btn-danger"
              :disabled="saving"
            >
              <Trash2 :size="15" />
              <span>Supprimer</span>
            </button>
            <span v-else></span>

            <div class="modal-actions-right">
              <button type="button" @click="showModal = false" class="btn btn-secondary">Annuler</button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="saving || (!form.lunch && !form.dinner && !form.night)"
              >
                <span v-if="!saving">{{ editingId ? 'Enregistrer' : 'Signaler l\'absence' }}</span>
                <span v-else>Enregistrement...</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Ajouter / Modifier Invité(s) -->
    <div v-if="showGuestModal" class="modal-overlay" @click.self="showGuestModal = false">
      <div class="modal-content absence-modal">
        <div class="modal-header">
          <h3>{{ editingGuestId ? 'Modifier l\'Invité' : 'Ajouter un ou plusieurs Invité(s)' }}</h3>
          <button @click="showGuestModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleGuestSubmit">
          <!-- Guest Name (single field for full name) -->
          <div class="form-group">
            <label class="form-label">Nom et prénom de l'invité</label>
            <input 
              v-model="guestForm.name" 
              type="text" 
              required 
              placeholder="Ex: Jean Dupont (ou 'Alexandre, Sophie' pour plusieurs)"
              class="form-input" 
            />
            <span class="field-help-text">Un seul champ pour le nom et prénom. Vous pouvez indiquer plusieurs invités séparés par des virgules.</span>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label class="form-label">Date de la visite</label>
            <input 
              v-model="guestForm.date" 
              type="date" 
              required 
              class="form-input" 
            />
          </div>

          <!-- Slots selection cards -->
          <div class="form-group">
            <label class="form-label">Créneau(x) de présence de l'invité :</label>
            <div class="slots-toggle-grid">
              <!-- Déjeuner -->
              <div 
                class="slot-toggle-card guest-slot" 
                :class="{ active: guestForm.lunch }"
                @click="guestForm.lunch = !guestForm.lunch"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">☀️</span>
                  <input type="checkbox" v-model="guestForm.lunch" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Déjeuner</strong>
                <span class="slot-toggle-sub">Mange à midi</span>
              </div>

              <!-- Dîner -->
              <div 
                class="slot-toggle-card guest-slot" 
                :class="{ active: guestForm.dinner }"
                @click="guestForm.dinner = !guestForm.dinner"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🌙</span>
                  <input type="checkbox" v-model="guestForm.dinner" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Dîner</strong>
                <span class="slot-toggle-sub">Mange le soir</span>
              </div>

              <!-- Nuit -->
              <div 
                class="slot-toggle-card guest-slot" 
                :class="{ active: guestForm.night }"
                @click="guestForm.night = !guestForm.night"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🛌</span>
                  <input type="checkbox" v-model="guestForm.night" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Nuit</strong>
                <span class="slot-toggle-sub">Dort à la maison</span>
              </div>
            </div>
            <span v-if="!guestForm.lunch && !guestForm.dinner && !guestForm.night" class="text-error">
              * Veuillez cocher au moins un créneau de présence pour l'invité.
            </span>
          </div>

          <!-- Host member -->
          <div class="form-group">
            <label class="form-label">Invité par :</label>
            <select v-model="guestForm.invitedBy" class="form-select">
              <option :value="null">Toute la famille</option>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ m.avatar }} {{ m.name }} {{ m.id === authStore.user?.id ? '(Moi)' : '' }}
              </option>
            </select>
          </div>

          <!-- Note / Dietary remarks -->
          <div class="form-group">
            <label class="form-label">Remarque / Régime alimentaire (Optionnel)</label>
            <input 
              v-model="guestForm.note" 
              type="text" 
              placeholder="Ex: Végétarien, Sans gluten, Arrive à 19h..."
              class="form-input" 
            />
          </div>

          <div class="modal-footer flex-between">
            <button 
              v-if="editingGuestId" 
              type="button" 
              @click="handleDeleteGuest(editingGuestId)" 
              class="btn btn-danger"
              :disabled="saving"
            >
              <Trash2 :size="15" />
              <span>Supprimer</span>
            </button>
            <span v-else></span>

            <div class="modal-actions-right">
              <button type="button" @click="showGuestModal = false" class="btn btn-secondary">Annuler</button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="saving || (!guestForm.lunch && !guestForm.dinner && !guestForm.night)"
              >
                <span v-if="!saving">{{ editingGuestId ? 'Enregistrer' : 'Ajouter l\'invité' }}</span>
                <span v-else>Enregistrement...</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Détail du Jour (Pop-up complète pour le jour sélectionné) -->
    <div v-if="showDayDetailModal" class="modal-overlay" @click.self="showDayDetailModal = false">
      <div class="modal-content day-detail-modal">
        <div class="modal-header">
          <div class="day-detail-title-col">
            <span class="day-detail-badge">{{ formatRelativeDate(selectedDayDate) }}</span>
            <h3>{{ formatFullDisplayDate(selectedDayDate) }}</h3>
          </div>
          <button @click="showDayDetailModal = false" class="btn-close">&times;</button>
        </div>

        <div class="day-detail-body">
          <!-- Top Big Action Buttons -->
          <div class="day-detail-actions-bar">
            <button @click="openAddModalFromDay()" class="btn btn-primary btn-action-card">
              <Plus :size="18" />
              <span>Signaler une absence</span>
            </button>
            <button @click="openAddGuestModalFromDay()" class="btn btn-purple btn-action-card">
              <UserPlus :size="18" />
              <span>+ Ajouter un invité</span>
            </button>
          </div>

          <!-- Slots Details Grid -->
          <div class="day-slots-detail-list">
            <!-- Déjeuner -->
            <div class="day-slot-detail-box">
              <div class="day-slot-detail-header">
                <div class="slot-name-group">
                  <span class="slot-icon">☀️</span>
                  <strong>Déjeuner (Midi)</strong>
                </div>
                <span class="day-slot-headcount-badge">
                  {{ getSelectedDaySlotHeadcount('lunch') }}
                </span>
              </div>

              <div class="day-slot-items">
                <!-- Absents -->
                <div v-if="selectedDayLunchAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayLunchAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayLunchAbsents" :key="'lunch-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
                      <div class="person-info">
                        <strong>{{ getMemberName(abs.memberId) }}</strong>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="selectedDayLunchGuests.length > 0" class="slot-section">
                  <span class="slot-section-title text-purple">Invités présents ({{ selectedDayLunchGuests.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="g in selectedDayLunchGuests" :key="'lunch-gst-' + g.id" class="slot-person-card guest">
                      <span class="person-avatar">👥</span>
                      <div class="person-info">
                        <strong>{{ g.name }}</strong>
                        <span v-if="g.invitedBy" class="person-host">Invité par {{ getMemberFirstName(g.invitedBy) }}</span>
                        <span v-if="g.note" class="person-note">💬 {{ g.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="selectedDayLunchAbsents.length === 0 && selectedDayLunchGuests.length === 0" class="slot-empty-note">
                  ✨ Aucun absent ni invité pour le midi.
                </div>
              </div>
            </div>

            <!-- Dîner -->
            <div class="day-slot-detail-box">
              <div class="day-slot-detail-header">
                <div class="slot-name-group">
                  <span class="slot-icon">🌙</span>
                  <strong>Dîner (Soir)</strong>
                </div>
                <span class="day-slot-headcount-badge">
                  {{ getSelectedDaySlotHeadcount('dinner') }}
                </span>
              </div>

              <div class="day-slot-items">
                <!-- Absents -->
                <div v-if="selectedDayDinnerAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayDinnerAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayDinnerAbsents" :key="'dinner-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
                      <div class="person-info">
                        <strong>{{ getMemberName(abs.memberId) }}</strong>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="selectedDayDinnerGuests.length > 0" class="slot-section">
                  <span class="slot-section-title text-purple">Invités présents ({{ selectedDayDinnerGuests.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="g in selectedDayDinnerGuests" :key="'dinner-gst-' + g.id" class="slot-person-card guest">
                      <span class="person-avatar">👥</span>
                      <div class="person-info">
                        <strong>{{ g.name }}</strong>
                        <span v-if="g.invitedBy" class="person-host">Invité par {{ getMemberFirstName(g.invitedBy) }}</span>
                        <span v-if="g.note" class="person-note">💬 {{ g.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="selectedDayDinnerAbsents.length === 0 && selectedDayDinnerGuests.length === 0" class="slot-empty-note">
                  ✨ Aucun absent ni invité pour le soir.
                </div>
              </div>
            </div>

            <!-- Nuit -->
            <div class="day-slot-detail-box">
              <div class="day-slot-detail-header">
                <div class="slot-name-group">
                  <span class="slot-icon">🛌</span>
                  <strong>Nuit (Couchage)</strong>
                </div>
                <span class="day-slot-headcount-badge">
                  {{ getSelectedDaySlotHeadcount('night') }}
                </span>
              </div>

              <div class="day-slot-items">
                <!-- Absents -->
                <div v-if="selectedDayNightAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayNightAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayNightAbsents" :key="'night-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
                      <div class="person-info">
                        <strong>{{ getMemberName(abs.memberId) }}</strong>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="selectedDayNightGuests.length > 0" class="slot-section">
                  <span class="slot-section-title text-purple">Invités qui dorment ({{ selectedDayNightGuests.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="g in selectedDayNightGuests" :key="'night-gst-' + g.id" class="slot-person-card guest">
                      <span class="person-avatar">👥</span>
                      <div class="person-info">
                        <strong>{{ g.name }}</strong>
                        <span v-if="g.invitedBy" class="person-host">Invité par {{ getMemberFirstName(g.invitedBy) }}</span>
                        <span v-if="g.note" class="person-note">💬 {{ g.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="selectedDayNightAbsents.length === 0 && selectedDayNightGuests.length === 0" class="slot-empty-note">
                  💤 Tout le monde dort à la maison sans invité.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer flex-between">
          <button type="button" @click="showDayDetailModal = false" class="btn btn-secondary">
            Fermer
          </button>
          <span class="day-detail-summary-hint">Cliquez sur une action ci-dessus pour ajouter ou modifier.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { 
  UtensilsCrossed, 
  CalendarCheck, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  UserPlus,
  Users
} from '@lucide/vue'

const authStore = useAuthStore()
const store = useFamilyStore()

// Filter State
const selectedMemberFilter = ref(null)

// Tab State for Right Column (Absences vs Invités)
const activeUpcomingTab = ref('absences')

// Absence Modal State
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)

const form = ref({
  memberId: authStore.user?.id || 1,
  date: store.todayStr,
  lunch: false,
  dinner: false,
  night: false,
  note: ''
})

// Guest Modal State
const showGuestModal = ref(false)
const editingGuestId = ref(null)
const guestForm = ref({
  name: '',
  date: store.todayStr,
  lunch: true,
  dinner: false,
  night: false,
  invitedBy: authStore.user?.id || null,
  note: ''
})

// Calendar Month State
const todayDate = new Date()
const currentYear = ref(todayDate.getFullYear())
const currentMonth = ref(todayDate.getMonth()) // 0-indexed

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const currentMonthName = computed(() => monthNames[currentMonth.value])

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const goToToday = () => {
  currentYear.value = todayDate.getFullYear()
  currentMonth.value = todayDate.getMonth()
}

// Days in current month
const daysInCurrentMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// Number of leading blank cells (Monday = 1, Sunday = 7)
const leadingPaddingDays = computed(() => {
  const firstDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
  return (firstDay + 6) % 7
})

const formatDateStr = (y, m, d) => {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

const isDayToday = (day) => {
  const check = formatDateStr(currentYear.value, currentMonth.value, day)
  return check === store.todayStr
}

// Helpers
const getMemberName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.name : 'Membre'
}

const getMemberFirstName = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? (m.firstName || m.name.split(' ')[0]) : 'Membre'
}

const getMemberAvatar = (id) => {
  const m = store.members.find(m => m.id === id)
  return m ? m.avatar : '👤'
}

const canEdit = (abs) => {
  if (!authStore.user) return false
  return authStore.isAdmin || abs.memberId === authStore.user.id
}

// Filtered Absences & Guests
const filteredAbsences = computed(() => {
  if (!selectedMemberFilter.value) return store.absences
  return store.absences.filter(a => a.memberId === selectedMemberFilter.value)
})

const filteredGuests = computed(() => {
  if (!selectedMemberFilter.value) return store.mealGuests
  return store.mealGuests.filter(g => g.invitedBy === selectedMemberFilter.value)
})

const getDayAbsences = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return filteredAbsences.value.filter(a => a.date === dateStr)
}

const getDayGuests = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return filteredGuests.value.filter(g => g.date === dateStr)
}

const getAbsenceTooltip = (abs) => {
  const parts = []
  if (abs.lunch) parts.push('Déjeuner (Midi)')
  if (abs.dinner) parts.push('Dîner (Soir)')
  if (abs.night) parts.push('Nuit')
  return `${getMemberName(abs.memberId)} : Absent(e) ${parts.join(', ')}${abs.note ? ` (${abs.note})` : ''}`
}

const getGuestTooltip = (g) => {
  const parts = []
  if (g.lunch) parts.push('Déjeuner')
  if (g.dinner) parts.push('Dîner')
  if (g.night) parts.push('Nuit')
  const host = g.invitedBy ? ` (Invité par ${getMemberFirstName(g.invitedBy)})` : ''
  return `Invité(e) : ${g.name} - Présent ${parts.join(', ')}${host}${g.note ? ` - Note: ${g.note}` : ''}`
}

// Today Banner Computeds
const todayLunchAbsents = computed(() => store.todayAbsences.filter(a => a.lunch))
const todayDinnerAbsents = computed(() => store.todayAbsences.filter(a => a.dinner))
const todayNightAbsents = computed(() => store.todayAbsences.filter(a => a.night))

const todayLunchGuests = computed(() => store.todayMealGuests.filter(g => g.lunch))
const todayDinnerGuests = computed(() => store.todayMealGuests.filter(g => g.dinner))
const todayNightGuests = computed(() => store.todayMealGuests.filter(g => g.night))

const getSlotHeadcount = (slot) => {
  const totalMembers = store.members.length
  const absentsCount = slot === 'lunch' ? todayLunchAbsents.value.length : (slot === 'dinner' ? todayDinnerAbsents.value.length : todayNightAbsents.value.length)
  const guestsCount = slot === 'lunch' ? todayLunchGuests.value.length : (slot === 'dinner' ? todayDinnerGuests.value.length : todayNightGuests.value.length)
  const presentMembers = Math.max(0, totalMembers - absentsCount)
  const total = presentMembers + guestsCount

  const noun = slot === 'night' ? 'personne(s) qui dorment' : 'à table'
  if (guestsCount > 0 && absentsCount > 0) {
    return `${total} ${noun} (${presentMembers} membres + ${guestsCount} invité${guestsCount > 1 ? 's' : ''})`
  }
  if (guestsCount > 0) {
    return `${total} ${noun} (Au complet + ${guestsCount} invité${guestsCount > 1 ? 's' : ''})`
  }
  if (absentsCount > 0) {
    return `${presentMembers} ${noun} (${absentsCount} absent${absentsCount > 1 ? 's' : ''})`
  }
  return `${total} ${noun} (Au complet !)`
}

// Upcoming Lists
const filteredUpcomingAbsences = computed(() => {
  if (!selectedMemberFilter.value) return store.upcomingAbsences
  return store.upcomingAbsences.filter(a => a.memberId === selectedMemberFilter.value)
})

const upcomingGuestsList = computed(() => {
  if (!selectedMemberFilter.value) return store.upcomingMealGuests
  return store.upcomingMealGuests.filter(g => g.invitedBy === selectedMemberFilter.value)
})

// Dates formatting
const formatDisplayDate = (dStr) => {
  if (!dStr) return ''
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const formatRelativeDate = (dStr) => {
  if (dStr === store.todayStr) return 'Aujourd\'hui'
  
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  
  const tmrw = new Date()
  tmrw.setDate(tmrw.getDate() + 1)
  const tmrwStr = `${tmrw.getFullYear()}-${String(tmrw.getMonth() + 1).padStart(2, '0')}-${String(tmrw.getDate()).padStart(2, '0')}`
  if (dStr === tmrwStr) return 'Demain'

  return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Absence Modal actions
const openAddModal = (defaultDate = null) => {
  editingId.value = null
  form.value = {
    memberId: authStore.user?.id || (store.members[0]?.id || 1),
    date: defaultDate || store.todayStr,
    lunch: true,
    dinner: false,
    night: false,
    note: ''
  }
  showModal.value = true
}

const openEditModal = (abs) => {
  editingId.value = abs.id
  form.value = {
    memberId: abs.memberId,
    date: abs.date,
    lunch: Boolean(abs.lunch),
    dinner: Boolean(abs.dinner),
    night: Boolean(abs.night),
    note: abs.note || ''
  }
  showModal.value = true
}

const handleSubmit = async () => {
  if (!form.value.lunch && !form.value.dinner && !form.value.night) return
  saving.value = true

  if (editingId.value) {
    await store.updateAbsence(editingId.value, form.value)
  } else {
    await store.addAbsence(form.value)
  }

  saving.value = false
  showModal.value = false
}

const handleDelete = async (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette absence ?')) {
    saving.value = true
    await store.deleteAbsence(id)
    saving.value = false
    showModal.value = false
  }
}

// Guest Modal actions
const openAddGuestModal = (defaultDate = null, defaultSlot = null) => {
  editingGuestId.value = null
  guestForm.value = {
    name: '',
    date: defaultDate || store.todayStr,
    lunch: defaultSlot ? defaultSlot === 'lunch' : true,
    dinner: defaultSlot ? defaultSlot === 'dinner' : false,
    night: defaultSlot ? defaultSlot === 'night' : false,
    invitedBy: authStore.user?.id || null,
    note: ''
  }
  showGuestModal.value = true
}

const openEditGuestModal = (guest) => {
  editingGuestId.value = guest.id
  guestForm.value = {
    name: guest.name,
    date: guest.date,
    lunch: Boolean(guest.lunch),
    dinner: Boolean(guest.dinner),
    night: Boolean(guest.night),
    invitedBy: guest.invitedBy || null,
    note: guest.note || ''
  }
  showGuestModal.value = true
}

const handleGuestSubmit = async () => {
  if (!guestForm.value.name.trim()) return
  if (!guestForm.value.lunch && !guestForm.value.dinner && !guestForm.value.night) return

  saving.value = true

  if (editingGuestId.value) {
    await store.updateMealGuest(editingGuestId.value, guestForm.value)
  } else {
    await store.addMealGuest(guestForm.value)
  }

  saving.value = false
  showGuestModal.value = false
}

// Day Detail Modal State
const showDayDetailModal = ref(false)
const selectedDayDate = ref(store.todayStr)

const openDayDetailModal = (dateStr) => {
  selectedDayDate.value = dateStr
  showDayDetailModal.value = true
}

const openAddModalFromDay = () => {
  showDayDetailModal.value = false
  openAddModal(selectedDayDate.value)
}

const openAddGuestModalFromDay = () => {
  showDayDetailModal.value = false
  openAddGuestModal(selectedDayDate.value)
}

const openEditModalFromDay = (abs) => {
  showDayDetailModal.value = false
  openEditModal(abs)
}

const openEditGuestModalFromDay = (g) => {
  showDayDetailModal.value = false
  openEditGuestModal(g)
}

const selectedDayAbsences = computed(() => {
  return store.absences.filter(a => a.date === selectedDayDate.value)
})

const selectedDayGuests = computed(() => {
  return store.mealGuests.filter(g => g.date === selectedDayDate.value)
})

const selectedDayLunchAbsents = computed(() => selectedDayAbsences.value.filter(a => a.lunch))
const selectedDayLunchGuests = computed(() => selectedDayGuests.value.filter(g => g.lunch))

const selectedDayDinnerAbsents = computed(() => selectedDayAbsences.value.filter(a => a.dinner))
const selectedDayDinnerGuests = computed(() => selectedDayGuests.value.filter(g => g.dinner))

const selectedDayNightAbsents = computed(() => selectedDayAbsences.value.filter(a => a.night))
const selectedDayNightGuests = computed(() => selectedDayGuests.value.filter(g => g.night))

const getSelectedDaySlotHeadcount = (slot) => {
  const totalMembers = store.members.length
  const absCount = slot === 'lunch' ? selectedDayLunchAbsents.value.length : (slot === 'dinner' ? selectedDayDinnerAbsents.value.length : selectedDayNightAbsents.value.length)
  const gCount = slot === 'lunch' ? selectedDayLunchGuests.value.length : (slot === 'dinner' ? selectedDayDinnerGuests.value.length : selectedDayNightGuests.value.length)
  const present = Math.max(0, totalMembers - absCount)
  const total = present + gCount

  const noun = slot === 'night' ? 'couchage(s)' : 'à table'
  if (gCount > 0 && absCount > 0) {
    return `${total} ${noun} (${present} membres + ${gCount} invité${gCount > 1 ? 's' : ''})`
  }
  if (gCount > 0) {
    return `${total} ${noun} (Au complet + ${gCount} invité${gCount > 1 ? 's' : ''})`
  }
  if (absCount > 0) {
    return `${present} ${noun} (${absCount} absent${absCount > 1 ? 's' : ''})`
  }
  return `${total} ${noun} (Au complet !)`
}

const formatFullDisplayDate = (dStr) => {
  if (!dStr) return ''
  const [y, m, d] = dStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const formatted = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const handleDeleteGuest = async (id) => {
  if (confirm('Voulez-vous vraiment retirer cet invité ?')) {
    saving.value = true
    await store.deleteMealGuest(id)
    saving.value = false
    showGuestModal.value = false
  }
}
</script>

<style scoped>
.absences-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-actions-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Today Banner */
.today-banner {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.04));
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.today-banner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.today-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  text-transform: capitalize;
}

.today-header-btns {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-today-add {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all var(--transition-fast);
}

.btn-today-add:hover {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.btn-today-add.guest-btn {
  border-color: rgba(139, 92, 246, 0.3);
  color: var(--accent-purple);
}

.btn-today-add.guest-btn:hover {
  background: var(--accent-purple);
  color: white;
  border-color: var(--accent-purple);
}

.today-slots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.meal-slot-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  transition: all var(--transition-fast);
}

.meal-slot-card.has-absents {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.03);
}

.meal-slot-card.has-guests {
  border-color: rgba(139, 92, 246, 0.3);
}

.slot-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.slot-icon {
  font-size: 1.15rem;
}

.slot-title-col {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.slot-name {
  font-weight: 700;
  font-size: 0.9rem;
}

.slot-headcount {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent-primary);
}

.btn-slot-quick-guest {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: var(--accent-purple);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-slot-quick-guest:hover {
  background: var(--accent-purple);
  color: white;
}

.slot-members-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.slot-chip-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.chip-group-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
}

.chip-group-label.guests-label {
  color: var(--accent-purple);
}

.absent-chips,
.guest-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.member-absent-chip {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.member-absent-chip:hover {
  transform: scale(1.04);
}

.guest-chip {
  background: var(--accent-purple-light);
  color: var(--accent-purple);
  border: 1px solid rgba(139, 92, 246, 0.3);
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.guest-chip:hover {
  transform: scale(1.04);
}

.all-present-text {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-pill {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.filter-pill.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
}

/* Main Grid */
.absences-main-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.calendar-nav-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-today-nav {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-today-nav:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Calendar Grid */
.calendar-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.calendar-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

.day-cell {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  min-height: 80px;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.day-cell:hover {
  border-color: var(--accent-primary);
  background: var(--bg-card);
}

.day-cell.day-empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.day-cell.today {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.day-cell.has-day-guests {
  border-color: rgba(139, 92, 246, 0.3);
}

.day-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 700;
}

.day-cell.today .day-number {
  color: var(--accent-primary);
}

.day-actions-btns {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.day-add-mini-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  opacity: 0;
  padding: 0 0.15rem;
  transition: opacity var(--transition-fast), color var(--transition-fast);
}

.day-cell:hover .day-add-mini-btn {
  opacity: 1;
}

.day-add-mini-btn:hover {
  color: var(--accent-primary);
}

.day-add-mini-btn.guest-btn:hover {
  color: var(--accent-purple);
}

.day-absences-container {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.25rem;
  overflow: hidden;
}

.day-absence-chip {
  background: var(--accent-amber-light);
  color: var(--text-primary);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
  padding: 0.12rem 0.25rem;
  font-size: 0.68rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform var(--transition-fast);
}

.day-absence-chip:hover {
  transform: scale(1.03);
}

.day-guest-chip {
  background: var(--accent-purple-light);
  color: var(--accent-purple);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 4px;
  padding: 0.12rem 0.25rem;
  font-size: 0.68rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: transform var(--transition-fast);
}

.day-guest-chip:hover {
  transform: scale(1.03);
}

.chip-avatar {
  font-size: 0.8rem;
  line-height: 1;
}

.chip-name {
  font-weight: 700;
  font-size: 0.65rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-icons {
  font-size: 0.7rem;
  margin-left: auto;
  letter-spacing: -0.05em;
}

/* Upcoming Tabs */
.upcoming-tabs-header {
  display: flex;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.tab-badge {
  font-size: 0.7rem;
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.tab-badge.indigo {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

/* Upcoming Absences & Guests List */
.upcoming-absences-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.upcoming-absence-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  gap: 0.75rem;
  transition: border-color var(--transition-fast);
}

.upcoming-absence-card:hover {
  border-color: var(--accent-primary);
}

.upcoming-absence-card.guest-card-theme {
  border-left: 3px solid var(--accent-purple);
}

.upcoming-avatar {
  font-size: 1.75rem;
  display: block;
}

.upcoming-avatar.guest-avatar-badge {
  font-size: 1.4rem;
  background: var(--accent-purple-light);
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upcoming-content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.upcoming-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.member-name-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.absence-date-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
}

.absence-date-badge.is-today {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border-color: rgba(245, 158, 11, 0.4);
}

.absence-date-badge.is-guest-date.is-today {
  background: var(--accent-purple-light);
  color: var(--accent-purple);
  border-color: rgba(139, 92, 246, 0.4);
}

.guest-host-tag {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.card-action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-icon-action {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}

.btn-icon-action:hover {
  color: var(--accent-primary);
}

.btn-icon-action.text-danger:hover {
  color: var(--accent-rose);
}

.slots-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.slot-tag {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
}

.slot-tag.lunch {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.slot-tag.dinner {
  background: rgba(99, 102, 241, 0.15);
  color: var(--accent-primary);
}

.slot-tag.night {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

.absence-note-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

/* Modal Styling */
.absence-modal {
  max-width: 480px;
}

.field-help-text {
  font-size: 0.74rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  display: block;
}

.slots-toggle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
}

.slot-toggle-card {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  gap: 0.25rem;
  text-align: center;
  transition: all var(--transition-fast);
}

.slot-toggle-card:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
}

.slot-toggle-card.active {
  background: var(--accent-primary-light);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary);
}

.slot-toggle-card.guest-slot.active {
  background: var(--accent-purple-light);
  border-color: var(--accent-purple);
  box-shadow: 0 0 0 2px var(--accent-purple);
}

.slot-toggle-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.25rem;
}

.slot-toggle-emoji {
  font-size: 1.25rem;
}

.slot-toggle-check {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

.slot-toggle-sub {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.text-error {
  font-size: 0.75rem;
  color: var(--accent-rose);
  margin-top: 0.35rem;
  display: block;
}

/* Day Cell Indicators */
.day-indicators {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.mini-indicator {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-full);
  line-height: 1.2;
}

.mini-indicator.absence {
  background: var(--accent-amber-light);
  color: #b45309;
}

.mini-indicator.guest {
  background: var(--accent-purple-light);
  color: var(--accent-purple);
}

.more-items-count {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
  padding-left: 0.2rem;
}

.more-items-count.guest {
  color: var(--accent-purple);
}

/* Day Detail Modal Styling */
.day-detail-modal {
  max-width: 580px;
  width: 95%;
}

.day-detail-title-col {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.day-detail-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  display: inline-block;
  width: fit-content;
}

.day-detail-actions-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.btn-action-card {
  padding: 0.85rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-purple {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
}

.btn-purple:hover {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.day-slots-detail-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.day-slot-detail-box {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.day-slot-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.slot-name-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
}

.day-slot-headcount-badge {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.day-slot-items {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.slot-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slot-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.slot-section-title.text-amber {
  color: #b45309;
}

.slot-section-title.text-purple {
  color: var(--accent-purple);
}

.slot-person-cards {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.slot-person-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  transition: all var(--transition-fast);
}

.slot-person-card:hover {
  border-color: var(--border-focus);
}

.slot-person-card.absence {
  border-left: 3px solid var(--accent-amber);
}

.slot-person-card.guest {
  border-left: 3px solid var(--accent-purple);
}

.person-avatar {
  font-size: 1.25rem;
  line-height: 1;
}

.person-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  font-size: 0.85rem;
}

.person-host {
  font-size: 0.72rem;
  color: var(--accent-purple);
  font-weight: 600;
}

.person-note {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.person-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.slot-empty-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 0.25rem 0;
}

.day-detail-summary-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .today-slots-grid {
    grid-template-columns: 1fr;
  }
  .absences-main-grid {
    grid-template-columns: 1fr;
  }
  .day-cell {
    min-height: 65px;
  }
  .chip-name {
    display: none;
  }
  .day-detail-actions-bar {
    flex-direction: column;
  }
}
</style>
