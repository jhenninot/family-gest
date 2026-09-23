<template>
  <div class="meals-view" ref="mealsViewRef">
    <!-- Week Navigator Bar -->
    <div class="glass-card week-nav-bar margin-bottom-lg">
      <div class="week-nav-controls">
        <button @click="prevWeek" class="btn-nav-arrow" title="Semaine précédente">
          <ChevronLeft :size="20" />
        </button>

        <div class="week-info">
          <div class="week-title-row">
            <Calendar :size="18" class="text-amber" />
            <span class="week-range-text">{{ currentWeekRangeLabel }}</span>
          </div>
          <span v-if="isViewingCurrentWeek" class="badge badge-amber badge-sm">Cette semaine</span>
        </div>

        <button @click="nextWeek" class="btn-nav-arrow" title="Semaine suivante">
          <ChevronRight :size="20" />
        </button>
      </div>

      <div class="week-nav-actions">
        <button 
          v-if="!isViewingCurrentWeek" 
          @click="goToCurrentWeek" 
          class="btn-today-pill"
          title="Revenir à la semaine actuelle"
        >
          Cette semaine
        </button>

        <!-- Date Picker Jump -->
        <label class="date-picker-label" title="Choisir une date pour sauter directement à la semaine">
          <CalendarDays :size="16" />
          <input 
            type="date" 
            :value="currentMondayStr" 
            @change="onDateSelected" 
            class="hidden-date-input"
          />
          <span class="date-picker-text">Aller au...</span>
        </label>

        <!-- Week Stats -->
        <div class="week-stats-pill">
          <ChefHat :size="16" class="text-amber" />
          <span>{{ weekMealsCount }} plat{{ weekMealsCount > 1 ? 's' : '' }} prévu{{ weekMealsCount > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- 7 Days Grid -->
    <div class="week-grid">
      <div 
        v-for="day in weekDays" 
        :key="day.dateStr"
        class="glass-card day-column"
        :class="{ 'is-today': day.isToday, 'is-past': day.isPast }"
      >
        <!-- Day Column Header -->
        <div class="day-col-header">
          <div class="day-col-title-group">
            <span class="day-name">{{ day.name }}</span>
            <span class="day-date">{{ day.dayNum }} {{ day.monthShort }}</span>
          </div>
          <span v-if="day.isPast" class="past-tag">Passé</span>
        </div>

        <!-- SLOTS: Midi & Soir -->
        <div class="day-slots-container">
          <!-- 1. MIDI -->
          <div class="slot-section lunch-slot">
            <div class="slot-header">
              <div class="slot-title">
                <Sun :size="18" class="slot-icon slot-icon-lunch" />
                <span class="slot-label">Midi</span>
                <button 
                  type="button"
                  class="slot-headcount-circle lunch" 
                  :title="`${day.lunchPresence.headcount} personne(s) à table ce midi — voir le détail`"
                  @click="openPresenceModal(day.dateStr, 'lunch')"
                >
                  {{ day.lunchPresence.headcount }}
                </button>
              </div>
              <button 
                v-if="!day.isPast"
                @click="openAddModal(day.dateStr, 'lunch')" 
                class="btn-add-slot-mini" 
                title="Ajouter un plat pour ce midi"
              >
                <Plus :size="14" />
              </button>
            </div>

            <!-- List of Lunch Meals -->
            <!-- Zone de dépôt du glisser-déposer : les data-* sont lues par usePointerDrag
                 via elementFromPoint, il n'y a donc pas d'écouteur à poser sur chaque case. -->
            <div 
              class="slot-meals-list drop-zone"
              :class="{ 'is-drop-target': isDropHovered(day.dateStr, 'lunch') }"
              data-drop-slot="lunch"
              :data-drop-date="day.dateStr"
            >
              <div 
                v-for="m in day.lunchMeals" 
                :key="m.id" 
                class="dish-card"
                :class="{ 'is-drag-source': isDragSource(m), 'is-moving': movingMealId === m.id }"
                @pointerdown="startDrag($event, m)"
                @click="onDishCardClick(m)"
              >
                <div class="dish-card-main">
                  <div class="dish-title-row">
                    <span class="dish-title">{{ m.dish }}</span>
                    <div class="dish-actions" @click.stop>
                      <button @click="openEditModal(m)" class="btn-dish-action" title="Modifier le plat">
                        <Pencil :size="13" />
                      </button>
                      <button @click="handleDeleteMeal(m.id)" class="btn-dish-action delete" title="Supprimer ce plat">
                        <Trash2 :size="13" />
                      </button>
                    </div>
                  </div>

                  <div class="dish-meta">
                    <div class="dish-author" v-if="getMemberInfo(m.suggestedBy)">
                      <UserAvatar 
                        :avatar="getMemberInfo(m.suggestedBy).avatar" 
                        :name="getMemberFirstName(m.suggestedBy)" 
                        size="xs" 
                      />
                      <span class="author-name">{{ getMemberFirstName(m.suggestedBy) }}</span>
                    </div>

                    <div v-if="m.notes" class="dish-note" :title="m.notes">
                      <span class="note-icon">💬</span>
                      <span class="note-text">{{ m.notes }}</span>
                    </div>

                    <!-- Badge Ingrédients / Courses -->
                    <div class="dish-ingredients-row" @click.stop="openDetailModal(m)">
                      <button 
                        class="dish-ingredients-badge" 
                        :class="{ 'has-items': getMealIngredients(m.id).length > 0 }"
                        :title="getMealIngredients(m.id).length > 0 ? 'Voir la liste des ingrédients pour ce plat' : 'Ajouter des ingrédients à la liste de courses'"
                      >
                        <ShoppingCart :size="12" />
                        <span>
                          {{ getMealIngredients(m.id).length > 0 
                            ? `${getMealIngredients(m.id).length} ingrédient${getMealIngredients(m.id).length > 1 ? 's' : ''}` 
                            : '+ Ingrédients' 
                          }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state for lunch -->
              <div 
                v-if="day.lunchMeals.length === 0 && day.isPast" 
                class="slot-empty is-past"
              >
                <span class="empty-text muted">Aucun plat</span>
              </div>
              <div 
                v-else-if="day.lunchMeals.length === 0" 
                class="slot-empty"
                @click="openAddModal(day.dateStr, 'lunch')"
              >
                <span class="empty-icon">+</span>
                <span class="empty-text">Ajouter un plat</span>
              </div>
            </div>
          </div>

          <!-- 2. SOIR -->
          <div class="slot-section dinner-slot">
            <div class="slot-header">
              <div class="slot-title">
                <Sunset :size="18" class="slot-icon slot-icon-dinner" />
                <span class="slot-label">Soir</span>
                <button 
                  type="button"
                  class="slot-headcount-circle dinner" 
                  :title="`${day.dinnerPresence.headcount} personne(s) à table ce soir — voir le détail`"
                  @click="openPresenceModal(day.dateStr, 'dinner')"
                >
                  {{ day.dinnerPresence.headcount }}
                </button>
              </div>
              <button 
                v-if="!day.isPast"
                @click="openAddModal(day.dateStr, 'dinner')" 
                class="btn-add-slot-mini" 
                title="Ajouter un plat pour ce soir"
              >
                <Plus :size="14" />
              </button>
            </div>

            <!-- List of Dinner Meals -->
            <!-- Zone de dépôt du glisser-déposer : les data-* sont lues par usePointerDrag
                 via elementFromPoint, il n'y a donc pas d'écouteur à poser sur chaque case. -->
            <div 
              class="slot-meals-list drop-zone"
              :class="{ 'is-drop-target': isDropHovered(day.dateStr, 'dinner') }"
              data-drop-slot="dinner"
              :data-drop-date="day.dateStr"
            >
              <div 
                v-for="m in day.dinnerMeals" 
                :key="m.id" 
                class="dish-card"
                :class="{ 'is-drag-source': isDragSource(m), 'is-moving': movingMealId === m.id }"
                @pointerdown="startDrag($event, m)"
                @click="onDishCardClick(m)"
              >
                <div class="dish-card-main">
                  <div class="dish-title-row">
                    <span class="dish-title">{{ m.dish }}</span>
                    <div class="dish-actions" @click.stop>
                      <button @click="openEditModal(m)" class="btn-dish-action" title="Modifier le plat">
                        <Pencil :size="13" />
                      </button>
                      <button @click="handleDeleteMeal(m.id)" class="btn-dish-action delete" title="Supprimer ce plat">
                        <Trash2 :size="13" />
                      </button>
                    </div>
                  </div>

                  <div class="dish-meta">
                    <div class="dish-author" v-if="getMemberInfo(m.suggestedBy)">
                      <UserAvatar 
                        :avatar="getMemberInfo(m.suggestedBy).avatar" 
                        :name="getMemberFirstName(m.suggestedBy)" 
                        size="xs" 
                      />
                      <span class="author-name">{{ getMemberFirstName(m.suggestedBy) }}</span>
                    </div>

                    <div v-if="m.notes" class="dish-note" :title="m.notes">
                      <span class="note-icon">💬</span>
                      <span class="note-text">{{ m.notes }}</span>
                    </div>

                    <!-- Badge Ingrédients / Courses -->
                    <div class="dish-ingredients-row" @click.stop="openDetailModal(m)">
                      <button 
                        class="dish-ingredients-badge" 
                        :class="{ 'has-items': getMealIngredients(m.id).length > 0 }"
                        :title="getMealIngredients(m.id).length > 0 ? 'Voir la liste des ingrédients pour ce plat' : 'Ajouter des ingrédients à la liste de courses'"
                      >
                        <ShoppingCart :size="12" />
                        <span>
                          {{ getMealIngredients(m.id).length > 0 
                            ? `${getMealIngredients(m.id).length} ingrédient${getMealIngredients(m.id).length > 1 ? 's' : ''}` 
                            : '+ Ingrédients' 
                          }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state for dinner -->
              <div 
                v-if="day.dinnerMeals.length === 0 && day.isPast" 
                class="slot-empty is-past"
              >
                <span class="empty-text muted">Aucun plat</span>
              </div>
              <div 
                v-else-if="day.dinnerMeals.length === 0" 
                class="slot-empty"
                @click="openAddModal(day.dateStr, 'dinner')"
              >
                <span class="empty-icon">+</span>
                <span class="empty-text">Ajouter un plat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODALE 1 : Détail du Repas & Ingrédients       -->
    <!-- ============================================== -->
    <div v-if="showDetailModal && selectedMeal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-content meal-detail-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <Utensils :size="22" class="text-amber" />
            <h3>{{ selectedMeal.dish }}</h3>
          </div>
          <button @click="closeDetailModal" class="btn-close">&times;</button>
        </div>

        <!-- Message d'invitation après validation si ouvert automatiquement -->
        <div v-if="isPostValidationPrompt" class="prompt-banner">
          <div class="prompt-banner-icon">💡</div>
          <div class="prompt-banner-text">
            <strong>Plat enregistré avec succès !</strong>
            <p>Ajoutez dès maintenant les ingrédients nécessaires à votre liste de courses ci-dessous :</p>
          </div>
        </div>

        <!-- Détails du repas -->
        <div class="detail-overview-card">
          <div class="overview-item">
            <span class="overview-label">Moment :</span>
            <span class="overview-val badge" :class="selectedMeal.slot === 'lunch' ? 'badge-amber' : 'badge-purple'">
              <Sun v-if="selectedMeal.slot === 'lunch'" :size="14" />
              <Sunset v-else :size="14" />
              {{ selectedMeal.slot === 'lunch' ? 'Midi (Déjeuner)' : 'Soir (Dîner)' }}
            </span>
          </div>

          <div class="overview-item">
            <span class="overview-label">Date :</span>
            <span class="overview-val font-semibold">{{ formatDetailDate(selectedMeal.date) }}</span>
          </div>

          <div class="overview-item" v-if="getMemberInfo(selectedMeal.suggestedBy)">
            <span class="overview-label">Suggéré par :</span>
            <div class="overview-author">
              <UserAvatar 
                :avatar="getMemberInfo(selectedMeal.suggestedBy).avatar" 
                :name="getMemberFirstName(selectedMeal.suggestedBy)" 
                size="xs" 
              />
              <span>{{ getMemberFirstName(selectedMeal.suggestedBy) }}</span>
            </div>
          </div>

          <div class="overview-item full-width" v-if="selectedMeal.notes">
            <span class="overview-label">Remarques :</span>
            <span class="overview-val italic-text">{{ selectedMeal.notes }}</span>
          </div>
        </div>

        <!-- SECTION INGRÉDIENTS (LISTE DE COURSES) -->
        <div class="detail-ingredients-section">
          <div class="ingredients-header">
            <div class="ing-header-left">
              <ShoppingCart :size="18" class="text-amber" />
              <h4>Articles & Ingrédients à acheter</h4>
              <span class="badge badge-amber badge-sm">{{ currentMealIngredients.length }}</span>
            </div>
          </div>

          <!-- Liste des ingrédients liés -->
          <div v-if="currentMealIngredients.length > 0" class="ingredients-list">
            <div 
              v-for="item in currentMealIngredients" 
              :key="item.id" 
              class="ingredient-row"
              :class="{ checked: item.checked }"
            >
              <label class="ing-checkbox-wrapper">
                <input 
                  type="checkbox" 
                  :checked="item.checked" 
                  @change="store.toggleShoppingItem(item.id)" 
                  class="custom-checkbox"
                />
                <span class="ing-name" :class="{ 'line-through': item.checked }">{{ item.name }}</span>
              </label>

              <div class="ing-meta">
                <span class="badge badge-cat">{{ item.category || 'Frais' }}</span>
                <span class="ing-qty" v-if="item.quantity && item.quantity > 1">x{{ item.quantity }}</span>

                <button 
                  @click="handleDeleteIngredient(item.id)" 
                  class="btn-delete-ing" 
                  title="Retirer de la liste de courses"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-ingredients-box">
            <span>Aucun ingrédient de courses n'est encore associé à ce plat.</span>
          </div>

          <!-- Formulaire d'ajout rapide d'ingrédient -->
          <form @submit.prevent="handleAddIngredientToMeal" class="add-ingredient-form">
            <div class="ing-input-group">
              <input 
                ref="ingredientInputRef"
                v-model="newIngredient.name" 
                type="text" 
                required 
                placeholder="Ajouter un ingrédient (ex: Crème fraîche, Lardons, Pâtes...)"
                class="form-input ing-name-input"
              />

              <select v-model="newIngredient.category" class="form-select ing-cat-select">
                <option v-for="cat in availableCategories" :key="cat.name" :value="cat.name">
                  {{ cat.icon }} {{ cat.name }}
                </option>
              </select>

              <input 
                v-model.number="newIngredient.quantity" 
                type="number" 
                min="0.5" 
                step="0.5" 
                placeholder="Qté" 
                class="form-input ing-qty-input"
              />

              <button type="submit" class="btn btn-primary btn-add-ing" :disabled="!newIngredient.name.trim()">
                <Plus :size="16" />
                <span>Ajouter</span>
              </button>
            </div>
          </form>
        </div>

        <div class="modal-footer flex-between">
          <div class="footer-left-actions">
            <button type="button" @click="handleEditFromDetail" class="btn btn-secondary">
              <Pencil :size="14" />
              <span>Modifier le plat</span>
            </button>
            <button type="button" @click="handleDeleteFromDetail" class="btn btn-danger-outline">
              <Trash2 :size="14" />
              <span>Supprimer le plat</span>
            </button>
          </div>

          <button type="button" @click="closeDetailModal" class="btn btn-primary">
            Fermer
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODALE 3 : Détail des présences d'un créneau    -->
    <!-- ============================================== -->
    <div v-if="presenceModalSlot && presenceDetail" class="modal-overlay" @click.self="closePresenceModal">
      <div class="modal-content presence-detail-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <Sun v-if="presenceDetail.slot === 'lunch'" :size="22" class="slot-icon-lunch" />
            <Sunset v-else :size="22" class="slot-icon-dinner" />
            <div>
              <h3>{{ presenceDetail.slot === 'lunch' ? 'Midi' : 'Soir' }} · {{ presenceDetail.headcount }} à table</h3>
              <p class="presence-modal-date">{{ formatDetailDate(presenceDetail.date) }}</p>
            </div>
          </div>
          <button @click="closePresenceModal" class="btn-close">&times;</button>
        </div>

        <div class="presence-section">
          <h4 class="presence-section-title present">
            Présents ({{ presenceDetail.presentMembersCount }})
          </h4>
          <ul v-if="presenceDetail.presentMembers.length > 0" class="presence-list">
            <li v-for="m in presenceDetail.presentMembers" :key="'pp-' + m.id" class="presence-row">
              <UserAvatar :avatar="m.avatar" :name="getMemberFirstName(m.id)" size="xs" />
              <span class="presence-name">{{ getMemberFirstName(m.id) }}</span>
              <span v-if="isExceptionalPresence(m.id)" class="presence-tag tag-exceptional">exceptionnel</span>
              <button
                v-if="isPresenceEditable"
                type="button"
                class="btn-presence-toggle to-absent"
                :disabled="presenceBusyKey !== null"
                :title="`Déclarer ${getMemberFirstName(m.id)} absent(e) à ce repas`"
                @click="setMemberPresence(m, false)"
              >
                <UserX :size="13" />
                <span>Absent</span>
              </button>
              <span v-if="m.note" class="presence-note">💬 {{ m.note }}</span>
            </li>
          </ul>
          <p v-else class="presence-empty">Aucun membre de la famille à table.</p>
        </div>

        <div v-if="presenceDetail.guests.length > 0 || isPresenceEditable" class="presence-section">
          <h4 class="presence-section-title guest">
            Invités ({{ presenceDetail.guestsCount }})
          </h4>
          <ul v-if="presenceDetail.guests.length > 0" class="presence-list">
            <li v-for="g in presenceDetail.guests" :key="'pg-' + g.id" class="presence-row">
              <span class="presence-guest-dot">+</span>
              <span class="presence-name">{{ g.name }}</span>
              <button
                v-if="isPresenceEditable"
                type="button"
                class="btn-presence-toggle to-remove"
                :disabled="presenceBusyKey !== null"
                :title="`Retirer ${g.name} de ce repas`"
                @click="removeGuestFromSlot(g)"
              >
                <X :size="13" />
              </button>
            </li>
          </ul>
          <form v-if="isPresenceEditable" class="presence-guest-form" @submit.prevent="addGuestToSlot">
            <input
              v-model="newGuestName"
              type="text"
              class="form-input"
              placeholder="Nom de l'invité"
              maxlength="80"
            />
            <button
              type="submit"
              class="btn btn-secondary"
              :disabled="!newGuestName.trim() || presenceBusyKey !== null"
            >
              <UserPlus :size="14" />
              <span>Inviter</span>
            </button>
          </form>
        </div>

        <div class="presence-section">
          <h4 class="presence-section-title absent">
            Absents ({{ presenceDetail.absentMembersCount }})
          </h4>
          <ul v-if="presenceDetail.absentMembers.length > 0" class="presence-list">
            <li v-for="m in presenceDetail.absentMembers" :key="'pa-' + m.id" class="presence-row">
              <UserAvatar :avatar="m.avatar" :name="getMemberFirstName(m.id)" size="xs" />
              <span class="presence-name">{{ getMemberFirstName(m.id) }}</span>
              <button
                v-if="isPresenceEditable"
                type="button"
                class="btn-presence-toggle to-present"
                :disabled="presenceBusyKey !== null"
                :title="`Déclarer ${getMemberFirstName(m.id)} présent(e) à ce repas`"
                @click="setMemberPresence(m, true)"
              >
                <UserCheck :size="13" />
                <span>Présent</span>
              </button>
              <span v-if="m.note" class="presence-note">💬 {{ m.note }}</span>
            </li>
          </ul>
          <p v-else class="presence-empty">Aucune absence déclarée.</p>
        </div>

        <div v-if="presenceDetail.usuallyAbsentMembers.length > 0" class="presence-section">
          <h4 class="presence-section-title usual">
            Habituellement absents ({{ presenceDetail.usuallyAbsentMembers.length }})
          </h4>
          <ul class="presence-list">
            <li v-for="m in presenceDetail.usuallyAbsentMembers" :key="'pu-' + m.id" class="presence-row">
              <UserAvatar :avatar="m.avatar" :name="getMemberFirstName(m.id)" size="xs" class="muted" />
              <span class="presence-name muted">{{ getMemberFirstName(m.id) }}</span>
              <button
                v-if="isPresenceEditable"
                type="button"
                class="btn-presence-toggle to-present"
                :disabled="presenceBusyKey !== null"
                :title="`Déclarer ${getMemberFirstName(m.id)} présent(e) à ce repas`"
                @click="setMemberPresence(m, true)"
              >
                <UserCheck :size="13" />
                <span>Présent</span>
              </button>
            </li>
          </ul>
        </div>

        <p v-if="presenceError" class="presence-error">{{ presenceError }}</p>

        <div class="modal-footer">
          <button type="button" @click="closePresenceModal" class="btn btn-primary">Fermer</button>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODALE 2 : Ajouter / Modifier un Plat         -->
    <!-- ============================================== -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content meal-modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <Utensils :size="22" class="text-amber" />
            <h3>{{ isEditing ? 'Modifier le plat' : 'Suggérer un plat' }}</h3>
          </div>
          <button @click="closeModal" class="btn-close">&times;</button>
        </div>

        <form @submit.prevent="handleSubmitMeal">
          <!-- Créneau : Midi ou Soir -->
          <div class="form-group">
            <label class="form-label">Moment du repas</label>
            <div class="slot-toggle-group">
              <button 
                type="button" 
                class="slot-toggle-btn"
                :class="{ active: form.slot === 'lunch' }"
                @click="form.slot = 'lunch'"
              >
                <Sun :size="20" class="toggle-icon toggle-icon-lunch" />
                <div class="toggle-text">
                  <span class="toggle-main">Midi</span>
                  <span class="toggle-sub">Déjeuner</span>
                </div>
              </button>

              <button 
                type="button" 
                class="slot-toggle-btn"
                :class="{ active: form.slot === 'dinner' }"
                @click="form.slot = 'dinner'"
              >
                <Sunset :size="20" class="toggle-icon toggle-icon-dinner" />
                <div class="toggle-text">
                  <span class="toggle-main">Soir</span>
                  <span class="toggle-sub">Dîner</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Date du repas -->
          <div class="form-group">
            <label class="form-label">Jour du repas</label>
            <select v-model="form.date" class="form-select" required>
              <option 
                v-for="d in weekDays" 
                :key="d.dateStr" 
                :value="d.dateStr"
                :disabled="!isEditing && d.isPast"
              >
                {{ d.name }} {{ d.dayNum }} {{ d.monthName }} {{ d.isToday ? '(Aujourd\'hui)' : (d.isPast ? '(Passé - non modifiable)' : '') }}
              </option>
            </select>
          </div>

          <!-- Intitulé du plat -->
          <div class="form-group">
            <label class="form-label">
              <span>Plat ou menu</span>
              <span class="label-req">*</span>
            </label>
            <input 
              v-model="form.dish" 
              type="text" 
              required 
              placeholder="ex: Gratin dauphinois, Poulet rôti, Salade composée..."
              class="form-input" 
              autofocus
            />

            <!-- Quick inspiration chips -->
            <div class="inspiration-chips">
              <span class="chips-label">Idées rapides :</span>
              <button 
                v-for="idea in quickIdeas" 
                :key="idea" 
                type="button" 
                class="chip-btn"
                @click="applyIdea(idea)"
              >
                {{ idea }}
              </button>
            </div>
          </div>

          <!-- Ingrédients à ajouter lors de la création -->
          <div v-if="!isEditing" class="form-group">
            <label class="form-label">
              <ShoppingCart :size="15" class="text-amber" />
              <span>Ingrédients à ajouter à la liste de courses (optionnel)</span>
            </label>

            <!-- Liste des ingrédients saisis pour ce plat -->
            <div v-if="modalIngredientsList.length > 0" class="modal-ing-tags">
              <span 
                v-for="(ing, idx) in modalIngredientsList" 
                :key="idx" 
                class="modal-ing-pill"
              >
                <span>{{ ing.name }}</span>
                <button type="button" @click="removeModalIngredient(idx)" class="btn-remove-pill">&times;</button>
              </span>
            </div>

            <!-- Champ de saisie d'un ingrédient -->
            <div class="modal-add-ing-row">
              <input 
                v-model="tempIngredientName" 
                type="text" 
                placeholder="ex: Viande hachée, Oeufs, Fromage..." 
                class="form-input"
                @keydown.enter.prevent="addModalIngredient"
              />
              <button 
                type="button" 
                @click="addModalIngredient" 
                class="btn btn-secondary btn-sm"
                :disabled="!tempIngredientName.trim()"
              >
                + Ajouter
              </button>
            </div>
          </div>

          <!-- Membre qui suggère & Notes -->
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Suggéré par</label>
              <select v-model="form.suggestedBy" class="form-select">
                <option v-for="m in store.members" :key="m.id" :value="m.id">
                  {{ getAvatarTextFallback(m.avatar) }} {{ m.firstName || m.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Notes ou détails (optionnel)</label>
              <input 
                v-model="form.notes" 
                type="text" 
                placeholder="ex: avec salade verte, sans gluten..."
                class="form-input"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn btn-secondary">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? 'Enregistrement...' : (isEditing ? 'Enregistrer les modifications' : 'Valider le plat') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Fantôme suivant le pointeur pendant le glissement.
         Téléporté dans body : une position fixed serait recalée par n'importe quel ancêtre
         transformé. pointer-events:none est indispensable, sinon elementFromPoint ne
         retournerait que le fantôme et aucune zone de dépôt ne serait jamais détectée. -->
    <Teleport to="body">
      <div
        v-if="dragPayload"
        class="drag-ghost"
        :class="{ 'is-rejected': hoverRejected, 'is-touch': dragPointerType !== 'mouse' }"
        :style="{ left: pointerPos.x + 'px', top: pointerPos.y + 'px' }"
      >
        <ChefHat :size="14" />
        <span class="drag-ghost-title">{{ dragPayload.dish }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useFamilyStore } from '../stores/familyStore'
import { useAuthStore } from '../stores/authStore'
import { 
  Utensils, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  CalendarDays, 
  ChefHat, 
  Pencil, 
  Trash2,
  ShoppingCart,
  Sun,
  Sunset,
  UserCheck,
  UserX,
  UserPlus,
  X
} from '@lucide/vue'
import UserAvatar from '../components/UserAvatar.vue'
import { getAvatarTextFallback } from '../utils/avatarHelper'
import { useConfirm } from '../composables/useConfirm'
import { escapeHtml } from '../utils/escapeHtml'
import { useSwipeNavigation } from '../composables/useSwipeNavigation'
import { usePointerDrag } from '../composables/usePointerDrag'
import { SLOT_KEYS } from '@shared/presence.js'

const store = useFamilyStore()
const authStore = useAuthStore()
const { confirm } = useConfirm()

// State pour la navigation hebdomadaire
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateStr(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentMonday = ref(getMonday(new Date()))
const currentMondayStr = computed(() => formatDateStr(currentMonday.value))

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

// Navigation tactile par swipe (gauche = semaine suivante, droite = semaine précédente)
const mealsViewRef = ref(null)
useSwipeNavigation({
  target: mealsViewRef,
  onSwipeLeft: nextWeek,
  onSwipeRight: prevWeek,
  // Sans ce garde, déplacer une carte de quelques dizaines de pixels à l'horizontale
  // changerait aussi de semaine, et le plat partirait dans une semaine qu'on ne voit plus.
  isBlocked: () => isGestureSuppressed()
})

const goToCurrentWeek = () => {
  currentMonday.value = getMonday(new Date())
}

const onDateSelected = (e) => {
  if (e.target.value) {
    const parts = e.target.value.split('-')
    const picked = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    currentMonday.value = getMonday(picked)
  }
}

const isViewingCurrentWeek = computed(() => {
  const thisWeekMonday = getMonday(new Date())
  return formatDateStr(thisWeekMonday) === currentMondayStr.value
})

// Découpage des 7 jours de la semaine (Lundi au Dimanche)
const weekDays = computed(() => {
  const days = []
  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  const fullMonthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

  const base = new Date(currentMonday.value)
  const todayStr = store.todayStr

  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const dateStr = formatDateStr(d)

    const dayMeals = store.meals.filter(m => m.date === dateStr)
    const lunchMeals = dayMeals.filter(m => m.slot === 'lunch')
    const dinnerMeals = dayMeals.filter(m => m.slot === 'dinner')

    const lunchPresence = store.getMealSlotPresence(dateStr, 'lunch')
    const dinnerPresence = store.getMealSlotPresence(dateStr, 'dinner')

    days.push({
      name: dayNames[i],
      dateStr,
      dayNum: d.getDate(),
      monthShort: monthNames[d.getMonth()],
      monthName: fullMonthNames[d.getMonth()],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      lunchMeals,
      dinnerMeals,
      lunchPresence,
      dinnerPresence
    })
  }

  return days
})

// === Glisser-déposer d'un plat d'un créneau vers un autre ===
//
// Le backend acceptait déjà date et slot sur PUT /api/meals/:id : il n'y a donc qu'un geste
// à fournir, pas de nouvelle route. Souris et tactile passent par le même code (Pointer
// Events) ; l'API HTML5 draggable aurait exclu les téléphones, où cette vue est très utilisée.
const {
  dragPayload,
  dragPointerType,
  pointerPos,
  hoverData,
  hoverRejected,
  startDrag,
  consumedAsDrag,
  isGestureSuppressed
} = usePointerDrag({
  dropSelector: '[data-drop-slot]',
  canDrop: (meal, data) => {
    if (!meal) return false
    // Même règle que le formulaire d'ajout : pas de plat déposé dans le passé.
    if (data.dropDate < store.todayStr) return false
    // Reposer un plat sur son propre créneau n'est pas une erreur, mais n'a rien à valider.
    return !(data.dropDate === meal.date && data.dropSlot === meal.slot)
  },
  onDrop: (meal, data) => moveMeal(meal, data.dropDate, data.dropSlot)
})

// Plat en cours d'enregistrement, pour signaler l'attente sur la carte concernée.
const movingMealId = ref(null)

const moveMeal = async (meal, date, slot) => {
  movingMealId.value = meal.id
  const res = await store.updateMeal(meal.id, { date, slot })
  movingMealId.value = null
  if (!res.success) {
    alert(res.error || 'Impossible de déplacer ce plat.')
  }
}

const isDropHovered = (dateStr, slot) =>
  hoverData.value?.dropDate === dateStr && hoverData.value?.dropSlot === slot

const isDragSource = (meal) => Boolean(dragPayload.value) && dragPayload.value.id === meal.id

// Le relâchement d'un glissement produit aussi un clic : sans ce garde, déposer un plat
// ouvrirait sa fiche détail dans la foulée.
const onDishCardClick = (meal) => {
  if (consumedAsDrag()) return
  openDetailModal(meal)
}

const currentWeekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `Semaine du ${first.dayNum} ${first.monthShort} au ${last.dayNum} ${last.monthShort} ${currentMonday.value.getFullYear()}`
})

const weekMealsCount = computed(() => {
  const dates = weekDays.value.map(d => d.dateStr)
  return store.meals.filter(m => dates.includes(m.date)).length
})

// Helper pour récupérer les ingrédients d'un repas
const getMealIngredients = (mealId) => {
  return store.getShoppingItemsForMeal ? store.getShoppingItemsForMeal(mealId) : []
}

// Catégories de courses
const availableCategories = computed(() => {
  if (store.shoppingCategories && store.shoppingCategories.length > 0) {
    return store.shoppingCategories
  }
  return [
    { name: 'Frais', icon: '🥩' },
    { name: 'Fruits & Légumes', icon: '🥦' },
    { name: 'Épicerie', icon: '🍝' },
    { name: 'Surgelés', icon: '❄️' },
    { name: 'Boissons', icon: '🧃' },
    { name: 'Autre', icon: '🛒' }
  ]
})

// Idées rapides d'inspiration
const quickIdeas = [
  '🍝 Pâtes',
  '🍗 Poulet',
  '🥗 Salade',
  '🍕 Pizza',
  '🐟 Poisson',
  '🍲 Soupe',
  '🥧 Quiche',
  '🍔 Burgers'
]

const applyIdea = (idea) => {
  const clean = idea.replace(/^[^\wÀ-ÿ]+/g, '').trim()
  if (!form.value.dish) {
    form.value.dish = clean
  } else {
    form.value.dish = `${form.value.dish} & ${clean}`
  }
}

// ==============================================
// GESTION DE LA MODALE D'AJOUT / ÉDITION DU PLAT
// ==============================================
const showModal = ref(false)
const isEditing = ref(false)
const editingMealId = ref(null)
const isSubmitting = ref(false)

const form = ref({
  date: '',
  slot: 'lunch',
  dish: '',
  suggestedBy: null,
  notes: ''
})

const modalIngredientsList = ref([])
const tempIngredientName = ref('')

const addModalIngredient = () => {
  const trimmed = tempIngredientName.value.trim()
  if (!trimmed) return
  modalIngredientsList.value.push({
    name: trimmed,
    category: 'Frais',
    quantity: 1
  })
  tempIngredientName.value = ''
}

const removeModalIngredient = (idx) => {
  modalIngredientsList.value.splice(idx, 1)
}

const defaultMemberId = computed(() => {
  const authUser = authStore.user
  if (authUser) {
    const found = store.members.find(m => m.id === authUser.id)
    if (found) return found.id
  }
  return store.members[0]?.id || null
})

const openAddModal = (dateStr = null, slot = 'lunch') => {
  if (dateStr && dateStr < store.todayStr) {
    return
  }

  isEditing.value = false
  editingMealId.value = null

  let targetDate = dateStr
  if (!targetDate) {
    const todayStr = store.todayStr
    const isTodayInWeek = weekDays.value.some(d => d.dateStr === todayStr)
    const futureDays = weekDays.value.filter(d => !d.isPast)
    targetDate = isTodayInWeek ? todayStr : (futureDays[0]?.dateStr || todayStr)
  }

  form.value = {
    date: targetDate,
    slot: slot,
    dish: '',
    suggestedBy: defaultMemberId.value,
    notes: ''
  }
  modalIngredientsList.value = []
  tempIngredientName.value = ''
  showModal.value = true
}

const openEditModal = (meal) => {
  isEditing.value = true
  editingMealId.value = meal.id
  form.value = {
    date: meal.date,
    slot: meal.slot,
    dish: meal.dish,
    suggestedBy: meal.suggestedBy || defaultMemberId.value,
    notes: meal.notes || ''
  }
  modalIngredientsList.value = []
  tempIngredientName.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
  editingMealId.value = null
  modalIngredientsList.value = []
}

const handleSubmitMeal = async () => {
  if (!form.value.dish.trim() || !form.value.date) return

  if (!isEditing.value && form.value.date < store.todayStr) {
    alert("Impossible d'ajouter un repas à une date passée.")
    return
  }

  try {
    isSubmitting.value = true
    if (isEditing.value && editingMealId.value) {
      await store.updateMeal(editingMealId.value, {
        date: form.value.date,
        slot: form.value.slot,
        dish: form.value.dish.trim(),
        suggestedBy: form.value.suggestedBy,
        notes: form.value.notes.trim()
      })
      closeModal()
    } else {
      const res = await store.addMeal({
        date: form.value.date,
        slot: form.value.slot,
        dish: form.value.dish.trim(),
        suggestedBy: form.value.suggestedBy,
        notes: form.value.notes.trim(),
        ingredients: modalIngredientsList.value
      })

      closeModal()

      // Si l'utilisateur n'a pas encore ajouté d'ingrédients, lui proposer automatiquement
      // d'en ajouter via la modale de détail !
      if (res && res.success && res.meal) {
        if (modalIngredientsList.value.length === 0) {
          openDetailModal(res.meal, true)
        }
      }
    }
  } catch (err) {
    console.error('Erreur enregistrement repas:', err)
  } finally {
    isSubmitting.value = false
  }
}

const handleDeleteMeal = async (id) => {
  const meal = store.meals.find(m => m.id === id)
  const dishName = meal ? meal.dish : 'ce plat'
  const ok = await confirm({
    title: 'Supprimer le plat',
    message: `Voulez-vous vraiment retirer <strong>« ${escapeHtml(dishName)} »</strong> du menu ?`,
    description: 'Cette action est irréversible.',
    warning: 'Tous les ingrédients associés dans la liste de courses seront également supprimés.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (ok) {
    await store.deleteMeal(id)
  }
}

// ==============================================
// GESTION DE LA MODALE DE DÉTAIL DU PLAT
// ==============================================
const showDetailModal = ref(false)
const selectedMeal = ref(null)
const isPostValidationPrompt = ref(false)
const ingredientInputRef = ref(null)

const newIngredient = ref({
  name: '',
  category: 'Frais',
  quantity: 1
})

const currentMealIngredients = computed(() => {
  if (!selectedMeal.value) return []
  return getMealIngredients(selectedMeal.value.id)
})

const openDetailModal = (meal, isPrompt = false) => {
  selectedMeal.value = meal
  isPostValidationPrompt.value = isPrompt
  newIngredient.value = {
    name: '',
    category: availableCategories.value[0]?.name || 'Frais',
    quantity: 1
  }
  showDetailModal.value = true

  if (isPrompt) {
    nextTick(() => {
      if (ingredientInputRef.value) {
        ingredientInputRef.value.focus()
      }
    })
  }
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedMeal.value = null
  isPostValidationPrompt.value = false
}

const handleAddIngredientToMeal = async () => {
  if (!newIngredient.value.name.trim() || !selectedMeal.value) return

  await store.addShoppingItem({
    name: newIngredient.value.name.trim(),
    category: newIngredient.value.category || 'Frais',
    quantity: Number(newIngredient.value.quantity) || 1,
    urgent: false,
    mealId: selectedMeal.value.id
  })

  newIngredient.value.name = ''
  newIngredient.value.quantity = 1
}

const handleDeleteIngredient = async (itemId) => {
  await store.deleteShoppingItem(itemId)
}

const handleEditFromDetail = () => {
  const meal = selectedMeal.value
  closeDetailModal()
  if (meal) {
    openEditModal(meal)
  }
}

const handleDeleteFromDetail = async () => {
  const meal = selectedMeal.value
  if (!meal) return
  const ok = await confirm({
    title: 'Supprimer le plat',
    message: `Voulez-vous vraiment retirer <strong>« ${escapeHtml(meal.dish)} »</strong> du menu ?`,
    description: 'Cette action est irréversible.',
    warning: 'Tous les ingrédients associés dans la liste de courses seront également supprimés.',
    confirmText: 'Supprimer',
    type: 'danger'
  })
  if (ok) {
    closeDetailModal()
    await store.deleteMeal(meal.id)
  }
}

// === Détail des présences d'un créneau (clic sur la pastille du nombre de couverts) ===
// On ne mémorise que la date et le créneau : la présence est recalculée depuis le store,
// la modale reste donc à jour si une absence ou un invité change pendant qu'elle est ouverte.
const presenceModalSlot = ref(null)

const presenceDetail = computed(() => {
  if (!presenceModalSlot.value) return null
  const { dateStr, slot } = presenceModalSlot.value
  return store.getMealSlotPresence(dateStr, slot)
})

const isExceptionalPresence = (memberId) =>
  Boolean(presenceDetail.value?.exceptionalPresences.some(p => p.id === memberId))

const openPresenceModal = (dateStr, slot) => {
  presenceModalSlot.value = { dateStr, slot }
  newGuestName.value = ''
  presenceError.value = ''
}

const closePresenceModal = () => {
  presenceModalSlot.value = null
}

// Comme dans la vue Absences : on ne déclare rien sur un jour passé.
const isPresenceEditable = computed(() =>
  Boolean(presenceDetail.value) && presenceDetail.value.date >= store.todayStr
)

// Clé de l'action en cours ; tous les boutons sont désactivés tant qu'elle n'est pas terminée,
// sinon deux clics rapprochés enchaîneraient des déclarations calculées sur un état périmé.
const presenceBusyKey = ref(null)
const presenceError = ref('')
const newGuestName = ref('')

const runPresenceAction = async (key, action) => {
  presenceBusyKey.value = key
  presenceError.value = ''
  try {
    await action()
  } catch (err) {
    presenceError.value = err.message || 'Une erreur est survenue, veuillez réessayer.'
  } finally {
    presenceBusyKey.value = null
  }
}

const ensureSuccess = (res) => {
  if (!res.success) throw new Error(res.error || 'Une erreur est survenue, veuillez réessayer.')
}

// Mêmes droits que PUT/DELETE /api/absences/:id côté serveur.
const canEditDeclaration = (rec) => {
  const me = Number(authStore.user?.id)
  return store.isFamilyAdmin ||
    Number(rec.memberId) === me ||
    (rec.declaredBy !== null && rec.declaredBy !== undefined && Number(rec.declaredBy) === me)
}

const isMemberPresentAt = (memberId, dateStr, slot) =>
  store.getMealSlotPresence(dateStr, slot).presentMembers.some(m => m.id === memberId)

const setMemberPresence = (member, present) => runPresenceAction(`member-${member.id}`, async () => {
  const { dateStr, slot } = presenceModalSlot.value
  const targetType = present ? 'presence' : 'absence'
  const memberRecords = () => store.absences.filter(a => Number(a.memberId) === Number(member.id) && a.date === dateStr)

  // 1. On retire ce créneau des déclarations contraires qu'on a le droit de modifier : revenir à
  //    l'habitude du membre efface la déclaration au lieu d'en empiler une inverse.
  const opposing = memberRecords().filter(a => a[slot] && (a.type || 'absence') !== targetType && canEditDeclaration(a))
  for (const rec of opposing) {
    const keepsOtherSlots = SLOT_KEYS.some(s => s !== slot && rec[s])
    ensureSuccess(keepsOtherSlots
      ? await store.updateAbsence(rec.id, { [slot]: false })
      : await store.deleteAbsence(rec.id))
  }

  // 2. Si l'habitude (ou une déclaration qu'on ne peut pas modifier) ne donne toujours pas le bon
  //    résultat, on déclare. La déclaration la plus récente fait foi (cf. pickDeclaredRecord).
  if (isMemberPresentAt(member.id, dateStr, slot) === present) return

  // POST fait un upsert par (membre, date, type) qui remplace les créneaux : on conserve ceux
  // de la déclaration du même type déjà existante.
  const sameType = memberRecords().find(a => (a.type || 'absence') === targetType)
  ensureSuccess(await store.addAbsence({
    memberId: member.id,
    date: dateStr,
    type: targetType,
    lunch: slot === 'lunch' || Boolean(sameType?.lunch),
    dinner: slot === 'dinner' || Boolean(sameType?.dinner),
    night: slot === 'night' || Boolean(sameType?.night),
    note: sameType?.note || ''
  }))
})

const addGuestToSlot = () => {
  const name = newGuestName.value.trim()
  if (!name) return
  return runPresenceAction('guest-add', async () => {
    const { dateStr, slot } = presenceModalSlot.value
    ensureSuccess(await store.addMealGuest({
      name,
      date: dateStr,
      lunch: slot === 'lunch',
      dinner: slot === 'dinner',
      night: false,
      invitedBy: authStore.user?.id
    }))
    newGuestName.value = ''
  })
}

// Un invité peut couvrir plusieurs créneaux (midi + soir) : on ne le retire que de celui-ci.
const removeGuestFromSlot = (guest) => runPresenceAction(`guest-${guest.id}`, async () => {
  const { slot } = presenceModalSlot.value
  const keepsOtherSlots = SLOT_KEYS.some(s => s !== slot && guest[s])
  ensureSuccess(keepsOtherSlots
    ? await store.updateMealGuest(guest.id, { [slot]: false })
    : await store.deleteMealGuest(guest.id))
})

const formatDetailDate = (dateStr) => {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}

const getMemberInfo = (id) => {
  if (!id) return null
  return store.members.find(m => m.id === id) || null
}

const getMemberFirstName = (id) => {
  const member = getMemberInfo(id)
  if (!member) return ''
  if (member.firstName && member.firstName.trim()) {
    return member.firstName.trim()
  }
  if (member.name && member.name.trim()) {
    return member.name.trim().split(/\s+/)[0]
  }
  return ''
}
</script>

<style scoped>
.meals-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.text-amber {
  color: var(--accent-amber);
}

.badge-amber {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
}

.badge-purple {
  background: var(--accent-purple-light);
  color: var(--accent-purple);
}

.badge-sm {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  font-weight: 600;
  border-radius: var(--radius-full);
}

/* Week Navigator Bar */
.week-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.85rem 1.25rem;
  border-radius: var(--radius-lg);
  gap: 1rem;
}

.week-nav-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-nav-arrow {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-nav-arrow:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.week-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.week-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.week-range-text {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.week-nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-today-pill {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-today-pill:hover {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border-color: var(--accent-amber);
}

.date-picker-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.date-picker-label:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.hidden-date-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  cursor: pointer;
}

.week-stats-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 700;
}

/* 7 Days Grid */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.85rem;
  align-items: stretch;
}

.day-column {
  display: flex;
  flex-direction: column;
  padding: 0.85rem 0.75rem;
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
  min-height: 220px;
}

.day-column:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: var(--shadow-md);
}

.day-column.is-today {
  border: 2px solid var(--accent-primary);
  background: var(--bg-card-hover);
  box-shadow: var(--shadow-glow);
}

.day-column.is-past {
  opacity: 0.65;
  background: var(--bg-tertiary);
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.35);
}

.day-column.is-past:hover {
  opacity: 0.88;
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.5);
}

.day-column.is-past .day-name {
  color: var(--text-secondary);
}

.day-col-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 0.5rem;
}

.day-col-title-group {
  display: flex;
  flex-direction: column;
}

.day-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
  text-transform: capitalize;
}

.day-date {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.today-tag {
  background: var(--accent-primary);
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.past-tag {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.12rem 0.45rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Day Presence Bar */
.day-presence-bar {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.presence-slot-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.2rem 0.4rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
}

.presence-slot-pill.lunch {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.presence-slot-pill.dinner {
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}

[data-theme="dark"] .presence-slot-pill.lunch {
  color: #fbbf24;
}

[data-theme="dark"] .presence-slot-pill.dinner {
  color: #a5b4fc;
}

.slot-emoji {
  font-size: 0.8rem;
}

.headcount-val {
  font-size: 0.75rem;
}

/* Slots Container */
.day-slots-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.slot-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.2rem 0.25rem;
}

.slot-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.slot-icon {
  flex-shrink: 0;
}

.slot-icon-lunch { color: #b45309; }
[data-theme="dark"] .slot-icon-lunch { color: #fbbf24; }

.slot-icon-dinner { color: #4338ca; }
[data-theme="dark"] .slot-icon-dinner { color: #a5b4fc; }

.slot-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}

.slot-headcount-circle {
  min-width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  padding: 0 0.3rem;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  user-select: none;
}

button.slot-headcount-circle {
  border: none;
  font-family: inherit;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

button.slot-headcount-circle:hover {
  transform: scale(1.12);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.slot-headcount-circle.lunch {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.slot-headcount-circle.dinner {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.btn-add-slot-mini {
  background: transparent;
  border: 1px dashed var(--border-color);
  color: var(--text-muted);
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-add-slot-mini:hover {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
  transform: scale(1.1);
}

/* Meals List & Dish Card */
.slot-meals-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.dish-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.65rem;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
  position: relative;
  cursor: pointer;
}

.dish-card:hover {
  border-color: var(--accent-amber);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.dish-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.3rem;
  margin-bottom: 0.35rem;
}

.dish-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  word-break: break-word;
}

.dish-actions {
  display: flex;
  gap: 0.2rem;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.dish-card:hover .dish-actions {
  opacity: 1;
}

.btn-dish-action {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-dish-action:hover {
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.btn-dish-action.delete:hover {
  color: var(--accent-rose);
  background: var(--accent-rose-light);
}

.dish-meta {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dish-author {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.author-name {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.dish-note {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-sm);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-icon {
  font-size: 0.7rem;
}

.note-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dish Ingredients Badge */
.dish-ingredients-row {
  margin-top: 0.2rem;
}

.dish-ingredients-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dish-ingredients-badge:hover {
  background: var(--accent-amber-light);
  border-color: var(--accent-amber);
  color: var(--accent-amber);
  transform: translateY(-1px);
}

.dish-ingredients-badge.has-items {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.3);
}

[data-theme="dark"] .dish-ingredients-badge.has-items {
  color: #fbbf24;
}

/* Slot Empty Placeholder */
.slot-empty {
  flex: none;
  min-height: 38px;
  height: 38px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: rgba(0, 0, 0, 0.01);
  padding: 0.4rem 0.6rem;
}

.slot-empty:hover {
  border-color: var(--accent-amber);
  color: var(--accent-amber);
  background: var(--accent-amber-light);
}

.slot-empty.is-past {
  cursor: default;
  border-style: dotted;
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.3);
  color: var(--text-muted);
  background: transparent;
  opacity: 0.7;
  min-height: 34px;
  height: 34px;
}

.slot-empty.is-past:hover {
  border-color: rgba(var(--border-color-rgb, 150, 150, 150), 0.3);
  color: var(--text-muted);
  background: transparent;
}

.empty-icon {
  font-size: 0.9rem;
  font-weight: 700;
}

/* ============================================== */
/* PRESENCE DETAIL MODAL                          */
/* ============================================== */
.presence-detail-modal {
  max-width: 440px;
  width: 94%;
}

.presence-modal-date {
  margin: 0.1rem 0 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: capitalize;
}

.presence-section {
  margin-bottom: 1rem;
}

.presence-section-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.4rem 0;
}

.presence-section-title.present { color: #10b981; }
.presence-section-title.guest { color: #3b82f6; }
.presence-section-title.absent { color: #ef4444; }
.presence-section-title.usual { color: var(--text-muted); }

.presence-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.presence-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.presence-row .muted {
  opacity: 0.6;
}

.btn-presence-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-presence-toggle:disabled {
  opacity: 0.5;
  cursor: wait;
}

.btn-presence-toggle.to-absent:not(:disabled):hover,
.btn-presence-toggle.to-remove:not(:disabled):hover {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.08);
}

.btn-presence-toggle.to-present:not(:disabled):hover {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.08);
}

.presence-guest-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.presence-guest-form .form-input {
  flex: 1;
  min-width: 0;
}

.presence-error {
  margin: 0 0 0.75rem 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 0.82rem;
}

.presence-name {
  font-weight: 600;
  color: var(--text-primary);
}

.presence-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.05rem 0.45rem;
  border-radius: var(--radius-full);
}

.tag-exceptional {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.presence-note {
  flex-basis: 100%;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.presence-guest-dot {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: 800;
  font-size: 0.8rem;
}

.presence-empty {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

/* ============================================== */
/* DETAIL MODAL STYLES                            */
/* ============================================== */
.meal-detail-modal {
  max-width: 600px;
  width: 94%;
}

.prompt-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: var(--accent-amber-light);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.prompt-banner-icon {
  font-size: 1.3rem;
}

.prompt-banner-text strong {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.prompt-banner-text p {
  color: var(--text-secondary);
  font-size: 0.825rem;
  margin: 0.2rem 0 0 0;
}

.detail-overview-card {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
}

.overview-item.full-width {
  width: 100%;
}

.overview-label {
  color: var(--text-muted);
  font-weight: 600;
}

.overview-val {
  color: var(--text-primary);
}

.overview-author {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
}

.italic-text {
  font-style: italic;
}

/* Ingrédients Section */
.detail-ingredients-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.ingredients-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ing-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ing-header-left h4 {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.ingredient-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.ingredient-row:hover {
  border-color: var(--accent-amber);
}

.ingredient-row.checked {
  opacity: 0.65;
  background: var(--bg-tertiary);
}

.ing-checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  flex: 1;
}

.ing-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}

.line-through {
  text-decoration: line-through;
  color: var(--text-muted);
}

.ing-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge-cat {
  font-size: 0.72rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 0.15rem 0.45rem;
}

.ing-qty {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
}

.btn-delete-ing {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-delete-ing:hover {
  color: var(--accent-rose);
  background: var(--accent-rose-light);
}

.empty-ingredients-box {
  padding: 1.25rem;
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--bg-tertiary);
}

/* Add Ingredient Form */
.add-ingredient-form {
  margin-top: 0.4rem;
}

.ing-input-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ing-name-input {
  flex: 2;
  min-width: 180px;
}

.ing-cat-select {
  flex: 1;
  min-width: 120px;
}

.ing-qty-input {
  width: 70px;
}

.btn-add-ing {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.footer-left-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* .btn-danger-outline vient du style global (src/style.css) */

/* Modal Form Styles */
.meal-modal {
  max-width: 540px;
  width: 92%;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.slot-toggle-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.slot-toggle-btn {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.slot-toggle-btn:hover {
  border-color: var(--accent-amber);
}

.slot-toggle-btn.active {
  border-color: var(--accent-amber);
  background: var(--accent-amber-light);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
}

.toggle-icon {
  flex-shrink: 0;
}

.toggle-icon-lunch { color: #b45309; }
[data-theme="dark"] .toggle-icon-lunch { color: #fbbf24; }

.toggle-icon-dinner { color: #4338ca; }
[data-theme="dark"] .toggle-icon-dinner { color: #a5b4fc; }

.toggle-text {
  display: flex;
  flex-direction: column;
}

.toggle-main {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-primary);
}

.toggle-sub {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.label-req {
  color: var(--accent-rose);
  margin-left: 0.2rem;
}

.inspiration-chips {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.chips-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.chip-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chip-btn:hover {
  background: var(--accent-amber-light);
  color: var(--accent-amber);
  border-color: var(--accent-amber);
  transform: translateY(-1px);
}

/* Modal Ingredients Tags */
.modal-ing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.modal-ing-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--accent-amber-light);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--accent-amber);
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 700;
}

.btn-remove-pill {
  background: transparent;
  border: none;
  color: var(--accent-amber);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.btn-remove-pill:hover {
  color: var(--accent-rose);
}

.modal-add-ing-row {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
}

/* Responsive */
/* ===== Glisser-déposer d'un plat vers un autre créneau ===== */

.dish-card {
  /* Empêche la sélection de texte pendant un glissement à la souris. */
  user-select: none;
  -webkit-user-select: none;
}

/* La carte d'origine reste en place, estompée : on garde ainsi le repère du point de départ
   tant que le dépôt n'est pas validé. */
.dish-card.is-drag-source {
  opacity: 0.35;
  border-style: dashed;
}

.dish-card.is-drag-source:hover {
  transform: none;
  box-shadow: var(--shadow-sm);
}

/* Enregistrement en cours côté serveur. */
.dish-card.is-moving {
  opacity: 0.6;
  pointer-events: none;
}

.drop-zone {
  border-radius: var(--radius-md);
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
  /* Une liste vide n'a presque pas de hauteur : sans ce minimum, le créneau serait
     pratiquement impossible à viser au doigt. */
  min-height: 2.25rem;
  /* Marge intérieure permanente, et non ajoutée au survol : la carte du plat recouvre sinon
     toute la zone et il ne reste qu'un filet de couleur pour signaler la cible. L'appliquer
     en permanence évite de décaler la mise en page au moment du glissement. */
  padding: 0.25rem;
  margin: -0.25rem;
}

/* Pendant un glissement, toutes les destinations possibles s'esquissent. */
body.is-dragging-item .drop-zone {
  box-shadow: inset 0 0 0 1px var(--border-color);
}

body.is-dragging-item .drop-zone.is-drop-target {
  background: var(--accent-amber-light);
  box-shadow: inset 0 0 0 2px var(--accent-amber);
}

.drag-ghost {
  position: fixed;
  z-index: 3000;
  /* À la souris, le fantôme colle au curseur : rien ne masque la cible. */
  transform: translate(0.75rem, 0.75rem);
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 220px;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 2px solid var(--accent-amber);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
}

/* Au doigt, il faut le remonter franchement : la main masque la zone de dépôt. */
.drag-ghost.is-touch {
  transform: translate(-50%, -160%);
}

.drag-ghost.is-rejected {
  border-color: var(--accent-rose);
  opacity: 0.75;
}

.drag-ghost-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .week-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .week-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .week-grid {
    grid-template-columns: 1fr;
  }

  .week-nav-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .week-nav-controls {
    justify-content: space-between;
  }

  .week-nav-actions {
    justify-content: flex-end;
  }

  .ing-input-group {
    flex-direction: column;
  }

  .ing-qty-input {
    width: 100%;
  }

  .footer-left-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
