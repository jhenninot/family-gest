<template>
  <div class="meals-view" ref="mealsViewRef">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <Utensils :size="28" class="text-amber" />
          <span>Repas de la semaine</span>
        </h1>
        <p class="page-subtitle">Planifiez les menus de la famille et préparez votre liste de courses.</p>
      </div>

      <button @click="openAddModal()" class="btn btn-primary">
        <Plus :size="18" />
        <span>Suggérer un Plat</span>
      </button>
    </div>

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
                <span class="slot-icon">☀️</span>
                <span class="slot-label">Midi</span>
                <span 
                  class="slot-headcount-circle lunch" 
                  :title="`${day.lunchPresence.headcount} personne(s) à table ce midi`"
                >
                  {{ day.lunchPresence.headcount }}
                </span>
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
            <div class="slot-meals-list">
              <div 
                v-for="m in day.lunchMeals" 
                :key="m.id" 
                class="dish-card"
                @click="openDetailModal(m)"
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
                <span class="slot-icon">🌙</span>
                <span class="slot-label">Soir</span>
                <span 
                  class="slot-headcount-circle dinner" 
                  :title="`${day.dinnerPresence.headcount} personne(s) à table ce soir`"
                >
                  {{ day.dinnerPresence.headcount }}
                </span>
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
            <div class="slot-meals-list">
              <div 
                v-for="m in day.dinnerMeals" 
                :key="m.id" 
                class="dish-card"
                @click="openDetailModal(m)"
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
              {{ selectedMeal.slot === 'lunch' ? '☀️ Midi (Déjeuner)' : '🌙 Soir (Dîner)' }}
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
                <span class="toggle-icon">☀️</span>
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
                <span class="toggle-icon">🌙</span>
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
  ShoppingCart 
} from '@lucide/vue'
import UserAvatar from '../components/UserAvatar.vue'
import { getAvatarTextFallback } from '../utils/avatarHelper'
import { useConfirm } from '../composables/useConfirm'
import { useSwipeNavigation } from '../composables/useSwipeNavigation'

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
  onSwipeRight: prevWeek
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
    message: `Voulez-vous vraiment retirer <strong>« ${dishName} »</strong> du menu ?`,
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
    message: `Voulez-vous vraiment retirer <strong>« ${meal.dish} »</strong> du menu ?`,
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
  font-size: 0.9rem;
}

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
  border-radius: var(--radius-sm);
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

.btn-danger-outline {
  background: transparent;
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: var(--accent-rose);
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all var(--transition-fast);
}

.btn-danger-outline:hover {
  background: var(--accent-rose);
  color: white;
}

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
  font-size: 1.5rem;
}

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
