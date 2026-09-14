<template>
  <div class="absences-view" ref="absencesViewRef">
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
        <button @click="openDeclarationChoiceModal()" class="btn btn-primary btn-declare-main" title="Déclarer une absence, absence longue, invitation ou présence">
          <Plus :size="18" />
          <span>Déclarer</span>
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
          <button @click="openDeclarationChoiceModal(store.todayStr)" class="btn-today-add" title="Déclarer une absence, absence longue, invitation ou présence aujourd'hui">
            <Plus :size="14" />
            <span>Déclarer</span>
          </button>
        </div>
      </div>

      <div class="today-slots-grid">
        <!-- Déjeuner -->
        <div class="meal-slot-card" :class="{ 'has-absents': todayLunchPresence.absentMembers.length > 0, 'has-guests': todayLunchPresence.guests.length > 0, 'has-presences': todayLunchPresence.exceptionalPresences.length > 0 }">
          <div class="slot-header">
            <Sun :size="18" class="slot-icon slot-icon-lunch" />
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
                  @click="handleAbsentMemberClick(m.id, store.todayStr)"
                >
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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
                  <span class="presence-dot">🟢</span>
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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
            <Sunset :size="18" class="slot-icon slot-icon-dinner" />
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
                  @click="handleAbsentMemberClick(m.id, store.todayStr)"
                >
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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
                  <span class="presence-dot">🟢</span>
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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
            <BedDouble :size="18" class="slot-icon slot-icon-night" />
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
                  @click="handleAbsentMemberClick(m.id, store.todayStr)"
                >
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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
                  <span class="presence-dot">🟢</span>
                  <UserAvatar :avatar="m.avatar" :name="m.firstName || m.name" size="xs" />
                  <span>{{ m.firstName || m.name }}</span>
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

    <!-- Calendar View Card (Weekly & Monthly) -->
    <div class="glass-card section-card calendar-card">
      <div class="section-card-header flex-between">
          <div class="calendar-nav-title">
            <h2>{{ calendarViewMode === 'week' ? currentWeekLabel : `${currentMonthName} ${currentYear}` }}</h2>
          </div>

          <div class="calendar-header-actions">
            <!-- Mode Toggle: Mois / Semaine -->
            <div class="calendar-view-mode-toggle">
              <button 
                class="view-mode-btn" 
                :class="{ active: calendarViewMode === 'month' }" 
                @click="calendarViewMode = 'month'"
                title="Afficher le calendrier mensuel"
              >
                <Calendar :size="15" />
                <span>Mois</span>
              </button>
              <button 
                class="view-mode-btn" 
                :class="{ active: calendarViewMode === 'week' }" 
                @click="calendarViewMode = 'week'"
                title="Afficher le planning hebdomadaire"
              >
                <CalendarRange :size="15" />
                <span>Semaine</span>
              </button>
            </div>

            <div class="calendar-nav-controls">
              <button @click="prevPeriod" class="btn-cal-nav" :title="calendarViewMode === 'week' ? 'Semaine précédente' : 'Mois précédent'">
                <ChevronLeft :size="22" />
              </button>
              <button @click="goToToday" class="btn-today-nav">
                Aujourd'hui
              </button>
              <button @click="nextPeriod" class="btn-cal-nav" :title="calendarViewMode === 'week' ? 'Semaine suivante' : 'Mois suivant'">
                <ChevronRight :size="22" />
              </button>
            </div>
          </div>
        </div>

        <!-- 1. MONTHLY CALENDAR VIEW -->
        <template v-if="calendarViewMode === 'month'">
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
                past: isDayPast(day)
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
                  <Sun :size="12" class="slot-icon-mini" />
                  <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'lunch') }}</span>
                </div>
                <div class="day-headcount-item dinner" title="Dîner (Soir)">
                  <Sunset :size="12" class="slot-icon-mini" />
                  <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'dinner') }}</span>
                </div>
                <div class="day-headcount-item night" title="Nuit (Couchage)">
                  <BedDouble :size="12" class="slot-icon-mini" />
                  <span class="headcount-num">{{ getDaySlotHeadcountNumber(day, 'night') }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 2. WEEKLY CALENDAR VIEW -->
        <div v-else-if="calendarViewMode === 'week'" class="absences-week-view">
          <div class="week-days-columns">
            <div 
              v-for="day in weekDays" 
              :key="day.dateStr"
              class="week-day-column"
              :class="{ 'is-today': day.isToday, 'is-past': day.isPast }"
              @click="openDayDetailModal(day.dateStr)"
              :title="'Cliquer pour voir ou modifier le détail du ' + day.name + ' ' + day.dayNum + ' ' + day.monthShort"
            >
              <!-- Day Header -->
              <div class="week-col-header">
                <div class="week-col-title">
                  <span class="day-name-text">{{ day.name }}</span>
                  <span class="day-date-text">{{ day.dayNum }} {{ day.monthShort }}</span>
                </div>
                <span v-if="day.isPast" class="past-tag-mini">Passé</span>
              </div>

              <!-- Slots breakdown -->
              <div class="week-col-slots">
                <!-- Midi (Déjeuner) -->
                <div class="week-col-slot lunch">
                  <div class="slot-summary-row">
                    <span class="slot-name-badge"><Sun :size="12" class="slot-name-icon-lunch" /> Midi</span>
                    <span class="slot-headcount-tag" :title="`${day.lunchPresence.headcount} à table ce midi`">
                      {{ day.lunchPresence.headcount }}
                    </span>
                  </div>
                  <div class="slot-chips-wrap">
                    <span 
                      v-for="p in day.lunchPresence.exceptionalPresences" 
                      :key="'wl-p-' + p.id" 
                      class="mini-chip chip-presence"
                      :title="`${p.firstName} présent(e)`"
                    >
                      +{{ p.firstName }}
                    </span>
                    <span 
                      v-for="a in day.lunchPresence.absentMembers" 
                      :key="'wl-a-' + a.id" 
                      class="mini-chip chip-absence"
                      :title="`${a.firstName} absent(e)`"
                    >
                      -{{ a.firstName }}
                    </span>
                    <span 
                      v-for="g in day.lunchPresence.guests" 
                      :key="'wl-g-' + g.id" 
                      class="mini-chip chip-guest"
                      :title="`Invité : ${g.name}`"
                    >
                      👥 {{ g.name }}
                    </span>
                    <span 
                      v-if="day.lunchPresence.exceptionalPresences.length === 0 && day.lunchPresence.absentMembers.length === 0 && day.lunchPresence.guests.length === 0" 
                      class="mini-chip chip-normal"
                    >
                      Habituel
                    </span>
                  </div>
                </div>

                <!-- Soir (Dîner) -->
                <div class="week-col-slot dinner">
                  <div class="slot-summary-row">
                    <span class="slot-name-badge"><Sunset :size="12" class="slot-name-icon-dinner" /> Soir</span>
                    <span class="slot-headcount-tag" :title="`${day.dinnerPresence.headcount} à table ce soir`">
                      {{ day.dinnerPresence.headcount }}
                    </span>
                  </div>
                  <div class="slot-chips-wrap">
                    <span 
                      v-for="p in day.dinnerPresence.exceptionalPresences" 
                      :key="'wd-p-' + p.id" 
                      class="mini-chip chip-presence"
                      :title="`${p.firstName} présent(e)`"
                    >
                      +{{ p.firstName }}
                    </span>
                    <span 
                      v-for="a in day.dinnerPresence.absentMembers" 
                      :key="'wd-a-' + a.id" 
                      class="mini-chip chip-absence"
                      :title="`${a.firstName} absent(e)`"
                    >
                      -{{ a.firstName }}
                    </span>
                    <span 
                      v-for="g in day.dinnerPresence.guests" 
                      :key="'wd-g-' + g.id" 
                      class="mini-chip chip-guest"
                      :title="`Invité : ${g.name}`"
                    >
                      👥 {{ g.name }}
                    </span>
                    <span 
                      v-if="day.dinnerPresence.exceptionalPresences.length === 0 && day.dinnerPresence.absentMembers.length === 0 && day.dinnerPresence.guests.length === 0" 
                      class="mini-chip chip-normal"
                    >
                      Habituel
                    </span>
                  </div>
                </div>

                <!-- Nuit (Couchage) -->
                <div class="week-col-slot night">
                  <div class="slot-summary-row">
                    <span class="slot-name-badge"><BedDouble :size="12" class="slot-name-icon-night" /> Nuit</span>
                    <span class="slot-headcount-tag" :title="`${day.nightPresence.headcount} au lit`">
                      {{ day.nightPresence.headcount }}
                    </span>
                  </div>
                  <div class="slot-chips-wrap">
                    <span 
                      v-for="p in day.nightPresence.exceptionalPresences" 
                      :key="'wn-p-' + p.id" 
                      class="mini-chip chip-presence"
                      :title="`${p.firstName} dort sur place`"
                    >
                      +{{ p.firstName }}
                    </span>
                    <span 
                      v-for="a in day.nightPresence.absentMembers" 
                      :key="'wn-a-' + a.id" 
                      class="mini-chip chip-absence"
                      :title="`${a.firstName} découché`"
                    >
                      -{{ a.firstName }}
                    </span>
                    <span 
                      v-for="g in day.nightPresence.guests" 
                      :key="'wn-g-' + g.id" 
                      class="mini-chip chip-guest"
                      :title="`Invité : ${g.name}`"
                    >
                      👥 {{ g.name }}
                    </span>
                    <span 
                      v-if="day.nightPresence.exceptionalPresences.length === 0 && day.nightPresence.absentMembers.length === 0 && day.nightPresence.guests.length === 0" 
                      class="mini-chip chip-normal"
                    >
                      Habituel
                    </span>
                  </div>
                </div>
              </div>

              <!-- Footer action hint -->
              <div class="week-col-footer">
                <span class="week-col-hint">{{ day.isPast ? 'Consulter' : 'Modifier' }}</span>
              </div>
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
          <!-- Member selection -->
          <div class="form-group">
            <label class="form-label">Membre concerné</label>
            <select v-model="form.memberId" class="form-select" required>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ getAvatarTextFallback(m.avatar) }} {{ m.name }} {{ m.usualPresence === 'absent' ? '(Habituellement absent)' : '' }} {{ m.id === authStore.user?.id ? '• Moi' : '' }}
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
              :min="store.todayStr"
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
                  <Sun :size="20" class="slot-toggle-emoji" />
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
                  <Sunset :size="20" class="slot-toggle-emoji" />
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
                  <BedDouble :size="20" class="slot-toggle-emoji" />
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

          <div class="modal-footer" :class="{ 'modal-footer-center': !editingId, 'flex-between': editingId }">
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

            <div class="modal-actions-buttons" :class="{ 'center-actions': !editingId }">
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
              :min="store.todayStr"
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
                  <Sun :size="20" class="slot-toggle-emoji" />
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
                  <Sunset :size="20" class="slot-toggle-emoji" />
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
                  <BedDouble :size="20" class="slot-toggle-emoji" />
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
                {{ getAvatarTextFallback(m.avatar) }} {{ m.name }} {{ m.id === authStore.user?.id ? '(Moi)' : '' }}
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

          <div class="modal-footer" :class="{ 'modal-footer-center': !editingGuestId, 'flex-between': editingGuestId }">
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

            <div class="modal-actions-buttons" :class="{ 'center-actions': !editingGuestId }">
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
          <div v-if="selectedDayDate >= store.todayStr" class="day-detail-actions-bar">
            <button 
              @click="openDeclarationChoiceModal(selectedDayDate)" 
              class="btn btn-primary btn-action-card"
              title="Déclarer une absence, absence longue, invitation ou présence"
            >
              <Plus :size="18" />
              <span>Déclarer pour ce jour</span>
            </button>
          </div>
          <div v-else class="past-day-banner">
            <span class="past-day-icon">ℹ️</span>
            <span>Cette journée est passée (consultation uniquement). L'ajout de présences, absences ou invités est désactivé.</span>
          </div>

          <!-- Slots Details Grid -->
          <div class="day-slots-detail-list">
            <!-- Déjeuner -->
            <div class="day-slot-detail-box">
              <div class="day-slot-detail-header">
                <div class="slot-name-group">
                  <Sun :size="18" class="slot-icon slot-icon-lunch" />
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
                      <UserAvatar :avatar="pres.avatar || getMemberAvatar(pres)" :name="pres.firstName || getMemberFirstName(pres)" size="sm" />
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-ghost danger" title="Supprimer">
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
                      <UserAvatar :avatar="abs.avatar || getMemberAvatar(abs)" :name="abs.firstName || getMemberFirstName(abs)" size="sm" />
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="getLongAbsenceForRecord(abs)" class="person-long-absence-badge" :title="`Absence longue du ${formatDisplayDate(getLongAbsenceForRecord(abs).startDate)} au ${formatDisplayDate(getLongAbsenceForRecord(abs).endDate)}`">
                          <CalendarRange :size="12" />
                          <span>Absence longue</span>
                        </span>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <template v-if="getLongAbsenceForRecord(abs)">
                          <button v-if="canEdit(abs)" @click="openEditLongAbsenceFromDay(getLongAbsenceForRecord(abs))" class="btn-icon-ghost text-amber" title="Modifier toute l'absence longue">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDeleteLongAbsence(getLongAbsenceForRecord(abs))" class="btn-icon-ghost danger" title="Supprimer toute l'absence longue">
                            <Trash2 :size="15" />
                          </button>
                        </template>
                        <template v-else>
                          <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-ghost" title="Modifier">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-ghost danger" title="Supprimer">
                            <Trash2 :size="15" />
                          </button>
                        </template>
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
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-ghost danger" title="Supprimer">
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
                  <Sunset :size="18" class="slot-icon slot-icon-dinner" />
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
                      <UserAvatar :avatar="pres.avatar || getMemberAvatar(pres)" :name="pres.firstName || getMemberFirstName(pres)" size="sm" />
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-ghost danger" title="Supprimer">
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
                      <UserAvatar :avatar="abs.avatar || getMemberAvatar(abs)" :name="abs.firstName || getMemberFirstName(abs)" size="sm" />
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="getLongAbsenceForRecord(abs)" class="person-long-absence-badge" :title="`Absence longue du ${formatDisplayDate(getLongAbsenceForRecord(abs).startDate)} au ${formatDisplayDate(getLongAbsenceForRecord(abs).endDate)}`">
                          <CalendarRange :size="12" />
                          <span>Absence longue</span>
                        </span>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <template v-if="getLongAbsenceForRecord(abs)">
                          <button v-if="canEdit(abs)" @click="openEditLongAbsenceFromDay(getLongAbsenceForRecord(abs))" class="btn-icon-ghost text-amber" title="Modifier toute l'absence longue">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDeleteLongAbsence(getLongAbsenceForRecord(abs))" class="btn-icon-ghost danger" title="Supprimer toute l'absence longue">
                            <Trash2 :size="15" />
                          </button>
                        </template>
                        <template v-else>
                          <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-ghost" title="Modifier">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-ghost danger" title="Supprimer">
                            <Trash2 :size="15" />
                          </button>
                        </template>
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
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-ghost danger" title="Supprimer">
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
                  <BedDouble :size="18" class="slot-icon slot-icon-night" />
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
                      <UserAvatar :avatar="pres.avatar || getMemberAvatar(pres)" :name="pres.firstName || getMemberFirstName(pres)" size="sm" />
                      <div class="person-info">
                        <strong>{{ pres.firstName || getMemberFirstName(pres) }}</strong>
                        <span class="presence-badge-text">🟢 Présence confirmée</span>
                        <span v-if="pres.declaredBy && pres.declaredBy !== (pres.memberId || pres.id)" class="person-host">Signalé par {{ getMemberFirstName(pres.declaredBy) }}</span>
                        <span v-if="pres.note" class="person-note">💬 {{ pres.note }}</span>
                      </div>
                      <div class="person-actions">
                        <button v-if="canEdit(pres)" @click="openEditModalFromDay(pres)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button v-if="canEdit(pres)" @click="handleDelete(pres)" class="btn-icon-ghost danger" title="Supprimer">
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
                      <UserAvatar :avatar="abs.avatar || getMemberAvatar(abs)" :name="abs.firstName || getMemberFirstName(abs)" size="sm" />
                      <div class="person-info">
                        <strong>{{ abs.firstName || getMemberFirstName(abs) }}</strong>
                        <span v-if="getLongAbsenceForRecord(abs)" class="person-long-absence-badge" :title="`Absence longue du ${formatDisplayDate(getLongAbsenceForRecord(abs).startDate)} au ${formatDisplayDate(getLongAbsenceForRecord(abs).endDate)}`">
                          <CalendarRange :size="12" />
                          <span>Absence longue</span>
                        </span>
                        <span v-if="abs.declaredBy && abs.declaredBy !== (abs.memberId || abs.id)" class="person-host">Signalé par {{ getMemberFirstName(abs.declaredBy) }}</span>
                        <span v-if="abs.note" class="person-note">💬 {{ abs.note }}</span>
                      </div>
                      <div class="person-actions">
                        <template v-if="getLongAbsenceForRecord(abs)">
                          <button v-if="canEdit(abs)" @click="openEditLongAbsenceFromDay(getLongAbsenceForRecord(abs))" class="btn-icon-ghost text-amber" title="Modifier toute l'absence longue">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDeleteLongAbsence(getLongAbsenceForRecord(abs))" class="btn-icon-ghost danger" title="Supprimer toute l'absence longue">
                            <Trash2 :size="15" />
                          </button>
                        </template>
                        <template v-else>
                          <button v-if="canEdit(abs)" @click="openEditModalFromDay(abs)" class="btn-icon-ghost" title="Modifier">
                            <Edit3 :size="15" />
                          </button>
                          <button v-if="canEdit(abs)" @click="handleDelete(abs)" class="btn-icon-ghost danger" title="Supprimer">
                            <Trash2 :size="15" />
                          </button>
                        </template>
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
                        <button @click="openEditGuestModalFromDay(g)" class="btn-icon-ghost" title="Modifier">
                          <Edit3 :size="15" />
                        </button>
                        <button @click="handleDeleteGuest(g.id)" class="btn-icon-ghost danger" title="Supprimer">
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

    <!-- Modal Gestion des Absences Longues -->
    <div v-if="showLongAbsenceModal" class="modal-overlay" @click.self="showLongAbsenceModal = false">
      <div class="modal-content long-absence-modal">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <CalendarRange :size="22" class="text-amber" />
            <h3>{{ editingLongAbsenceId ? 'Modifier l\'Absence Longue' : 'Absence Longue' }}</h3>
          </div>
          <button @click="showLongAbsenceModal = false" class="btn-close">&times;</button>
        </div>

        <!-- Mode tabs (Déclarer / Liste) -->
        <div class="long-absence-tabs" v-if="!editingLongAbsenceId">
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeLongAbsenceTab === 'form' }" 
            @click="activeLongAbsenceTab = 'form'"
          >
            <Plus :size="16" />
            <span>Déclarer une absence</span>
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeLongAbsenceTab === 'list' }" 
            @click="activeLongAbsenceTab = 'list'"
          >
            <Calendar :size="16" />
            <span>Absences déclarées ({{ store.longAbsences.length }})</span>
          </button>
        </div>

        <!-- Editing banner -->
        <div v-if="editingLongAbsenceId" class="editing-banner">
          <div class="editing-banner-text">
            <span>✏️ Vous modifiez une absence longue existante.</span>
          </div>
          <button type="button" class="btn-cancel-edit" @click="cancelEditLongAbsence">
            Annuler la modification
          </button>
        </div>

        <!-- Tab 1: Formulaire -->
        <form v-if="activeLongAbsenceTab === 'form' || editingLongAbsenceId" @submit.prevent="handleLongAbsenceSubmit" class="long-absence-form">
          <!-- Membre concerné -->
          <div class="form-group">
            <label class="form-label">Membre concerné</label>
            <select v-model="longAbsenceForm.memberId" class="form-select" required>
              <option v-for="m in store.members" :key="m.id" :value="m.id">
                {{ getAvatarTextFallback(m.avatar) }} {{ m.name }} {{ m.id === authStore.user?.id ? '• Moi' : '' }}
              </option>
            </select>
            <span v-if="longAbsenceForm.memberId !== authStore.user?.id" class="help-subtext text-indigo">
              👋 Vous déclarez cette absence pour <strong>{{ getMemberName(longAbsenceForm.memberId) }}</strong>. Une alerte sera envoyée à la famille.
            </span>
          </div>

          <!-- Date & Créneau de Début -->
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Date de début</label>
              <input 
                v-model="longAbsenceForm.startDate" 
                type="date" 
                :min="editingLongAbsenceId ? undefined : store.todayStr"
                @change="onStartDateChange"
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">À partir du créneau</label>
              <div class="slot-select-pills">
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.startSlot === 'lunch' }"
                  @click="setStartSlot('lunch')"
                >
                  <Sun :size="14" />
                  <span>Midi</span>
                </button>
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.startSlot === 'dinner' }"
                  @click="setStartSlot('dinner')"
                >
                  <Sunset :size="14" />
                  <span>Soir</span>
                </button>
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.startSlot === 'night' }"
                  @click="setStartSlot('night')"
                >
                  <BedDouble :size="14" />
                  <span>Nuit</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Date & Créneau de Fin -->
          <div class="form-row-2col">
            <div class="form-group">
              <label class="form-label">Date de fin</label>
              <input 
                v-model="longAbsenceForm.endDate" 
                type="date" 
                :min="longAbsenceForm.startDate || store.todayStr"
                @change="onEndDateChange"
                required 
                class="form-input" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Jusqu'au créneau inclus</label>
              <div class="slot-select-pills">
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.endSlot === 'lunch' }"
                  :disabled="isEndSlotDisabled('lunch')"
                  @click="setEndSlot('lunch')"
                >
                  <Sun :size="14" />
                  <span>Midi</span>
                </button>
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.endSlot === 'dinner' }"
                  :disabled="isEndSlotDisabled('dinner')"
                  @click="setEndSlot('dinner')"
                >
                  <Sunset :size="14" />
                  <span>Soir</span>
                </button>
                <button 
                  type="button" 
                  class="slot-pill-btn" 
                  :class="{ active: longAbsenceForm.endSlot === 'night' }"
                  :disabled="isEndSlotDisabled('night')"
                  @click="setEndSlot('night')"
                >
                  <BedDouble :size="14" />
                  <span>Nuit</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Motif / Commentaire -->
          <div class="form-group">
            <label class="form-label">Motif / Commentaire (optionnel)</label>
            <input 
              v-model="longAbsenceForm.note" 
              type="text" 
              placeholder="Ex: Vacances, déplacement professionnel, week-end..." 
              class="form-input" 
            />
          </div>

          <!-- Résumé dynamique -->
          <div class="long-absence-recap-card" v-if="longAbsenceForm.startDate && longAbsenceForm.endDate">
            <div class="recap-header">
              <span class="recap-badge">Période d'absence</span>
              <span class="recap-days">{{ longAbsenceDaysCount }} jour{{ longAbsenceDaysCount > 1 ? 's' : '' }}</span>
            </div>
            <div class="recap-body">
              <div class="recap-line">
                <span class="recap-label">Début :</span>
                <strong>{{ formatDisplayDate(longAbsenceForm.startDate) }}</strong>
                <span class="slot-tag">créneau {{ formatSlotName(longAbsenceForm.startSlot) }}</span>
              </div>
              <div class="recap-line">
                <span class="recap-label">Fin :</span>
                <strong>{{ formatDisplayDate(longAbsenceForm.endDate) }}</strong>
                <span class="slot-tag">créneau {{ formatSlotName(longAbsenceForm.endSlot) }}</span>
              </div>
            </div>
            <p class="recap-hint">
              💡 Les créneaux d'absence quotidiens (midi, soir, nuit) seront automatiquement enregistrés pour chaque jour de la période.
            </p>
          </div>

          <div class="modal-footer flex-between">
            <button 
              type="button" 
              @click="editingLongAbsenceId ? cancelEditLongAbsence() : showLongAbsenceModal = false" 
              class="btn btn-secondary"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              class="btn btn-primary btn-long-absence-submit"
              :disabled="savingLongAbsence"
            >
              <span v-if="savingLongAbsence">Enregistrement...</span>
              <span v-else>{{ editingLongAbsenceId ? 'Mettre à jour l\'absence longue' : 'Enregistrer l\'absence longue' }}</span>
            </button>
          </div>
        </form>

        <!-- Tab 2: Liste des absences longues -->
        <div v-else class="long-absences-list-tab">
          <div v-if="store.longAbsences.length === 0" class="empty-long-absences">
            <div class="empty-icon">🏖️</div>
            <h4>Aucune absence longue déclarée</h4>
            <p>Déclarez des absences sur plusieurs jours en quelques clics (vacances, séjours...).</p>
            <button type="button" @click="activeLongAbsenceTab = 'form'" class="btn btn-primary mt-2">
              <Plus :size="16" />
              <span>Déclarer une absence longue</span>
            </button>
          </div>

          <div v-else class="long-absences-grid">
            <div 
              v-for="la in store.longAbsences" 
              :key="'la-' + la.id" 
              class="long-absence-card"
            >
              <div class="la-card-header">
                <div class="la-member">
                  <UserAvatar :avatar="getMemberAvatar(la.memberId)" :name="getMemberFirstName(la.memberId)" size="sm" />
                  <div>
                    <strong>{{ getMemberName(la.memberId) }}</strong>
                    <span v-if="la.declaredBy && la.declaredBy !== la.memberId" class="la-subtext">
                      Par {{ getMemberFirstName(la.declaredBy) }}
                    </span>
                  </div>
                </div>

                <div class="la-actions" v-if="canEditLongAbsence(la)">
                  <button @click="editLongAbsence(la)" class="btn-icon-ghost text-amber" title="Modifier cette absence longue">
                    <Edit3 :size="15" />
                  </button>
                  <button @click="handleDeleteLongAbsence(la)" class="btn-icon-ghost danger" title="Supprimer cette absence longue">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </div>

              <div class="la-dates-box">
                <div class="la-dates-row">
                  <span class="la-date-point">Du <strong>{{ formatDisplayDate(la.startDate) }}</strong> ({{ formatSlotName(la.startSlot) }})</span>
                  <span class="la-arrow">➔</span>
                  <span class="la-date-point">Au <strong>{{ formatDisplayDate(la.endDate) }}</strong> ({{ formatSlotName(la.endSlot) }})</span>
                </div>
              </div>

              <div v-if="la.note" class="la-note">
                💬 {{ la.note }}
              </div>
            </div>
          </div>

          <div class="modal-footer flex-between">
            <button type="button" @click="showLongAbsenceModal = false" class="btn btn-secondary">
              Fermer
            </button>
            <button type="button" @click="activeLongAbsenceTab = 'form'" class="btn btn-primary">
              <Plus :size="16" />
              <span>+ Nouvelle absence longue</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Choix du Type de Déclaration -->
    <div v-if="showDeclarationChoiceModal" class="modal-overlay" @click.self="showDeclarationChoiceModal = false">
      <div class="modal-content declaration-choice-modal">
        <div class="modal-header">
          <div class="modal-title-with-icon">
            <Plus :size="22" class="text-indigo" />
            <h3>Que souhaitez-vous déclarer ?</h3>
          </div>
          <button @click="showDeclarationChoiceModal = false" class="btn-close">&times;</button>
        </div>

        <div class="declaration-options-list">
          <!-- 1. Absence -->
          <button 
            type="button" 
            class="declaration-option-card option-absence" 
            @click="handleSelectDeclarationType('absence')"
          >
            <div class="declaration-option-icon absence-icon">
              <span>🚫</span>
            </div>
            <div class="declaration-option-content">
              <div class="declaration-option-title-row">
                <strong>Absence</strong>
                <span class="declaration-badge absence-badge">Journée / Repas</span>
              </div>
              <p class="declaration-option-desc">Signaler une absence pour un repas (midi, soir) ou pour la nuit.</p>
            </div>
            <ChevronRight :size="18" class="declaration-arrow" />
          </button>

          <!-- 2. Absence longue -->
          <button 
            type="button" 
            class="declaration-option-card option-long-absence" 
            @click="handleSelectDeclarationType('long-absence')"
          >
            <div class="declaration-option-icon long-absence-icon">
              <span>🗓️</span>
            </div>
            <div class="declaration-option-content">
              <div class="declaration-option-title-row">
                <strong>Absence longue</strong>
                <span class="declaration-badge long-absence-badge">Plusieurs jours</span>
              </div>
              <p class="declaration-option-desc">Déclarer une absence sur plusieurs jours avec choix des créneaux (vacances, week-ends...).</p>
            </div>
            <ChevronRight :size="18" class="declaration-arrow" />
          </button>

          <!-- 3. Invitation -->
          <button 
            type="button" 
            class="declaration-option-card option-guest" 
            @click="handleSelectDeclarationType('guest')"
          >
            <div class="declaration-option-icon guest-icon">
              <span>👥</span>
            </div>
            <div class="declaration-option-content">
              <div class="declaration-option-title-row">
                <strong>Invitation</strong>
                <span class="declaration-badge guest-badge">Invités</span>
              </div>
              <p class="declaration-option-desc">Inviter des personnes pour un repas (déjeuner, dîner) ou pour dormir sur place.</p>
            </div>
            <ChevronRight :size="18" class="declaration-arrow" />
          </button>

          <!-- 4. Présence -->
          <button 
            type="button" 
            class="declaration-option-card option-presence" 
            @click="handleSelectDeclarationType('presence')"
          >
            <div class="declaration-option-icon presence-icon">
              <span>🟢</span>
            </div>
            <div class="declaration-option-content">
              <div class="declaration-option-title-row">
                <strong>Présence</strong>
                <span class="declaration-badge presence-badge">Exceptionnelle</span>
              </div>
              <p class="declaration-option-desc">Confirmer la présence d'un membre habituellement absent.</p>
            </div>
            <ChevronRight :size="18" class="declaration-arrow" />
          </button>
        </div>

        <div class="modal-footer modal-footer-center">
          <button type="button" @click="showDeclarationChoiceModal = false" class="btn btn-secondary">
            Annuler
          </button>
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
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  CheckCircle2,
  Calendar,
  CalendarRange,
  Sun,
  Sunset,
  BedDouble
} from '@lucide/vue'
import HouseUser from '../components/icons/HouseUser.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { getAvatarTextFallback } from '../utils/avatarHelper'
import { useConfirm } from '../composables/useConfirm'
import { useSwipeNavigation } from '../composables/useSwipeNavigation'

const authStore = useAuthStore()
const store = useFamilyStore()
const { confirm } = useConfirm()

// Current user usual presence check
const isCurrentUserUsuallyAbsent = computed(() => {
  const member = store.members.find(m => m.id === authStore.user?.id)
  return member?.usualPresence === 'absent' || authStore.user?.usualPresence === 'absent'
})

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



// Guest Modal State
const showGuestModal = ref(false)
const editingGuestId = ref(null)
const guestForm = ref({
  name: '',
  date: store.todayStr,
  lunch: false,
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

// Calendar View Mode: 'month' or 'week'
const calendarViewMode = ref('week')

function getMonday(d) {
  d = new Date(d)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const currentMonday = ref(getMonday(new Date()))

const prevWeek = () => {
  const d = new Date(currentMonday.value)
  d.setDate(d.getDate() - 7)
  currentMonday.value = d
}

const nextWeek = () => {
  const d = new Date(currentMonday.value)
  d.setDate(d.getDate() + 7)
  currentMonday.value = d
}

const prevPeriod = () => {
  if (calendarViewMode.value === 'week') {
    prevWeek()
  } else {
    prevMonth()
  }
}

const nextPeriod = () => {
  if (calendarViewMode.value === 'week') {
    nextWeek()
  } else {
    nextMonth()
  }
}

// Navigation tactile par swipe (gauche = période suivante, droite = période précédente)
const absencesViewRef = ref(null)
useSwipeNavigation({
  target: absencesViewRef,
  onSwipeLeft: nextPeriod,
  onSwipeRight: prevPeriod
})

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
  currentMonday.value = getMonday(new Date())
}

const weekDays = computed(() => {
  const days = []
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const monthNamesList = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const base = new Date(currentMonday.value)
  const todayStr = store.todayStr

  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const dateStr = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate())

    const lunchPresence = store.getMealSlotPresence(dateStr, 'lunch')
    const dinnerPresence = store.getMealSlotPresence(dateStr, 'dinner')
    const nightPresence = store.getMealSlotPresence(dateStr, 'night')

    days.push({
      name: dayNames[i],
      shortName: dayNames[i].slice(0, 3),
      dateStr,
      dayNum: d.getDate(),
      monthShort: monthNamesList[d.getMonth()],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      lunchPresence,
      dinnerPresence,
      nightPresence
    })
  }
  return days
})

const currentWeekLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `Semaine du ${first.dayNum} ${first.monthShort} au ${last.dayNum} ${last.monthShort} ${currentMonday.value.getFullYear()}`
})

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

const isDayPast = (day) => {
  const check = formatDateStr(currentYear.value, currentMonth.value, day)
  return check < store.todayStr
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
  return store.isFamilyAdmin || mId === currentUserId || (dBy !== null && dBy === currentUserId)
}

const hasUsuallyAbsentMembers = computed(() => store.members.some(m => m.usualPresence === 'absent'))

const getDayAbsences = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return store.absences.filter(a => a.date === dateStr && a.type !== 'presence')
}

const getDayPresences = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return store.absences.filter(a => a.date === dateStr && a.type === 'presence')
}

const getDayGuests = (day) => {
  const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
  return store.mealGuests.filter(g => g.date === dateStr)
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

const getSlotHeadcount = (slot, dateStr = null) => {
  const targetDate = dateStr || store.todayStr
  const p = store.getMealSlotPresence(targetDate, slot)
  const noun = slot === 'night' ? 'personne(s) qui dorment' : 'à table'
  const details = []
  if (p.presentMembersCount > 0) details.push(`${p.presentMembersCount} membre${p.presentMembersCount > 1 ? 's' : ''}`)
  if (p.guestsCount > 0) details.push(`${p.guestsCount} invité${p.guestsCount > 1 ? 's' : ''}`)
  const detailsStr = details.length > 0 ? ` (${details.join(' + ')})` : ''
  return `${p.headcount} ${noun}${detailsStr}`
}

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
  
  let effectiveDate = defaultDate || store.todayStr
  if (effectiveDate < store.todayStr) {
    effectiveDate = store.todayStr
  }
  
  form.value = {
    type: initialType,
    memberId: initialMemberId,
    date: effectiveDate,
    lunch: false,
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

  if (!editingId.value && form.value.date < store.todayStr) {
    alert("Impossible d'enregistrer une présence ou une absence à une date passée.")
    return
  }

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
  const term = isPres ? 'cette présence exceptionnelle' : 'cette absence'
  const ok = await confirm({
    title: isPres ? 'Supprimer la présence' : 'Supprimer l\'absence',
    message: `Voulez-vous vraiment supprimer ${term} ?`,
    description: 'Cette action est irréversible.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (ok) {
    saving.value = true
    await store.deleteAbsence(targetId)
    saving.value = false
    showModal.value = false
  }
}

// Guest Modal actions
const openAddGuestModal = (defaultDate = null, defaultSlot = null) => {
  editingGuestId.value = null
  let initialDate = defaultDate || store.todayStr
  if (initialDate < store.todayStr) {
    initialDate = store.todayStr
  }
  guestForm.value = {
    name: '',
    date: initialDate,
    lunch: defaultSlot === 'lunch',
    dinner: defaultSlot === 'dinner',
    night: defaultSlot === 'night',
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

  if (!editingGuestId.value && guestForm.value.date < store.todayStr) {
    alert("Impossible d'ajouter un invité à une date passée.")
    return
  }

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
  if (selectedDayDate.value < store.todayStr) return
  showDayDetailModal.value = false
  openAddModal(selectedDayDate.value, defaultType, defaultMemberId)
}

const openAddGuestModalFromDay = () => {
  if (selectedDayDate.value < store.todayStr) return
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
  const ok = await confirm({
    title: 'Retirer l\'invité',
    message: 'Voulez-vous vraiment retirer cet invité ?',
    description: 'Cette action est irréversible.',
    confirmText: 'Retirer',
    type: 'danger'
  })
  if (ok) {
    saving.value = true
    await store.deleteMealGuest(id)
    saving.value = false
    showGuestModal.value = false
  }
}

// --- LONG ABSENCE STATE & METHODS ---
const showLongAbsenceModal = ref(false)
const activeLongAbsenceTab = ref('form')
const editingLongAbsenceId = ref(null)
const savingLongAbsence = ref(false)

const longAbsenceForm = ref({
  memberId: authStore.user?.id || 1,
  startDate: store.todayStr,
  startSlot: 'lunch',
  endDate: store.todayStr,
  endSlot: 'dinner',
  note: ''
})

const slotOrder = { lunch: 0, dinner: 1, night: 2 }

const isEndSlotDisabled = (slot) => {
  if (longAbsenceForm.value.startDate === longAbsenceForm.value.endDate) {
    return slotOrder[slot] < slotOrder[longAbsenceForm.value.startSlot]
  }
  return false
}

const setStartSlot = (slot) => {
  longAbsenceForm.value.startSlot = slot
  if (longAbsenceForm.value.startDate === longAbsenceForm.value.endDate) {
    if (slotOrder[longAbsenceForm.value.endSlot] < slotOrder[slot]) {
      longAbsenceForm.value.endSlot = slot
    }
  }
}

const setEndSlot = (slot) => {
  if (isEndSlotDisabled(slot)) return
  longAbsenceForm.value.endSlot = slot
}

const onStartDateChange = () => {
  if (!longAbsenceForm.value.startDate) return
  if (longAbsenceForm.value.endDate < longAbsenceForm.value.startDate) {
    longAbsenceForm.value.endDate = longAbsenceForm.value.startDate
  }
  if (longAbsenceForm.value.startDate === longAbsenceForm.value.endDate) {
    if (slotOrder[longAbsenceForm.value.endSlot] < slotOrder[longAbsenceForm.value.startSlot]) {
      longAbsenceForm.value.endSlot = longAbsenceForm.value.startSlot
    }
  }
}

const onEndDateChange = () => {
  if (!longAbsenceForm.value.endDate) return
  if (longAbsenceForm.value.endDate < longAbsenceForm.value.startDate) {
    longAbsenceForm.value.startDate = longAbsenceForm.value.endDate
  }
  if (longAbsenceForm.value.startDate === longAbsenceForm.value.endDate) {
    if (slotOrder[longAbsenceForm.value.endSlot] < slotOrder[longAbsenceForm.value.startSlot]) {
      longAbsenceForm.value.startSlot = longAbsenceForm.value.endSlot
    }
  }
}

const formatSlotName = (slot) => {
  if (slot === 'lunch') return 'Midi'
  if (slot === 'dinner') return 'Soir'
  if (slot === 'night') return 'Nuit'
  return slot || ''
}

const longAbsenceDaysCount = computed(() => {
  if (!longAbsenceForm.value.startDate || !longAbsenceForm.value.endDate) return 0
  const start = new Date(longAbsenceForm.value.startDate)
  const end = new Date(longAbsenceForm.value.endDate)
  const diffTime = end.getTime() - start.getTime()
  if (diffTime < 0) return 0
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
})

const getLongAbsenceById = (id) => {
  if (!id) return null
  return store.longAbsences.find(la => la.id === Number(id))
}

const getLongAbsenceForRecord = (abs) => {
  if (!abs) return null
  const laId = abs.record?.longAbsenceId || abs.longAbsenceId || getRecordForMember(abs.memberId || abs.id, selectedDayDate.value)?.longAbsenceId
  if (!laId) return null
  return getLongAbsenceById(laId)
}

const canEditLongAbsence = (la) => {
  if (!authStore.user || !la) return false
  const mId = Number(la.memberId)
  const dBy = la.declaredBy ? Number(la.declaredBy) : null
  const currentUserId = Number(authStore.user.id)
  return store.isFamilyAdmin || mId === currentUserId || (dBy !== null && dBy === currentUserId)
}

const openLongAbsenceModal = (defaultMemberId = null, defaultStartDate = null) => {
  editingLongAbsenceId.value = null
  activeLongAbsenceTab.value = 'form'
  const startDate = (defaultStartDate && defaultStartDate >= store.todayStr) ? defaultStartDate : store.todayStr
  longAbsenceForm.value = {
    memberId: defaultMemberId || authStore.user?.id || (store.members[0]?.id || 1),
    startDate: startDate,
    startSlot: 'lunch',
    endDate: startDate,
    endSlot: 'dinner',
    note: ''
  }
  showLongAbsenceModal.value = true
}

const openLongAbsenceModalFromDay = () => {
  if (selectedDayDate.value < store.todayStr) return
  showDayDetailModal.value = false
  openLongAbsenceModal(null, selectedDayDate.value)
}

const editLongAbsence = (la) => {
  editingLongAbsenceId.value = la.id
  activeLongAbsenceTab.value = 'form'
  longAbsenceForm.value = {
    memberId: la.memberId,
    startDate: la.startDate,
    startSlot: la.startSlot,
    endDate: la.endDate,
    endSlot: la.endSlot,
    note: la.note || ''
  }
  showLongAbsenceModal.value = true
}

const openEditLongAbsenceFromDay = (la) => {
  showDayDetailModal.value = false
  editLongAbsence(la)
}

const cancelEditLongAbsence = () => {
  editingLongAbsenceId.value = null
  if (store.longAbsences.length > 0) {
    activeLongAbsenceTab.value = 'list'
  } else {
    showLongAbsenceModal.value = false
  }
}

const handleLongAbsenceSubmit = async () => {
  if (!longAbsenceForm.value.startDate || !longAbsenceForm.value.endDate) {
    alert("Veuillez sélectionner les dates de début et de fin.")
    return
  }
  if (!editingLongAbsenceId.value && longAbsenceForm.value.startDate < store.todayStr) {
    alert("La date de début ne peut pas être dans le passé.")
    return
  }
  if (longAbsenceForm.value.endDate < longAbsenceForm.value.startDate) {
    alert("La date de fin ne peut pas précéder la date de début.")
    return
  }
  if (longAbsenceForm.value.startDate === longAbsenceForm.value.endDate) {
    if (slotOrder[longAbsenceForm.value.endSlot] < slotOrder[longAbsenceForm.value.startSlot]) {
      alert("Pour une même journée, le créneau de fin doit être identique ou postérieur au créneau de début.")
      return
    }
  }

  savingLongAbsence.value = true
  try {
    let result
    if (editingLongAbsenceId.value) {
      result = await store.updateLongAbsence(editingLongAbsenceId.value, longAbsenceForm.value)
    } else {
      result = await store.addLongAbsence(longAbsenceForm.value)
    }
    if (result && result.success) {
      showLongAbsenceModal.value = false
      editingLongAbsenceId.value = null
    } else {
      alert(result?.error || "Erreur lors de l'enregistrement de l'absence longue.")
    }
  } finally {
    savingLongAbsence.value = false
  }
}

const handleDeleteLongAbsence = async (la) => {
  const memberName = getMemberFirstName(la.memberId)
  const ok = await confirm({
    title: "Supprimer l'absence longue",
    message: `Voulez-vous vraiment supprimer l'absence longue de ${memberName} du ${formatDisplayDate(la.startDate)} au ${formatDisplayDate(la.endDate)} ?`,
    description: "Tous les créneaux quotidiens associés à cette absence longue seront automatiquement supprimés.",
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (ok) {
    savingLongAbsence.value = true
    try {
      const res = await store.deleteLongAbsence(la.id)
      if (res && res.success) {
        if (editingLongAbsenceId.value === la.id) {
          cancelEditLongAbsence()
        }
      } else {
        alert(res?.error || "Erreur lors de la suppression de l'absence longue.")
      }
    } finally {
      savingLongAbsence.value = false
    }
  }
}

const handleAbsentMemberClick = (memberId, dateStr) => {
  const rec = getRecordForMember(memberId, dateStr)
  if (!rec) return
  if (rec.longAbsenceId) {
    const la = getLongAbsenceById(rec.longAbsenceId)
    if (la) {
      editLongAbsence(la)
      return
    }
  }
  openEditModal(rec)
}

// --- DECLARATION CHOICE MODAL STATE & ACTIONS ---
const showDeclarationChoiceModal = ref(false)
const declarationChoiceTargetDate = ref(null)

const openDeclarationChoiceModal = (targetDate = null) => {
  declarationChoiceTargetDate.value = targetDate
  showDeclarationChoiceModal.value = true
}

const handleSelectDeclarationType = (type) => {
  showDeclarationChoiceModal.value = false
  showDayDetailModal.value = false
  const targetDate = declarationChoiceTargetDate.value

  if (type === 'absence') {
    openAddModal(targetDate, 'absence')
  } else if (type === 'long-absence') {
    openLongAbsenceModal(null, targetDate)
  } else if (type === 'guest') {
    openAddGuestModal(targetDate)
  } else if (type === 'presence') {
    openAddModal(targetDate, 'presence')
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
  white-space: nowrap;
  user-select: none;
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
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
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
  gap: 0.35rem;
}

.btn-cal-nav {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.btn-cal-nav:hover {
  color: var(--accent-primary);
  transform: scale(1.18);
}

.btn-cal-nav:active {
  transform: scale(0.95);
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
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Calendar Header Actions & View Mode Toggle */
.calendar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.calendar-view-mode-toggle {
  display: inline-flex;
  align-items: center;
  background: var(--bg-tertiary);
  padding: 0.2rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  gap: 0.15rem;
}

.view-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.65rem;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-mode-btn:hover {
  color: var(--text-primary);
}

.view-mode-btn.active {
  background: var(--bg-card);
  color: var(--accent-primary);
  box-shadow: var(--shadow-sm);
}

/* Weekly View for Absences */
.absences-week-view {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.week-days-columns {
  display: grid;
  grid-template-columns: repeat(7, minmax(130px, 1fr));
  gap: 0.5rem;
  align-items: stretch;
}

.week-day-column {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 320px;
}

.week-day-column:hover {
  transform: translateY(-2px);
  border-color: var(--accent-primary);
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}

.week-day-column.is-today {
  border: 2px solid var(--accent-primary);
  background: var(--accent-primary-light);
  box-shadow: 0 0 0 1px var(--accent-primary);
}

.week-day-column.is-past {
  opacity: 0.6;
  background: rgba(120, 120, 120, 0.08);
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.35);
}

.week-day-column.is-past:hover {
  opacity: 0.88;
}

.week-col-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border-color);
}

.week-col-title {
  display: flex;
  flex-direction: column;
}

.day-name-text {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-primary);
  text-transform: capitalize;
}

.day-date-text {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.today-tag-mini {
  background: var(--accent-primary);
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.past-tag-mini {
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
}

.week-col-slots {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
}

.week-col-slot {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.week-col-slot.lunch {
  border-left: 3px solid #f59e0b;
}

.week-col-slot.dinner {
  border-left: 3px solid #6366f1;
}

.week-col-slot.night {
  border-left: 3px solid #10b981;
}

.slot-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slot-name-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.slot-name-icon-lunch { color: #f59e0b; }
.slot-name-icon-dinner { color: #6366f1; }
.slot-name-icon-night { color: #10b981; }

.slot-headcount-tag {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.08rem 0.38rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-primary);
}

.slot-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.mini-chip {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  line-height: 1.2;
}

.mini-chip.chip-presence {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.mini-chip.chip-absence {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.mini-chip.chip-guest {
  background: rgba(139, 92, 246, 0.15);
  color: #7c3aed;
}

.mini-chip.chip-normal {
  background: transparent;
  color: var(--text-muted);
  font-weight: 500;
  font-style: italic;
  padding-left: 0;
}

.week-col-footer {
  text-align: center;
  padding-top: 0.25rem;
  border-top: 1px dashed var(--border-color);
}

.week-col-hint {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--accent-primary);
  opacity: 0.85;
}

.week-day-column.is-past .week-col-hint {
  color: var(--text-muted);
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

.day-cell.past {
  opacity: 0.55;
  background: rgba(120, 120, 120, 0.08);
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.35);
}

.day-cell.past:hover {
  opacity: 0.85;
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
  flex-shrink: 0;
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

/* .btn-icon-ghost vient du style global (src/style.css) */

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
  color: var(--text-secondary);
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

.past-day-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 1.25rem;
}

.past-day-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
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
  .absences-view {
    gap: 1rem;
  }
  .page-header {
    margin-bottom: 1.15rem;
    gap: 0.75rem;
  }
  .page-title {
    font-size: 1.5rem;
    gap: 0.6rem;
  }
  .page-subtitle {
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .header-actions-group {
    width: 100%;
    display: flex;
    gap: 0.45rem;
    align-items: stretch;
  }
  .header-actions-group .btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.42rem 0.45rem;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: var(--radius-md);
    white-space: nowrap;
    gap: 0.3rem;
    height: 36px;
    box-sizing: border-box;
    justify-content: center;
  }
  .header-actions-group .btn svg {
    width: 15px !important;
    height: 15px !important;
    flex-shrink: 0;
  }
  .today-banner {
    padding: 1rem;
    gap: 0.75rem;
  }
  .today-banner-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
  .today-title {
    font-size: 0.925rem;
    gap: 0.45rem;
  }
  .today-header-btns {
    width: 100%;
    display: flex;
    gap: 0.35rem;
  }
  .btn-today-add {
    flex: 1 1 0;
    min-width: 0;
    justify-content: center;
    padding: 0.28rem 0.35rem;
    font-size: 0.73rem;
    height: 28px;
    box-sizing: border-box;
    white-space: nowrap;
  }
  .btn-today-add svg {
    width: 13px !important;
    height: 13px !important;
    flex-shrink: 0;
  }
  .section-card {
    padding: 1rem;
  }
  .today-slots-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .meal-slot-card {
    padding: 0.75rem 0.85rem;
    gap: 0.5rem;
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
  .absences-view {
    gap: 0.85rem;
  }
  .page-header {
    margin-bottom: 0.85rem;
    gap: 0.55rem;
  }
  .page-title {
    font-size: 1.35rem;
  }
  .page-subtitle {
    font-size: 0.8rem;
    line-height: 1.3;
  }
  .header-actions-group {
    gap: 0.35rem;
  }
  .header-actions-group .btn {
    padding: 0.38rem 0.25rem;
    font-size: 0.76rem;
    height: 34px;
    gap: 0.22rem;
  }
  .header-actions-group .btn svg {
    width: 13px !important;
    height: 13px !important;
  }
  .today-banner {
    padding: 0.75rem;
    gap: 0.6rem;
  }
  .today-title {
    font-size: 0.85rem;
  }
  .today-header-btns {
    gap: 0.25rem;
  }
  .btn-today-add {
    padding: 0.22rem 0.25rem;
    font-size: 0.69rem;
    height: 26px;
    gap: 0.2rem;
  }
  .btn-today-add svg {
    width: 11px !important;
    height: 11px !important;
  }
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
  .headcount-num {
    font-size: 0.72rem;
  }
}

/* Responsive mobile weekly view: 1 column with 1 line per day */
@media (max-width: 768px) {
  .calendar-header-actions {
    justify-content: space-between;
    width: 100%;
  }

  .absences-week-view {
    overflow-x: visible;
  }

  .week-days-columns {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .week-day-column {
    min-height: auto;
    padding: 0.75rem 0.85rem;
    gap: 0.45rem;
  }

  .week-col-header {
    align-items: center;
    padding-bottom: 0.4rem;
  }

  .week-col-title {
    flex-direction: row;
    align-items: baseline;
    gap: 0.45rem;
  }

  .day-name-text {
    font-size: 0.95rem;
  }

  .day-date-text {
    font-size: 0.82rem;
  }

  .week-col-slots {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .week-col-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.35rem;
  }

  .week-col-hint {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .calendar-header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }

  .calendar-view-mode-toggle {
    width: 100%;
    justify-content: center;
  }

  .view-mode-btn {
    flex: 1;
    justify-content: center;
  }

  .calendar-nav-controls {
    justify-content: space-between;
    width: 100%;
  }
}

@media (max-width: 380px) {
  .week-col-slots {
    grid-template-columns: 1fr;
  }
}

/* Modals layout, header close button, and centered actions */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.btn-close {
  background: transparent !important;
  border: none !important;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.06) !important;
}

[data-theme="dark"] .btn-close:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.modal-footer {
  display: flex;
  align-items: center;
  margin-top: 1.75rem;
}

.modal-footer.modal-footer-center {
  justify-content: center;
}

.modal-footer.flex-between {
  justify-content: space-between;
}

.modal-actions-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-actions-buttons.center-actions {
  justify-content: center;
  width: 100%;
}

/* Long Absence Button in Header */
.btn-long-absence {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
  transition: all var(--transition-fast);
}

.btn-long-absence:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
  filter: brightness(1.05);
}

/* Person Long Absence Badge in Day Detail Modal */
.person-long-absence-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
  margin-top: 0.15rem;
  width: fit-content;
}

[data-theme="dark"] .person-long-absence-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.4);
}

/* Long Absence Modal */
.long-absence-modal {
  max-width: 540px;
  width: 95%;
}

.modal-title-with-icon {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.modal-title-with-icon h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.long-absence-tabs {
  display: flex;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
}

.long-absence-tabs .tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.long-absence-tabs .tab-btn.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.editing-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.65rem 0.9rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.2rem;
  font-size: 0.85rem;
  color: #b45309;
  font-weight: 600;
}

[data-theme="dark"] .editing-banner {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.35);
}

.btn-cancel-edit {
  background: transparent;
  border: 1px solid currentColor;
  color: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-cancel-edit:hover {
  background: rgba(245, 158, 11, 0.2);
}

.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 520px) {
  .form-row-2col {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

.slot-select-pills {
  display: flex;
  gap: 0.35rem;
  width: 100%;
}

.slot-pill-btn {
  flex: 1;
  padding: 0.55rem 0.35rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  white-space: nowrap;
}

.slot-pill-btn:hover:not(:disabled) {
  border-color: #f59e0b;
}

.slot-pill-btn.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

.slot-pill-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--border-color);
}

.long-absence-recap-card {
  background: rgba(245, 158, 11, 0.07);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  margin: 1.25rem 0 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.recap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recap-badge {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #d97706;
  letter-spacing: 0.03em;
}

[data-theme="dark"] .recap-badge {
  color: #fbbf24;
}

.recap-days {
  font-size: 0.82rem;
  font-weight: 800;
  background: #f59e0b;
  color: white;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-full);
}

.recap-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.recap-line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.recap-label {
  color: var(--text-muted);
  font-size: 0.8rem;
  width: 50px;
}

.slot-tag {
  font-size: 0.72rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
  color: var(--text-muted);
}

.recap-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0.2rem 0 0 0;
  line-height: 1.35;
}

.btn-long-absence-submit {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  border: none !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.btn-long-absence-submit:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* Tab 2: Long Absences List */
.empty-long-absences {
  text-align: center;
  padding: 2.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-muted);
}

.empty-long-absences .empty-icon {
  font-size: 2.5rem;
}

.empty-long-absences h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-long-absences p {
  margin: 0;
  font-size: 0.85rem;
  max-width: 320px;
}

.long-absences-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 440px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.long-absence-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-left: 3px solid #f59e0b;
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: all var(--transition-fast);
}

.long-absence-card:hover {
  border-color: #f59e0b;
  box-shadow: var(--shadow-sm);
}

.la-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.la-member {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.la-subtext {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.la-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.la-dates-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-sm);
}

.la-dates-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.84rem;
}

.la-date-point {
  color: var(--text-primary);
}

.la-arrow {
  color: #f59e0b;
  font-weight: 800;
}

.la-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Declaration Choice Modal & Button */
.btn-declare-main {
  font-weight: 700;
  padding: 0.6rem 1.25rem;
  border-radius: var(--radius-md);
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: all var(--transition-fast);
}

.btn-declare-main:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(99, 102, 241, 0.4);
}

@media (max-width: 600px) {
  .header-actions-group .btn.btn-declare-main {
    padding: 0.5rem 1rem !important;
    font-size: 0.88rem !important;
    height: 38px !important;
  }
}

.declaration-choice-modal {
  max-width: 500px;
  width: 95%;
}

.declaration-options-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 0.5rem 0 1rem 0;
}

.declaration-option-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1.15rem;
  background: var(--bg-tertiary);
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.declaration-option-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: var(--bg-card);
}

.declaration-option-card.option-absence:hover {
  border-color: #ef4444;
}

.declaration-option-card.option-long-absence:hover {
  border-color: #f59e0b;
}

.declaration-option-card.option-guest:hover {
  border-color: var(--accent-purple);
}

.declaration-option-card.option-presence:hover {
  border-color: var(--accent-emerald);
}

.declaration-option-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: transform var(--transition-fast);
}

.declaration-option-card:hover .declaration-option-icon {
  transform: scale(1.08);
}

.absence-icon {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
}

.long-absence-icon {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.25);
}

.guest-icon {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.25);
}

.presence-icon {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.25);
}

.declaration-option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.declaration-option-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.declaration-option-title-row strong {
  font-size: 1.02rem;
  color: var(--text-primary);
}

.declaration-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.12rem 0.5rem;
  border-radius: var(--radius-full);
}

.absence-badge {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.long-absence-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

.guest-badge {
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-purple);
}

.presence-badge {
  background: rgba(16, 185, 129, 0.15);
  color: var(--accent-emerald);
}

[data-theme="dark"] .absence-badge {
  color: #f87171;
}

[data-theme="dark"] .long-absence-badge {
  color: #fbbf24;
}

[data-theme="dark"] .presence-badge {
  color: #34d399;
}

.declaration-option-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.declaration-arrow {
  color: var(--text-muted);
  transition: transform var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.declaration-option-card:hover .declaration-arrow {
  transform: translateX(3px);
  color: var(--text-primary);
}
</style>
