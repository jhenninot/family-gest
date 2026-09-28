<template>
  <div class="dashboard-view">


    <!-- Summary Metrics Grid -->
    <!-- Summary Metrics Grid : 1. Présence, 1 bis. Repas du jour, 2. Courses, 3. Tâches, 4. Calendrier -->
    <div class="grid-4 metric-grid">
      <!-- Card 1: Présence (Absences & Repas aujourd'hui) -->
      <router-link :to="getPath('/absences')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper emerald">
          <HouseUser :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('nav.presence') }}</span>
          <div class="metric-value" :class="{ 'metric-value-text': store.todayAbsences.length === 0 && store.todayMealGuests.length === 0 }">
            {{ todayMealsCardValue }}
          </div>
          <span class="metric-subtext">
            {{ formatTodayAbsencesSubtext() }}
          </span>
        </div>
      </router-link>

      <!-- Card 1 bis : Repas du jour (plats prévus midi et soir) -->
      <router-link :to="getPath('/meals')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper rose">
          <Utensils :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('dashboard.todayMeals') }}</span>
          <div class="today-meal-lines">
            <div class="today-meal-line">
              <Sun :size="15" class="slot-row-icon-lunch" />
              <span class="today-meal-slot">{{ t('dashboard.slots.lunchSub') }}</span>
              <span class="today-meal-dish" :class="{ empty: todayLunchMeals.length === 0 }">{{ dishList(todayLunchMeals) }}</span>
            </div>
            <div class="today-meal-line">
              <Sunset :size="15" class="slot-row-icon-dinner" />
              <span class="today-meal-slot">{{ t('dashboard.slots.dinnerSub') }}</span>
              <span class="today-meal-dish" :class="{ empty: todayDinnerMeals.length === 0 }">{{ dishList(todayDinnerMeals) }}</span>
            </div>
          </div>
        </div>
      </router-link>

      <!-- Card 1 ter : Repas à organiser (votes en cours, prochain repas fixé) -->
      <router-link :to="getPath('/meals/plans')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper orange">
          <CalendarHeart :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('nav.mealPlans') }}</span>
          <div class="metric-value">{{ openMealPolls.length }}</div>
          <span class="metric-subtext">{{ mealPlansSubtext }}</span>
        </div>
      </router-link>

      <!-- Card 2: Liste de courses -->
      <router-link :to="getPath('/shopping')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper amber">
          <ShoppingCart :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('nav.shopping') }}</span>
          <div class="metric-value">{{ store.pendingShoppingCount }}</div>
          <span class="metric-subtext">
            {{ t('dashboard.urgentItems', { n: urgentShoppingCount }, urgentShoppingCount) }}
          </span>
        </div>
      </router-link>

      <!-- Card 3: Progression des Tâches -->
      <router-link :to="getPath('/tasks')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper indigo">
          <CheckSquare :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('dashboard.taskProgress') }}</span>
          <div class="metric-value">{{ store.taskCompletionPercentage }}%</div>
          <div class="progress-bar-bg margin-top-xs">
            <div class="progress-bar-fill" :style="{ width: store.taskCompletionPercentage + '%' }"></div>
          </div>
          <span class="metric-subtext">{{ t('dashboard.pendingTasks', { n: store.pendingTasksCount }, store.pendingTasksCount) }}</span>
        </div>
      </router-link>

      <!-- Card 4: Événements du jour (Calendrier) -->
      <router-link :to="getPath('/calendar')" class="glass-card metric-card clickable-card">
        <div class="metric-icon-wrapper purple">
          <Calendar :size="22" />
        </div>
        <div class="metric-details">
          <span class="metric-label">{{ t('dashboard.todayEvents') }}</span>
          <div class="metric-value">{{ todayEvents.length }}</div>
          <span class="metric-subtext">{{ todayEventsSubtext }}</span>
        </div>
      </router-link>
    </div>

    <!-- Main Content Section: 2 Columns (1. Présence, 2. Courses | 3. Tâches, 4. Événements, 5. Membres) -->
    <div class="grid-2 dashboard-main-grid">
      <!-- Column 1 (Left): 1. Présence, 2. Liste de courses -->
      <div class="dashboard-column-left">
        <!-- 1. Présence : Today's Meals & Night Breakdown Widget -->
        <div class="glass-card section-card margin-bottom-md today-meals-widget">
          <div class="section-card-header">
            <div class="header-title">
              <HouseUser :size="20" class="text-emerald" />
              <h2>{{ t('dashboard.presenceAndMeals') }}</h2>
            </div>
            <div class="header-links-group">
              <router-link :to="getPath('/meals')" class="view-all-link meals-link" :title="t('dashboard.manageMeals')">
                <Utensils :size="13" />
                <span>{{ t('dashboard.menus') }}</span>
              </router-link>
              <router-link :to="getPath('/absences')" class="view-all-link">{{ t('dashboard.planning') }} &rarr;</router-link>
            </div>
          </div>

          <div class="today-slots-list">
            <!-- Déjeuner (Midi) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <Sun :size="20" class="slot-row-icon slot-row-icon-lunch" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">{{ t('dashboard.slots.lunch') }}</span>
                    <span class="slot-row-subtitle">{{ t('dashboard.slots.lunchSub') }}</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-lunch">
                    <i18n-t keypath="dashboard.atTable" :plural="lunchHeadcount" tag="span"><template #n><strong>{{ lunchHeadcount }}</strong></template></i18n-t>
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayLunchPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">{{ t('dashboard.absentsLabel', { n: todayLunchPresence.absentMembers.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayLunchPresence.absentMembers" 
                      :key="'l-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles -->
                <div v-if="todayLunchPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">{{ t('dashboard.presencesLabel', { n: todayLunchPresence.exceptionalPresences.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayLunchPresence.exceptionalPresences" 
                      :key="'l-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayLunchPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">{{ t('dashboard.guestsLabel', { n: todayLunchPresence.guestsCount }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayLunchPresence.guests" 
                      :key="'l-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? t('dashboard.guestNote', { note: g.note }) : t('dashboard.guest')"
                    >
                      👥 {{ guestLabel(g) }}
                    </span>
                  </div>
                </div>

                <!-- Au complet sans invité -->
                <div v-if="todayLunchPresence.absentMembers.length === 0 && todayLunchPresence.exceptionalPresences.length === 0 && todayLunchPresence.guests.length === 0" class="slot-all-present">
                  {{ t('dashboard.fullNoGuestCount', { n: todayLunchPresence.headcount }) }}
                </div>

                <!-- Plat(s) prévu(s) ce midi -->
                <div v-if="todayLunchMeals.length > 0" class="slot-dish-highlight">
                  <span class="dish-badge-label">🍲 {{ t('dashboard.onTheMenu') }}</span>
                  <span class="dish-badge-text">{{ todayLunchMeals.map(m => m.dish).join(' • ') }}</span>
                </div>
              </div>
            </div>

            <!-- Dîner (Soir) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <Sunset :size="20" class="slot-row-icon slot-row-icon-dinner" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">{{ t('dashboard.slots.dinner') }}</span>
                    <span class="slot-row-subtitle">{{ t('dashboard.slots.dinnerSub') }}</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-dinner">
                    <i18n-t keypath="dashboard.atTable" :plural="dinnerHeadcount" tag="span"><template #n><strong>{{ dinnerHeadcount }}</strong></template></i18n-t>
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents -->
                <div v-if="todayDinnerPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">{{ t('dashboard.absentsLabel', { n: todayDinnerPresence.absentMembers.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayDinnerPresence.absentMembers" 
                      :key="'d-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles -->
                <div v-if="todayDinnerPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">{{ t('dashboard.presencesLabel', { n: todayDinnerPresence.exceptionalPresences.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayDinnerPresence.exceptionalPresences" 
                      :key="'d-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités -->
                <div v-if="todayDinnerPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">{{ t('dashboard.guestsLabel', { n: todayDinnerPresence.guestsCount }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayDinnerPresence.guests" 
                      :key="'d-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? t('dashboard.guestNote', { note: g.note }) : t('dashboard.guest')"
                    >
                      👥 {{ guestLabel(g) }}
                    </span>
                  </div>
                </div>

                <!-- Au complet sans invité -->
                <div v-if="todayDinnerPresence.absentMembers.length === 0 && todayDinnerPresence.exceptionalPresences.length === 0 && todayDinnerPresence.guests.length === 0" class="slot-all-present">
                  {{ t('dashboard.fullNoGuestCount', { n: todayDinnerPresence.headcount }) }}
                </div>

                <!-- Plat(s) prévu(s) ce soir -->
                <div v-if="todayDinnerMeals.length > 0" class="slot-dish-highlight">
                  <span class="dish-badge-label">🍲 {{ t('dashboard.onTheMenu') }}</span>
                  <span class="dish-badge-text">{{ todayDinnerMeals.map(m => m.dish).join(' • ') }}</span>
                </div>
              </div>
            </div>

            <!-- Nuit (Couchage) -->
            <div class="today-slot-row">
              <div class="slot-row-top">
                <div class="slot-header-left">
                  <BedDouble :size="20" class="slot-row-icon slot-row-icon-night" />
                  <div class="slot-row-title-col">
                    <span class="slot-row-title">{{ t('dashboard.slots.night') }}</span>
                    <span class="slot-row-subtitle">{{ t('dashboard.slots.nightSub') }}</span>
                  </div>
                </div>
                <div class="slot-row-badge-wrapper">
                  <span class="headcount-badge badge-night">
                    <i18n-t keypath="dashboard.presentCount" :plural="nightHeadcount" tag="span"><template #n><strong>{{ nightHeadcount }}</strong></template></i18n-t>
                  </span>
                </div>
              </div>

              <div class="slot-row-content">
                <!-- Absents (dorment ailleurs) -->
                <div v-if="todayNightPresence.absentMembers.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label absent-badge">{{ t('dashboard.absentsLabel', { n: todayNightPresence.absentMembers.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayNightPresence.absentMembers" 
                      :key="'n-abs-' + m.id" 
                      class="person-tag absent-tag"
                      :title="m.name"
                    >
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Présences exceptionnelles (dorment à la maison) -->
                <div v-if="todayNightPresence.exceptionalPresences.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label presence-badge">{{ t('dashboard.presencesLabel', { n: todayNightPresence.exceptionalPresences.length }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="m in todayNightPresence.exceptionalPresences" 
                      :key="'n-prs-' + m.id" 
                      class="person-tag presence-tag"
                      :title="m.name"
                    >
                      <span class="presence-dot">🟢</span>
                      <UserAvatar :avatar="m.avatar" :name="m.firstName" size="xs" />
                      <span>{{ m.firstName }}</span>
                    </span>
                  </div>
                </div>

                <!-- Invités (dorment à la maison) -->
                <div v-if="todayNightPresence.guests.length > 0" class="slot-detail-item">
                  <span class="detail-badge-label guest-badge">{{ t('dashboard.guestsLabel', { n: todayNightPresence.guestsCount }) }}</span>
                  <div class="detail-tags-list">
                    <span 
                      v-for="g in todayNightPresence.guests" 
                      :key="'n-gst-' + g.id" 
                      class="person-tag guest-tag"
                      :title="g.note ? t('dashboard.guestNote', { note: g.note }) : t('dashboard.sleepsHome')"
                    >
                      👥 {{ guestLabel(g) }}
                    </span>
                  </div>
                </div>

                <!-- Au complet -->
                <div v-if="todayNightPresence.absentMembers.length === 0 && todayNightPresence.exceptionalPresences.length === 0 && todayNightPresence.guests.length === 0" class="slot-all-present">
                  {{ t('dashboard.everyoneSleepsHome', { n: todayNightPresence.headcount }) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Liste de courses Widget -->
        <div class="glass-card section-card margin-bottom-md shopping-dashboard-widget">
          <div class="section-card-header">
            <div class="header-title">
              <ShoppingCart :size="20" class="text-amber" />
              <h2>{{ t('nav.shopping') }}</h2>
            </div>
            <router-link :to="getPath('/shopping')" class="view-all-link">{{ t('dashboard.seeList') }} &rarr;</router-link>
          </div>

          <div class="tasks-list">
            <div 
              v-for="item in dashboardShoppingItems" 
              :key="item.id"
              class="task-item-row"
            >
              <input 
                type="checkbox" 
                :checked="item.checked" 
                @change="store.toggleShoppingItem(item.id)" 
                class="custom-checkbox"
                :title="item.checked ? t('dashboard.uncheckItem') : t('dashboard.checkItem')"
              />
              <div class="task-info">
                <span class="task-title-text">{{ item.name }}</span>
                <div class="task-meta">
                  <span class="badge badge-amber" v-if="item.category">
                    {{ getShoppingCategoryIcon(item.category) }} {{ translateValue('shoppingCategory', item.category) }}
                  </span>
                  <span v-if="item.quantity" class="assigned-tag">
                    {{ t('shopping.qty', { n: item.quantity }) }}
                  </span>
                  <span v-if="item.urgent" class="badge badge-rose">
                    {{ t('shopping.urgent') }} 🔥
                  </span>
                </div>
              </div>
            </div>

            <div v-if="dashboardShoppingItems.length === 0" class="empty-state">
              🛒 {{ t('shopping.emptyPending') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Column 2 (Right): 3. Tâches, 4. Événements, 5. Membres -->
      <div class="dashboard-column-right">
        <!-- 3. Tâches : Today's Tasks Checklist -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <CheckSquare :size="20" class="text-indigo" />
              <h2>{{ t('dashboard.tasksToDo') }}</h2>
            </div>
            <router-link :to="getPath('/tasks')" class="view-all-link">{{ t('dashboard.seeAll') }} &rarr;</router-link>
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
                  <span class="badge badge-indigo">{{ translateValue('taskCategory', task.category) }}</span>
                  <span class="assigned-tag">
                    {{ getMemberName(task.assignedTo) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="dashboardTasks.length === 0" class="empty-state">
              👍 {{ t('dashboard.allTasksDone') }}
            </div>
          </div>
        </div>

        <!-- Repas à organiser : votes en cours et repas fixés à venir -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <CalendarHeart :size="20" class="text-orange" />
              <h2>{{ t('nav.mealPlans') }}</h2>
            </div>
            <router-link :to="getPath('/meals/plans')" class="view-all-link">{{ t('dashboard.seeAll') }} &rarr;</router-link>
          </div>

          <div class="plans-list">
            <router-link
              v-for="p in dashboardMealPlans"
              :key="p.id"
              :to="{ path: getPath('/meals/plans'), query: { poll: String(p.id) } }"
              class="plan-row"
            >
              <span class="plan-row-icon">{{ p.slot === 'lunch' ? '☀️' : '🌙' }}</span>
              <div class="plan-row-main">
                <span class="plan-row-title">{{ p.title }}</span>
                <span v-if="p.status === 'closed'" class="plan-row-meta fixed">
                  📅 {{ t('dashboard.mealPlans.fixedOn', { date: shortDay(p.chosenDate) }) }}
                </span>
                <span v-else class="plan-row-meta">
                  {{ t('mealPolls.answered', { n: p.summary.answered, total: p.summary.total }) }}<template v-if="p.summary.bestDate"> · {{ t('mealPolls.best', { date: shortDay(p.summary.bestDate) }) }}</template>
                </span>
              </div>
              <span class="plan-row-status" :class="p.status">{{ t(`mealPolls.status.${p.status}`) }}</span>
            </router-link>
            <div v-if="dashboardMealPlans.length === 0" class="empty-state">
              🍽️ {{ t('dashboard.mealPlans.empty') }}
              <router-link :to="{ path: getPath('/meals/plans'), query: { new: '1' } }" class="plan-create-link">
                + {{ t('mealPolls.new') }}
              </router-link>
            </div>
          </div>
        </div>

        <!-- 4. Prochains événements (Calendrier) -->
        <div class="glass-card section-card margin-bottom-md">
          <div class="section-card-header">
            <div class="header-title">
              <Calendar :size="20" class="text-purple" />
              <h2>{{ t('dashboard.upcomingEvents') }}</h2>
            </div>
            <router-link :to="getPath('/calendar')" class="view-all-link">{{ t('dashboard.seeCalendar') }} &rarr;</router-link>
          </div>

          <div class="events-list">
            <div
              v-for="event in dashboardEvents"
              :key="event.id"
              class="event-item-row event-item-clickable"
              role="button"
              tabindex="0"
              :title="t('dashboard.eventDetail.open')"
              @click="selectedEvent = event"
              @keydown.enter.prevent="selectedEvent = event"
              @keydown.space.prevent="selectedEvent = event"
            >
              <div class="event-date-box" :style="{ '--event-accent-color': event.color }">
                <span class="event-weekday">{{ getWeekdayShort(event.date) }}</span>
                <span class="event-day">{{ getDayNumber(event.date) }}</span>
                <span class="event-month">{{ getMonthShort(event.date) }}</span>
              </div>
              <div class="event-details">
                <span class="event-item-title">{{ event.title }}</span>
                <div class="event-meta-info">
                  <template v-if="isMultiDayEvent(event)">
                    <Calendar :size="14" />
                    <span>{{ t('calendar.untilDate', { date: `${getDayNumber(event.endDate)} ${getMonthShort(event.endDate)}` }) }}</span>
                  </template>
                  <Clock v-if="event.time" :size="14" :class="{ 'margin-left-xs': isMultiDayEvent(event) }" />
                  <span v-if="event.time">{{ event.time }}</span>
                  <template v-if="event.location">
                    <MapPin :size="14" class="margin-left-xs" />
                    <span>{{ translateValue('location', event.location) }}</span>
                  </template>
                </div>
              </div>

              <!-- Export direct agenda -->
              <div class="dash-event-export-btns" @click.stop @keydown.stop>
                <button 
                  @click="openGoogleCalendar(event)" 
                  class="btn-dash-cal btn-dash-google" 
                  :title="t('calendarExport.addToGoogle')"
                  :aria-label="t('calendarExport.addToGoogle')"
                >
                  <ExternalLink :size="12" />
                  <span class="dash-btn-text">Google</span>
                </button>
                <button 
                  @click="downloadIcsFile(event)" 
                  class="btn-dash-cal btn-dash-ics" 
                  :title="t('calendarExport.downloadIcsTitle')"
                  :aria-label="t('calendarExport.downloadIcs')"
                >
                  <Download :size="12" />
                  <span class="dash-btn-text">.ics</span>
                </button>
              </div>
            </div>
            <div v-if="dashboardEvents.length === 0" class="empty-state">
              📅 {{ t('dashboard.noUpcomingEvents') }}
            </div>
          </div>
        </div>

        <!-- Détail d'un événement (clic sur « Prochains événements ») -->
        <div v-if="selectedEvent" class="modal-overlay" @click.self="selectedEvent = null">
          <div class="modal-content event-detail-modal" role="dialog" aria-modal="true" :aria-label="selectedEvent.title">
            <div class="modal-header">
              <h3 class="event-detail-title">
                <span class="event-detail-dot" :style="{ backgroundColor: selectedEvent.color }"></span>
                <span v-if="selectedEvent.recurrenceId" :title="t('calendar.recurringEvent')">🔁</span>
                {{ selectedEvent.title }}
              </h3>
              <button type="button" class="btn-close" :aria-label="t('common.close')" @click="selectedEvent = null">&times;</button>
            </div>

            <span class="badge event-detail-badge" :style="{ backgroundColor: selectedEvent.color + '25', color: selectedEvent.color }">
              {{ translateValue('eventCategory', selectedEvent.category) }}
            </span>

            <ul class="event-detail-list">
              <li>
                <Calendar :size="16" />
                <span>{{ eventDetailDate(selectedEvent) }}</span>
              </li>
              <li>
                <Clock :size="16" />
                <span>{{ selectedEvent.time ? (selectedEvent.endTime ? `${selectedEvent.time} – ${selectedEvent.endTime}` : selectedEvent.time) : t('calendar.allDay') }}</span>
              </li>
              <li v-if="selectedEvent.location">
                <MapPin :size="16" />
                <span>{{ translateValue('location', selectedEvent.location) }}</span>
              </li>
              <li v-if="eventDetailMembers.length === 0" class="event-detail-members">
                <Users :size="16" />
                <span class="event-detail-none">{{ t('dashboard.eventDetail.noMembers') }}</span>
              </li>
              <li v-else class="event-detail-members">
                <UserAvatar
                  v-for="m in eventDetailMembers"
                  :key="m.id"
                  :avatar="m.avatar"
                  :name="m.name"
                  size="xs"
                />
                <span>{{ eventDetailMembers.map(m => m.firstName || m.name).join(', ') }}</span>
              </li>
              <li v-if="selectedEvent.recurrenceId" class="event-detail-note">
                🔁 {{ t('calendar.partOfSeries') }}
              </li>
            </ul>

            <div class="event-detail-actions">
              <button type="button" class="btn-dash-cal btn-dash-google" @click="openGoogleCalendar(selectedEvent)">
                <ExternalLink :size="14" />
                <span>{{ t('calendarExport.addToGoogle') }}</span>
              </button>
              <button type="button" class="btn-dash-cal btn-dash-ics" @click="downloadIcsFile(selectedEvent)">
                <Download :size="14" />
                <span>{{ t('calendarExport.downloadIcs') }}</span>
              </button>
            </div>

            <div class="modal-footer event-detail-footer">
              <button type="button" class="btn btn-secondary" @click="selectedEvent = null">{{ t('common.close') }}</button>
              <button type="button" class="btn btn-primary" @click="editSelectedEvent">
                <Edit3 :size="16" /> {{ t('dashboard.eventDetail.edit') }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useI18n } from 'vue-i18n'
import { formatDate } from '../i18n/format'
import { translateValue } from '../i18n/values'
import {
  CheckSquare,
  Calendar,
  ShoppingCart,
  Utensils,
  Clock,
  MapPin,
  ExternalLink,
  Download,
  Edit3,
  Users,
  Sun,
  Sunset,
  BedDouble,
  CalendarHeart
} from '@lucide/vue'
import HouseUser from '../components/icons/HouseUser.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { openGoogleCalendar, downloadIcsFile } from '../utils/calendarExport'
import { eventOnDate, eventOverlaps, isMultiDayEvent } from '../utils/events'
import { guestLabel } from '../utils/guests'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const store = useFamilyStore()
const { t } = useI18n()

const currentSlug = computed(() => route.params.familySlug || store.currentFamily?.slug || localStorage.getItem('familygest_active_slug') || '')
const getPath = (sub) => currentSlug.value ? `/${currentSlug.value}${sub}` : (sub || '/')

const urgentShoppingCount = computed(() => {
  return (store.shoppingList || []).filter(item => !item.checked && item.urgent).length
})

const dashboardShoppingItems = computed(() => {
  return (store.shoppingList || [])
    .filter(item => !item.checked)
    .sort((a, b) => {
      if (a.urgent && !b.urgent) return -1
      if (!a.urgent && b.urgent) return 1
      return 0
    })
    .slice(0, 6)
})

const dashboardTasks = computed(() => {
  return (store.tasks || []).slice(0, 6)
})

// Repas à organiser : votes en cours d'abord, puis repas fixés à venir (les plus proches)
const openMealPolls = computed(() => (store.mealPolls || []).filter(p => p.status === 'open'))
const upcomingFixedMeals = computed(() => (store.mealPolls || [])
  .filter(p => p.status === 'closed' && p.chosenDate && p.chosenDate >= store.todayStr)
  .sort((a, b) => a.chosenDate.localeCompare(b.chosenDate)))
const dashboardMealPlans = computed(() => [...openMealPolls.value, ...upcomingFixedMeals.value].slice(0, 5))
const shortDay = (dateStr) => formatDate(new Date(`${dateStr}T00:00:00`), { weekday: 'short', day: 'numeric', month: 'short' })
const mealPlansSubtext = computed(() => {
  const next = upcomingFixedMeals.value[0]
  if (next) return t('dashboard.mealPlans.next', { title: next.title, date: shortDay(next.chosenDate) })
  if (openMealPolls.value.length > 0) return t('dashboard.mealPlans.voting', { n: openMealPolls.value.length }, openMealPolls.value.length)
  return t('dashboard.mealPlans.none')
})

const dashboardEvents = computed(() => {
  const today = store.todayStr
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 6)
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  return (store.events || [])
    .filter(e => eventOverlaps(e, today, cutoffStr))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
})

// Détail d'un événement des « Prochains événements » ; « Modifier » ouvre sa fiche dans l'agenda
const selectedEvent = ref(null)

const eventDetailMembers = computed(() => {
  // Membres concernés, plus la personne « assignée » des anciens événements
  const event = selectedEvent.value
  if (!event) return []
  const ids = [...new Set([...(event.memberIds || []), event.assignedTo].filter(id => id != null).map(String))]
  return ids.map(id => store.members.find(m => String(m.id) === id)).filter(Boolean)
})

const longDate = (dateStr) => formatDate(new Date(`${dateStr}T00:00:00`), { weekday: 'long', day: 'numeric', month: 'long' })
const eventDetailDate = (event) => isMultiDayEvent(event)
  ? t('calendar.dateRange', { start: longDate(event.date), end: longDate(event.endDate) })
  : longDate(event.date)

const editSelectedEvent = () => {
  const id = selectedEvent.value?.id
  selectedEvent.value = null
  router.push({ path: getPath('/calendar'), query: { event: String(id) } })
}

const todayEvents = computed(() => {
  const today = store.todayStr
  return (store.events || [])
    .filter(e => eventOnDate(e, today))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
})

const todayEventsSubtext = computed(() => {
  const events = todayEvents.value
  if (events.length === 0) return t('dashboard.noEventToday')
  const maxShown = 3
  const titles = events.slice(0, maxShown).map(e => e.title)
  const remaining = events.length - maxShown
  return remaining > 0
    ? `${titles.join(' • ')} • ${t('dashboard.moreEvents', { n: remaining }, remaining)}`
    : titles.join(' • ')
})

const getShoppingCategoryIcon = (categoryName) => {
  const cat = (store.shoppingCategories || []).find(c => c.name === categoryName)
  return cat?.icon || '🛒'
}

const getMemberName = (id) => {
  if (!id) return t('dashboard.unassigned')
  const m = store.members.find(m => m.id === id || String(m.id) === String(id))
  return m ? (m.firstName || m.name) : t('dashboard.unassigned')
}

const getDayNumber = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts[2] ? String(parseInt(parts[2], 10)) : ''
}

const getMonthShort = (dateStr) => {
  if (!dateStr) return ''
  return formatDate(new Date(dateStr + 'T00:00:00'), { month: 'short' }).replace(/\.$/, '')
}

const getWeekdayShort = (dateStr) => {
  if (!dateStr) return ''
  return formatDate(new Date(dateStr + 'T00:00:00'), { weekday: 'short' }).replace(/\.$/, '')
}

const loadDashboardData = async () => {
  const targetSlug = route.params.familySlug || store.currentFamily?.slug || localStorage.getItem('familygest_active_slug')
  if (targetSlug) {
    if (!store.currentFamily || store.currentFamily.slug !== targetSlug) {
      const ok = await store.fetchCurrentFamily(targetSlug)
      if (!ok && !authStore.isSuperAdmin) {
        router.push({ name: 'select-family' })
        return
      }
    }
    await store.fetchAllData()
    if (!store.currentFamily && !authStore.isSuperAdmin) {
      router.push({ name: 'select-family' })
    }
  } else if (!authStore.isSuperAdmin) {
    router.push({ name: 'select-family' })
  }
}

onMounted(async () => {
  await loadDashboardData()
})

watch(() => route.params.familySlug, async (newSlug) => {
  if (newSlug) {
    await loadDashboardData()
  }
})

const todayLunchPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'lunch'))
const todayDinnerPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'dinner'))
const todayNightPresence = computed(() => store.getMealSlotPresence(store.todayStr, 'night'))

const lunchHeadcount = computed(() => todayLunchPresence.value.headcount)
const dinnerHeadcount = computed(() => todayDinnerPresence.value.headcount)
const nightHeadcount = computed(() => todayNightPresence.value.headcount)

const todayMealsCardValue = computed(() => {
  return t('dashboard.headcountSummary', { lunch: lunchHeadcount.value, dinner: dinnerHeadcount.value })
})

const todayMeals = computed(() => (store.getMealsForDate ? store.getMealsForDate(store.todayStr) : { lunch: [], dinner: [] }))
const todayLunchMeals = computed(() => todayMeals.value.lunch || [])
const todayDinnerMeals = computed(() => todayMeals.value.dinner || [])
// « Poulet rôti, Salade » ou « Rien de prévu »
const dishList = (meals) => meals.length > 0 ? meals.map(m => m.dish).join(', ') : t('dashboard.noDishPlanned')

const formatTodayAbsencesSubtext = () => {
  const parts = []
  const l = todayLunchPresence.value
  const d = todayDinnerPresence.value
  const n = todayNightPresence.value

  const totalAbsents = new Set([...l.absentMembers, ...d.absentMembers, ...n.absentMembers].map(m => m.id)).size
  const totalPresences = new Set([...l.exceptionalPresences, ...d.exceptionalPresences, ...n.exceptionalPresences].map(m => m.id)).size
  const totalGuests = new Set([...l.guests, ...d.guests, ...n.guests].map(g => g.id)).size

  if (totalAbsents > 0) {
    parts.push(`🚫 ${t('dashboard.absentCount', { n: totalAbsents }, totalAbsents)}`)
  }
  if (totalPresences > 0) {
    parts.push(`🟢 ${t('dashboard.presenceCount', { n: totalPresences }, totalPresences)}`)
  }
  if (totalGuests > 0) {
    parts.push(`👥 ${t('dashboard.guestCount', { n: totalGuests }, totalGuests)}`)
  }
  if (parts.length === 0) {
    return t('dashboard.fullNoGuest')
  }
  return parts.join(' • ')
}

const getMemberAvatar = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  return m ? m.avatar : '👤'
}

const getMemberFirstName = (memberId) => {
  const m = store.members.find(m => m.id === memberId)
  if (!m) return t('common.unknown')
  return m.firstName || (m.name ? m.name.split(' ')[0] : t('menu.badges.member'))
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
.metric-icon-wrapper.rose { background: linear-gradient(135deg, #f43f5e, #fb7185); }
.metric-icon-wrapper.orange { background: linear-gradient(135deg, #f97316, #fb923c); }
.text-orange { color: #f97316; }

/* Six cartes de synthèse : 3 + 3 sur écran moyen, une seule ligne sur grand écran */
@media (min-width: 1025px) {
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 1600px) {
  .metric-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}

/* Repas à organiser */
.plans-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.plan-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease;
}

.plan-row:hover {
  border-color: #f97316;
}

.plan-row-icon {
  font-size: 1.2rem;
}

.plan-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.plan-row-title {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.plan-row-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.plan-row-meta.fixed {
  color: var(--accent-primary);
  font-weight: 600;
}

.plan-row-status {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}

.plan-row-status.open {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.plan-row-status.closed {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.plan-create-link {
  display: inline-block;
  margin-top: 0.5rem;
  color: #f97316;
  font-weight: 700;
  text-decoration: none;
}

.today-meal-lines {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.35rem;
}

.today-meal-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.4rem;
  min-width: 0;
}

.today-meal-line svg {
  flex-shrink: 0;
  align-self: center;
}

.today-meal-slot {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.today-meal-dish {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow-wrap: break-word;
  min-width: 0;
}

.today-meal-dish.empty {
  font-weight: 500;
  color: var(--text-muted);
}

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

.dashboard-column-left,
.dashboard-column-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

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

.dashboard-members-admin-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-all-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-decoration: none;
}
.view-all-link:hover { text-decoration: underline; }

.header-links-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-all-link.meals-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent-amber);
  font-weight: 700;
}

.slot-dish-highlight {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--accent-amber-light);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  margin-top: 0.35rem;
}

.dish-badge-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--accent-amber);
  flex-shrink: 0;
}

.dish-badge-text {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

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
  flex-shrink: 0;
}

.slot-row-icon-lunch { color: #b45309; }
[data-theme="dark"] .slot-row-icon-lunch { color: #fbbf24; }

.slot-row-icon-dinner { color: #4338ca; }
[data-theme="dark"] .slot-row-icon-dinner { color: #a5b4fc; }

.slot-row-icon-night { color: #6d28d9; }
[data-theme="dark"] .slot-row-icon-night { color: #c4b5fd; }

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

.detail-badge-label.presence-badge {
  color: #10b981;
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

.presence-tag {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
[data-theme="dark"] .presence-tag {
  color: #34d399;
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
  position: relative;
  width: 44px;
  height: 58px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.event-date-box::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--event-accent-color, var(--accent-purple));
}

.event-weekday { font-size: 0.6rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; line-height: 1.2; }
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

.event-item-clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.event-item-clickable:hover,
.event-item-clickable:focus-visible {
  border-color: var(--accent-primary);
  outline: none;
}

.event-detail-modal {
  max-width: 460px;
}

.event-detail-modal .modal-header {
  margin-bottom: 0.75rem;
}

.event-detail-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-wrap: anywhere;
}

.event-detail-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-detail-badge {
  display: inline-block;
  margin-bottom: 1rem;
}

.event-detail-list {
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.event-detail-list li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.event-detail-list li :deep(svg) {
  flex-shrink: 0;
  color: var(--text-muted);
}

.event-detail-members {
  flex-wrap: wrap;
}

.event-detail-none {
  color: var(--text-muted);
  font-style: italic;
}

.event-detail-note {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.event-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.event-detail-actions .btn-dash-cal {
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
}

.event-detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.event-detail-footer .btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.event-meta-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.775rem;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.dash-event-export-btns {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-dash-cal {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-dash-cal:hover {
  transform: translateY(-1px);
}

.btn-dash-google:hover {
  color: #4285f4;
  border-color: #4285f4;
  background: rgba(66, 133, 244, 0.08);
}

.btn-dash-ics:hover {
  color: var(--accent-purple);
  border-color: var(--accent-purple);
  background: var(--accent-purple-light, rgba(139, 92, 246, 0.08));
}

@media (max-width: 480px) {
  .dash-btn-text {
    display: none;
  }
  .btn-dash-cal {
    padding: 0.3rem;
  }
}

.empty-state {
  padding: 1.75rem 0.5rem; 
  text-align: center; 
  color: var(--text-muted); 
  font-weight: 600; 
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
