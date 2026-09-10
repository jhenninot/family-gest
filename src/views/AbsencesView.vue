<template>
  <div class="absences-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <HouseUser :size="28" class="text-indigo" />
          <span>Présence</span>
        </h1>
        <p class="page-subtitle">Indiquez vos absences ou vos invités au déjeuner, dîner et pour la nuit pour organiser sereinement les repas de famille.</p>
      </div>

      <div class="header-actions-group">
        <button @click="openAddGuestModal()" class="btn btn-secondary">
          <UserPlus :size="18" />
          <span>+ Invité(s)</span>
        </button>
        <button @click="openAddModal(null, 'presence')" class="btn btn-presence-primary" title="Signaler la présence d'un membre habituellement absent">
          <CheckCircle2 :size="18" />
          <span>+ Présence</span>
        </button>
        <button @click="openAddModal(null, 'absence')" class="btn btn-primary" title="Signaler une absence">
          <Plus :size="18" />
          <span>+ Absence</span>
        </button>
      </div>
    </div>

    <!-- Today's Meal Summary Banner -->
    <div class="today-banner glass-card">
      <div class="today-banner-header">
        <div class="today-title">
          <CalendarCheck :size="18" class="text-indigo" />
          <span>Présences du jour ({{ formatDisplayDate(store.todayStr) }})</span>
        </div>
        <div class="today-header-btns">
          <button @click="openAddGuestModal(store.todayStr)" class="btn-today-add guest-btn">
            <UserPlus :size="14" /> + Invité
          </button>
          <button @click="openAddModal(store.todayStr, 'presence')" class="btn-today-add presence-btn" title="Signaler la présence d'un membre aujourd'hui">
            <CheckCircle2 :size="14" /> + Présence
          </button>
          <button @click="openAddModal(store.todayStr, 'absence')" class="btn-today-add" title="Signaler une absence aujourd'hui">
            <Plus :size="14" /> + Absence
          </button>
        </div>
      </div>

      <div class="today-slots-grid">
        <!-- Déjeuner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayLunchPresence.absentMembers.length > 0, 'has-guests': todayLunchPresence.guests.length > 0, 'has-presences': todayLunchPresence.exceptionalPresences.length > 0 }">
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
            <div v-if="todayLunchPresence.absentMembers.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="m in todayLunchPresence.absentMembers" 
                  :key="'abs-' + m.id" 
                  class="member-absent-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Motif: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Absent'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Présences signalées -->
            <div v-if="todayLunchPresence.exceptionalPresences.length > 0" class="slot-chip-group">
              <span class="chip-group-label presences-label">Présences :</span>
              <div class="presence-chips">
                <span 
                  v-for="m in todayLunchPresence.exceptionalPresences" 
                  :key="'prs-' + m.id" 
                  class="member-presence-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Note: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Présence confirmée'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  🟢 {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayLunchPresence.guests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayLunchPresence.guests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Invité(e)'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayLunchPresence.absentMembers.length === 0 && todayLunchPresence.exceptionalPresences.length === 0 && todayLunchPresence.guests.length === 0" class="all-present-text">
              🎉 Au complet ({{ todayLunchPresence.headcount }} personnes) sans invité
            </div>
          </div>
        </div>

        <!-- Dîner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayDinnerPresence.absentMembers.length > 0, 'has-guests': todayDinnerPresence.guests.length > 0, 'has-presences': todayDinnerPresence.exceptionalPresences.length > 0 }">
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
            <div v-if="todayDinnerPresence.absentMembers.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="m in todayDinnerPresence.absentMembers" 
                  :key="'abs-' + m.id" 
                  class="member-absent-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Motif: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Absent'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Présences signalées -->
            <div v-if="todayDinnerPresence.exceptionalPresences.length > 0" class="slot-chip-group">
              <span class="chip-group-label presences-label">Présences :</span>
              <div class="presence-chips">
                <span 
                  v-for="m in todayDinnerPresence.exceptionalPresences" 
                  :key="'prs-' + m.id" 
                  class="member-presence-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Note: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Présence confirmée'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  🟢 {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayDinnerPresence.guests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayDinnerPresence.guests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Invité(e)'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayDinnerPresence.absentMembers.length === 0 && todayDinnerPresence.exceptionalPresences.length === 0 && todayDinnerPresence.guests.length === 0" class="all-present-text">
              🎉 Tout le monde dîne à la maison ({{ todayDinnerPresence.headcount }} personnes) sans invité
            </div>
          </div>
        </div>

        <!-- Nuit -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayNightPresence.absentMembers.length > 0, 'has-guests': todayNightPresence.guests.length > 0, 'has-presences': todayNightPresence.exceptionalPresences.length > 0 }">
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
            <div v-if="todayNightPresence.absentMembers.length > 0" class="slot-chip-group">
              <span class="chip-group-label">Absents :</span>
              <div class="absent-chips">
                <span 
                  v-for="m in todayNightPresence.absentMembers" 
                  :key="'abs-' + m.id" 
                  class="member-absent-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Motif: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Dort ailleurs'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Présences signalées -->
            <div v-if="todayNightPresence.exceptionalPresences.length > 0" class="slot-chip-group">
              <span class="chip-group-label presences-label">Présences :</span>
              <div class="presence-chips">
                <span 
                  v-for="m in todayNightPresence.exceptionalPresences" 
                  :key="'prs-' + m.id" 
                  class="member-presence-chip"
                  :title="getRecordForMember(m.id, store.todayStr)?.note ? `Note: ${getRecordForMember(m.id, store.todayStr)?.note}` : 'Dort à la maison'"
                  @click="getRecordForMember(m.id, store.todayStr) && openEditModal(getRecordForMember(m.id, store.todayStr))"
                >
                  🟢 {{ m.avatar }} {{ m.firstName || m.name }}
                </span>
              </div>
            </div>

            <!-- Invités -->
            <div v-if="todayNightPresence.guests.length > 0" class="slot-chip-group">
              <span class="chip-group-label guests-label">Invités :</span>
              <div class="guest-chips">
                <span 
                  v-for="g in todayNightPresence.guests" 
                  :key="'gst-' + g.id" 
                  class="guest-chip"
                  :title="g.note ? `Note: ${g.note}` : 'Dort à la maison'"
                  @click="openEditGuestModal(g)"
                >
                  👥 {{ g.name }}
                </span>
              </div>
            </div>

            <div v-if="todayNightPresence.absentMembers.length === 0 && todayNightPresence.exceptionalPresences.length === 0 && todayNightPresence.guests.length === 0" class="all-present-text">
              💤 Tout le monde dort à la maison ({{ todayNightPresence.headcount }}) sans invité
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
              today: isDayToday(day)
            }"
            @click="openDayDetailModal(formatDateStr(currentYear, currentMonth, day))"
            :title="'Cliquer pour voir le détail du ' + day + ' ' + currentMonthName"
          >
            <div class="day-cell-top">
              <span class="day-number">{{ day }}</span>
            </div>

            <!-- Nombres de présents par repas et nuit -->
            <div class="day-headcounts-list">
              <div class="day-headcount-item lunch" title="Déjeuner (Midi)">
                <span class="slot-icon-mini">☀️</span>
                <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'lunch') }}</span>
              </div>
              <div class="day-headcount-item dinner" title="Dîner (Soir)">
                <span class="slot-icon-mini">🌙</span>
                <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'dinner') }}</span>
              </div>
              <div class="day-headcount-item night" title="Nuit (Couchage)">
                <span class="slot-icon-mini">🛌</span>
                <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'night') }}</span>
              </div>
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
            <span>Absences & Présences</span>
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
            :class="{ 'presence-card-theme': abs.type === 'presence' }"
          >
            <div class="upcoming-avatar-col">
              <span class="upcoming-avatar">{{ getMemberAvatar(abs.memberId) }}</span>
            </div>

            <div class="upcoming-content-col">
              <div class="upcoming-card-header">
                <div class="member-name-date">
                  <strong>{{ getMemberFirstName(abs.memberId) }}</strong>
                  <span 
                    class="type-pill-badge" 
                    :class="abs.type === 'presence' ? 'is-presence' : 'is-absence'"
                  >
                    {{ abs.type === 'presence' ? '🟢 Présence' : '🚫 Absence' }}
                  </span>
                  <span class="absence-date-badge" :class="{ 'is-today': abs.date === store.todayStr }">
                    {{ formatRelativeDate(abs.date) }}
                  </span>
                  <span v-if="abs.declaredBy && abs.declaredBy !== abs.memberId" class="guest-host-tag" :title="'Signalé par ' + getMemberName(abs.declaredBy)">
                    Signalé par {{ getMemberFirstName(abs.declaredBy) }}
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

    <!-- Modal Signaler / Modifier Absence ou Présence -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content absence-modal" :class="{ 'presence-modal-theme': form.type === 'presence' }">
        <div class="modal-header">
          <h3>{{ editingId ? (form.type === 'presence' ? 'Modifier la Présence' : 'Modifier l\'Absence') : (form.type === 'presence' ? 'Confirmer une Présence' : 'Signaler une Absence') }}</h3>
          <button @click="showModal = false" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <!-- Type de déclaration : Absence vs Présence -->
          <div class="form-group">
            <label class="form-label">Type de déclaration</label>
            <div class="declaration-type-switch">
              <button 
                type="button" 
                class="type-switch-btn" 
                :class="{ active: form.type === 'absence', 'type-absence': form.type === 'absence' }"
                @click="form.type = 'absence'"
              >
                <span>🚫 Absence</span>
              </button>
              <button 
                type="button" 
                class="type-switch-btn" 
                :class="{ active: form.type === 'presence', 'type-presence': form.type === 'presence' }"
                @click="form.type = 'presence'"
              >
                <span>🟢 Présence</span>
              </button>
            </div>
          </div>

          <!-- Member selection -->
          <div class="form-group">
            <label class="form-label">Membre concerné</label>
            <select v-model="form.memberId" @change="onMemberChange" class="form-select" required>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ m.avatar }} {{ m.name }} {{ m.usualPresence === 'absent' ? '(Habituellement absent)' : '' }} {{ m.id === authStore.user?.id ? '• Moi' : '' }}
              </option>
            </select>
            <span v-if="form.memberId !== authStore.user?.id" class="help-subtext text-indigo">
              👋 Vous déclarez cette {{ form.type === 'presence' ? 'présence' : 'absence' }} pour <strong>{{ getMemberName(form.memberId) }}</strong>. Une alerte (web & mail) sera envoyée à la famille.
            </span>
          </div>

          <!-- Date -->
          <div class="form-group">
            <label class="form-label">{{ form.type === 'presence' ? 'Date de présence' : 'Date de l\'absence' }}</label>
            <input 
              v-model="form.date" 
              type="date" 
              required 
              class="form-input" 
            />
          </div>

          <!-- Slots selection cards -->
          <div class="form-group">
            <label class="form-label">
              {{ form.type === 'presence' 
                ? (form.memberId === authStore.user?.id ? 'Créneau(x) où vous serez présent(e) :' : `Créneau(x) où ${getMemberFirstName(form.memberId)} sera présent(e) :`) 
                : (form.memberId === authStore.user?.id ? 'Créneau(x) où vous serez absent(e) :' : `Créneau(x) où ${getMemberFirstName(form.memberId)} sera absent(e) :`) }}
            </label>
            <div class="slots-toggle-grid">
              <!-- Déjeuner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.lunch, 'presence-active': form.lunch && form.type === 'presence' }"
                @click="form.lunch = !form.lunch"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">☀️</span>
                  <input type="checkbox" v-model="form.lunch" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Déjeuner</strong>
                <span class="slot-toggle-sub">{{ form.type === 'presence' ? 'Mange le midi' : 'Repas du midi' }}</span>
              </div>

              <!-- Dîner -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.dinner, 'presence-active': form.dinner && form.type === 'presence' }"
                @click="form.dinner = !form.dinner"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🌙</span>
                  <input type="checkbox" v-model="form.dinner" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Dîner</strong>
                <span class="slot-toggle-sub">{{ form.type === 'presence' ? 'Mange le soir' : 'Repas du soir' }}</span>
              </div>

              <!-- Nuit -->
              <div 
                class="slot-toggle-card" 
                :class="{ active: form.night, 'presence-active': form.night && form.type === 'presence' }"
                @click="form.night = !form.night"
              >
                <div class="slot-toggle-top">
                  <span class="slot-toggle-emoji">🛌</span>
                  <input type="checkbox" v-model="form.night" @click.stop class="slot-toggle-check" />
                </div>
                <strong>Nuit</strong>
                <span class="slot-toggle-sub">{{ form.type === 'presence' ? 'Dort à la maison' : 'Dort ailleurs' }}</span>
              </div>
            </div>
            <span v-if="!form.lunch && !form.dinner && !form.night" class="text-error">
              * Veuillez cocher au moins un créneau.
            </span>
          </div>

          <!-- Note / Reason -->
          <div class="form-group">
            <label class="form-label">{{ form.type === 'presence' ? 'Précision / Commentaire (Optionnel)' : 'Motif / Commentaire (Optionnel)' }}</label>
            <input 
              v-model="form.note" 
              type="text" 
              :placeholder="form.type === 'presence' ? 'Ex: De retour pour le week-end, Vacances...' : 'Ex: Invité chez Lucas, Déplacement boulot, Soirée...'"
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
                class="btn"
                :class="form.type === 'presence' ? 'btn-presence-primary' : 'btn-primary'"
                :disabled="saving || (!form.lunch && !form.dinner && !form.night)"
              >
                <span v-if="!saving">{{ editingId ? 'Enregistrer' : (form.type === 'presence' ? 'Confirmer la présence' : 'Signaler l\'absence') }}</span>
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
            <button 
              @click="openAddModalFromDay('presence')" 
              class="btn btn-presence-primary btn-action-card"
              title="Signaler la présence d'un membre pour cette journée"
            >
              <CheckCircle2 :size="18" />
              <span>+ Présence</span>
            </button>
            <button 
              @click="openAddModalFromDay('absence')" 
              class="btn btn-primary btn-action-card"
              title="Signaler une absence pour cette journée"
            >
              <Plus :size="18" />
              <span>+ Absence</span>
            </button>
            <button @click="openAddGuestModalFromDay()" class="btn btn-purple btn-action-card">
              <UserPlus :size="18" />
              <span>+ Invité</span>
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
                <!-- Présences exceptionnelles -->
                <div v-if="selectedDayLunchPresence.exceptionalPresences.length > 0" class="slot-section">
                  <span class="slot-section-title text-success">Présences exceptionnelles ({{ selectedDayLunchPresence.exceptionalPresences.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="pres in selectedDayLunchPresence.exceptionalPresences" :key="'lunch-pres-' + pres.id" class="slot-person-card presence">
                      <span class="person-avatar">{{ pres.avatar || getMemberAvatar(pres) }}</span>
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Absents -->
                <div v-if="selectedDayLunchAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayLunchAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayLunchAbsents" :key="'lunch-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ abs.avatar || getMemberAvatar(abs) }}</span>
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-action text-danger" title="Supprimer">
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

                <div v-if="selectedDayLunchPresence.exceptionalPresences.length === 0 && selectedDayLunchAbsents.length === 0 && selectedDayLunchGuests.length === 0" class="slot-empty-note">
                  ✨ Aucun changement par rapport à la présence habituelle ({{ selectedDayLunchPresence.headcount }} à table).
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
                <!-- Présences exceptionnelles -->
                <div v-if="selectedDayDinnerPresence.exceptionalPresences.length > 0" class="slot-section">
                  <span class="slot-section-title text-success">Présences exceptionnelles ({{ selectedDayDinnerPresence.exceptionalPresences.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="pres in selectedDayDinnerPresence.exceptionalPresences" :key="'dinner-pres-' + pres.id" class="slot-person-card presence">
                      <span class="person-avatar">{{ pres.avatar || getMemberAvatar(pres) }}</span>
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Absents -->
                <div v-if="selectedDayDinnerAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayDinnerAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayDinnerAbsents" :key="'dinner-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ abs.avatar || getMemberAvatar(abs) }}</span>
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-action text-danger" title="Supprimer">
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

                <div v-if="selectedDayDinnerPresence.exceptionalPresences.length === 0 && selectedDayDinnerAbsents.length === 0 && selectedDayDinnerGuests.length === 0" class="slot-empty-note">
                  ✨ Aucun changement par rapport à la présence habituelle ({{ selectedDayDinnerPresence.headcount }} à table).
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
                <!-- Présences exceptionnelles -->
                <div v-if="selectedDayNightPresence.exceptionalPresences.length > 0" class="slot-section">
                  <span class="slot-section-title text-success">Présences exceptionnelles ({{ selectedDayNightPresence.exceptionalPresences.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="pres in selectedDayNightPresence.exceptionalPresences" :key="'night-pres-' + pres.id" class="slot-person-card presence">
                      <span class="person-avatar">{{ pres.avatar || getMemberAvatar(pres) }}</span>
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-action text-danger" title="Supprimer">
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Absents -->
                <div v-if="selectedDayNightAbsents.length > 0" class="slot-section">
                  <span class="slot-section-title text-amber">Membres absents ({{ selectedDayNightAbsents.length }}) :</span>
                  <div class="slot-person-cards">
                    <div v-for="abs in selectedDayNightAbsents" :key="'night-abs-' + abs.id" class="slot-person-card absence">
                      <span class="person-avatar">{{ abs.avatar || getMemberAvatar(abs) }}</span>
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-action" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-action text-danger" title="Supprimer">
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

                <div v-if="selectedDayNightPresence.exceptionalPresences.length === 0 && selectedDayNightAbsents.length === 0 && selectedDayNightGuests.length === 0" class="slot-empty-note">
                  💤 Aucun changement par rapport à la présence habituelle ({{ selectedDayNightPresence.headcount }} dorment à la maison).
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
  CalendarCheck, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  Users,
  CheckCircle2
} from '@lucide/vue'
import HouseUser from '../components/icons/HouseUser.vue'

const authStore = useAuthStore()
const store = useFamilyStore()

// Filter State
const selectedMemberFilter = ref(null)

// Current user usual presence check
const isCurrentUserUsuallyAbsent = computed(() => {
  const member = store.members.find(m => m.id === authStore.user?.id)
  return member?.usualPresence === 'absent' || authStore.user?.usualPresence === 'absent'
})

// Tab State for Right Column (Absences vs Invités)
const activeUpcomingTab = ref('absences')

// Absence Modal State
const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)

const form = ref({
  type: 'absence',
  memberId: authStore.user?.id || 1,
  date: store.todayStr,
  lunch: false,
  dinner: false,
  night: false,
  note: ''
})

const onMemberChange = () => {
  const mem = store.members.find(m => m.id === form.value.memberId)
  if (mem) {
    form.value.type = mem.usualPresence === 'absent' ? 'presence' : 'absence'
  }
}

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

// Headcounts for each day of current month (lunch, dinner, night)
const monthDayHeadcounts = computed(() => {
  const map = {}
  const days = daysInCurrentMonth.value
  const y = currentYear.value
  const m = currentMonth.value
  for (let d = 1; d <= days; d++) {
    const dateStr = formatDateStr(y, m, d)
    map[d] = {
      lunch: store.getMealSlotPresence(dateStr, 'lunch').headcount,
      dinner: store.getMealSlotPresence(dateStr, 'dinner').headcount,
      night: store.getMealSlotPresence(dateStr, 'night').headcount
    }
  }
  return map
})

const getDaySlotHeadcountNumber = (day, slot) => {
  return monthDayHeadcounts.value[day]?.[slot] ?? 0
}

// Helpers
const getMemberName = (idOrMember) => {
  if (!idOrMember) return 'Membre'
  if (typeof idOrMember === 'object') return idOrMember.name || idOrMember.firstName || 'Membre'
  const m = store.members.find(m => Number(m.id) === Number(idOrMember))
  return m ? m.name : 'Membre'
}

const getMemberFirstName = (idOrMember) => {
  if (!idOrMember) return 'Membre'
  if (typeof idOrMember === 'object') return idOrMember.firstName || (idOrMember.name ? idOrMember.name.split(' ')[0] : 'Membre')
  const m = store.members.find(m => Number(m.id) === Number(idOrMember))
  return m ? (m.firstName || m.name.split(' ')[0]) : 'Membre'
}

const getMemberAvatar = (idOrMember) => {
  if (!idOrMember) return '👤'
  if (typeof idOrMember === 'object') return idOrMember.avatar || '👤'
  const m = store.members.find(m => Number(m.id) === Number(idOrMember))
  return m ? m.avatar : '👤'
}

const getRecordForMember = (memberId, dateStr) => {
  return store.absences.find(a => Number(a.memberId) === Number(memberId) && a.date === dateStr)
}

const canEdit = (abs) => {
  if (!authStore.user || !abs) return false
  const mId = Number(abs.memberId || abs.id)
  const dBy = abs.declaredBy ? Number(abs.declaredBy) : null
  const currentUserId = Number(authStore.user.id)
  return authStore.isAdmin || mId === currentUserId || (dBy !== null && dBy === currentUserId)
}

const hasUsuallyAbsentMembers = computed(() => store.members.some(m => m.usualPresence === 'absent'))

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
  return filteredAbsences.value.filter(a => a.date === dateStr && a.type !== 'presence')
}

const getDayPresences = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return filteredAbsences.value.filter(a => a.date === dateStr && a.type === 'presence')
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
  const actionNoun = abs.type === 'presence' ? 'Présent(e) exceptionnellement' : 'Absent(e)'
  return `${getMemberName(abs.memberId)} : ${actionNoun} ${parts.join(', ')}${abs.note ? ` (${abs.note})` : ''}`
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
const todayLunchPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'lunch'))
const todayDinnerPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'dinner'))
const todayNightPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'night'))

const todayLunchAbsents = computed(() => todayLunchPresence.value.absentMembers)
const todayDinnerAbsents = computed(() => todayDinnerPresence.value.absentMembers)
const todayNightAbsents = computed(() => todayNightPresence.value.absentMembers)

const todayLunchGuests = computed(() => todayLunchPresence.value.guests)
const todayDinnerGuests = computed(() => todayDinnerPresence.value.guests)
const todayNightGuests = computed(() => todayNightPresence.value.guests)

const getSlotHeadcount = (slot) => {
  const p = slot === 'lunch' ? todayLunchPresence.value : (slot === 'dinner' ? todayDinnerPresence.value : todayNightPresence.value)
  const noun = slot === 'night' ? 'personne(s) qui dorment' : 'à table'
  const details = []
  if (p.presentMembersCount > 0) details.push(`${p.presentMembersCount} membre${p.presentMembersCount > 1 ? 's' : ''}`)
  if (p.guestsCount > 0) details.push(`${p.guestsCount} invité${p.guestsCount > 1 ? 's' : ''}`)
  const detailsStr = details.length > 0 ? ` (${details.join(' + ')})` : ''
  return `${p.headcount} ${noun}${detailsStr}`
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

// Absence/Presence Modal actions
const openAddModal = (defaultDate = null, defaultType = null, defaultMemberId = null) => {
  editingId.value = null
  let initialMemberId = defaultMemberId
  if (!initialMemberId) {
    if (defaultType === 'presence') {
      if (isCurrentUserUsuallyAbsent.value) {
        initialMemberId = authStore.user?.id
      } else {
        const absentMember = store.members.find(m => m.usualPresence === 'absent')
        initialMemberId = absentMember ? absentMember.id : (authStore.user?.id || (store.members[0]?.id || 1))
      }
    } else {
      initialMemberId = authStore.user?.id || (store.members[0]?.id || 1)
    }
  }
  const mem = store.members.find(m => m.id === initialMemberId)
  const initialType = defaultType || (mem?.usualPresence === 'absent' ? 'presence' : 'absence')
  
  form.value = {
    type: initialType,
    memberId: initialMemberId,
    date: defaultDate || store.todayStr,
    lunch: true,
    dinner: false,
    night: false,
    note: ''
  }
  showModal.value = true
}

const openEditModal = (rec) => {
  editingId.value = rec.id
  form.value = {
    type: rec.type || 'absence',
    memberId: rec.memberId,
    date: rec.date,
    lunch: Boolean(rec.lunch),
    dinner: Boolean(rec.dinner),
    night: Boolean(rec.night),
    note: rec.note || ''
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

const handleDelete = async (idOrObj) => {
  const targetId = typeof idOrObj === 'object' ? (idOrObj.absenceId || idOrObj.record?.id || idOrObj.id) : idOrObj
  const isPres = typeof idOrObj === 'object' ? (idOrObj.record?.type === 'presence' || idOrObj.type === 'presence') : (form.value.type === 'presence')
  if (confirm(`Voulez-vous vraiment supprimer cette ${isPres ? 'présence' : 'absence'} ?`)) {
    saving.value = true
    await store.deleteAbsence(targetId)
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

const openAddModalFromDay = (defaultType = null, defaultMemberId = null) => {
  showDayDetailModal.value = false
  openAddModal(selectedDayDate.value, defaultType, defaultMemberId)
}

const openAddGuestModalFromDay = () => {
  showDayDetailModal.value = false
  openAddGuestModal(selectedDayDate.value)
}

const openEditModalFromDay = (abs) => {
  showDayDetailModal.value = false
  const record = abs.record || (abs.memberId && abs.date ? abs : getRecordForMember(abs.id || abs.memberId, selectedDayDate.value)) || abs
  openEditModal(record)
}

const openEditGuestModalFromDay = (g) => {
  showDayDetailModal.value = false
  openEditGuestModal(g)
}

const selectedDayLunchPresence = computed(() => store.getMealSlotPresence(selectedDayDate.value, 'lunch'))
const selectedDayDinnerPresence = computed(() => store.getMealSlotPresence(selectedDayDate.value, 'dinner'))
const selectedDayNightPresence = computed(() => store.getMealSlotPresence(selectedDayDate.value, 'night'))

const selectedDayAbsences = computed(() => {
  return store.absences.filter(a => a.date === selectedDayDate.value)
})

const selectedDayGuests = computed(() => {
  return store.mealGuests.filter(g => g.date === selectedDayDate.value)
})

const selectedDayLunchAbsents = computed(() => selectedDayLunchPresence.value.absentMembers)
const selectedDayLunchGuests = computed(() => selectedDayLunchPresence.value.guests)

const selectedDayDinnerAbsents = computed(() => selectedDayDinnerPresence.value.absentMembers)
const selectedDayDinnerGuests = computed(() => selectedDayDinnerPresence.value.guests)

const selectedDayNightAbsents = computed(() => selectedDayNightPresence.value.absentMembers)
const selectedDayNightGuests = computed(() => selectedDayNightPresence.value.guests)

const getSelectedDaySlotHeadcount = (slot) => {
  const p = slot === 'lunch' ? selectedDayLunchPresence.value : (slot === 'dinner' ? selectedDayDinnerPresence.value : selectedDayNightPresence.value)
  const noun = slot === 'night' ? 'couchage(s)' : 'à table'
  const details = []
  if (p.presentMembersCount > 0) details.push(`${p.presentMembersCount} membre${p.presentMembersCount > 1 ? 's' : ''}`)
  if (p.guestsCount > 0) details.push(`${p.guestsCount} invité${p.guestsCount > 1 ? 's' : ''}`)
  const detailsStr = details.length > 0 ? ` (${details.join(' + ')})` : ''
  return `${p.headcount} ${noun}${detailsStr}`
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

/* Section Card (Like CalendarView) */
.section-card {
  padding: 1.5rem;
}

.section-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
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
  gap: 0.4rem;
}

.day-cell {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  min-height: 85px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  position: relative;
  transition: transform var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.day-cell:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.day-cell.day-empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.day-cell.today {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  box-shadow: 0 0 0 1px var(--accent-primary);
}

.day-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.day-number {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
}

.day-cell.today .day-number {
  color: var(--accent-primary);
  font-weight: 800;
}

/* Day Headcounts List (Lunch, Dinner, Night) */
.day-headcounts-list {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  width: 100%;
  margin-top: auto;
}

.day-headcount-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.12rem 0.35rem;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
  transition: background var(--transition-fast);
}

.slot-icon-mini {
  font-size: 0.78rem;
  line-height: 1;
}

.headcount-num {
  font-size: 0.78rem;
  font-weight: 800;
}

.day-headcount-item.lunch {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}
[data-theme="dark"] .day-headcount-item.lunch {
  background: rgba(245, 158, 11, 0.22);
  color: #fbbf24;
}

.day-headcount-item.dinner {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
}
[data-theme="dark"] .day-headcount-item.dinner {
  background: rgba(99, 102, 241, 0.22);
  color: #a5b4fc;
}

.day-headcount-item.night {
  background: rgba(139, 92, 246, 0.12);
  color: #6d28d9;
}
[data-theme="dark"] .day-headcount-item.night {
  background: rgba(139, 92, 246, 0.22);
  color: #c4b5fd;
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

/* Presence Styles */
.btn-presence-primary {
  background: var(--accent-green, #10b981);
  color: white;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
}

.btn-presence-primary:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}

.btn-today-add.presence-btn {
  border-color: rgba(16, 185, 129, 0.35);
  color: #10b981;
}

.btn-today-add.presence-btn:hover {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.meal-slot-card.has-presences {
  border-color: rgba(16, 185, 129, 0.3);
}

.member-presence-chip {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #065f46;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

[data-theme="dark"] .member-presence-chip {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

.member-presence-chip:hover {
  transform: scale(1.03);
}

.presence-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip-group-label.presences-label {
  color: #10b981;
}

.mini-indicator.presence {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
}

.day-presence-chip {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #065f46;
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-theme="dark"] .day-presence-chip {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.4);
}

.day-presence-chip:hover {
  transform: scale(1.02);
  border-color: #10b981;
}

.declaration-type-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: var(--bg-tertiary);
  padding: 0.3rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
}

.type-switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-switch-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.type-switch-btn.active.absence {
  background: var(--bg-card);
  color: var(--accent-amber);
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: var(--shadow-sm);
}

.type-switch-btn.active.presence {
  background: var(--bg-card);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: var(--shadow-sm);
}

.slot-toggle-card.presence-active {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.4);
}

.presence-modal-theme {
  border-top: 4px solid #10b981;
}

.slot-person-card.presence {
  border-left: 3px solid #10b981;
  background: rgba(16, 185, 129, 0.04);
}

.presence-badge-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: #10b981;
}

.presence-card {
  border-left: 3px solid #10b981 !important;
}

.upcoming-badge.presence {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

@media (max-width: 900px) {
  .section-card {
    padding: 1rem;
  }
  .today-slots-grid {
    grid-template-columns: 1fr;
  }
  .absences-main-grid {
    grid-template-columns: 1fr;
  }
  .day-cell {
    min-height: 75px;
    padding: 0.35rem 0.25rem;
  }
  .day-headcount-item {
    padding: 0.1rem 0.25rem;
  }
  .day-detail-actions-bar {
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .section-card {
    padding: 0.75rem 0.5rem;
  }
  .calendar-days-grid {
    gap: 0.25rem;
  }
  .day-cell {
    min-height: 70px;
    padding: 0.25rem 0.15rem;
  }
  .day-headcount-item {
    padding: 0.08rem 0.2rem;
    font-size: 0.68rem;
  }
  .slot-icon-mini {
    font-size: 0.7rem;
  }
  .headcount-num {
    font-size: 0.72rem;
  }
}
</style>
