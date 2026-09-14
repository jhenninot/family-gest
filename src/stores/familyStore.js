import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './authStore'

export const useFamilyStore = defineStore('family', () => {
  // Theme state
  const isDarkMode = ref(localStorage.getItem('familygest_theme') === 'dark')
  
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value
    const theme = isDarkMode.value ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('familygest_theme', theme)
  }

  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  // Reactive State
  const currentFamily = ref(null)
  const currentFamilyRole = ref('')
  const currentFamilyIsAdmin = ref(false)
  const currentFamilyQuota = ref({ memberCount: 0, maxMembers: 10 })
  const userFamilies = ref([])

  const members = ref([])
  const tasks = ref([])
  const events = ref([])
  const shoppingList = ref([])
  const shoppingCategories = ref([])
  const shortcuts = ref([])
  const absences = ref([])
  const longAbsences = ref([])
  const mealGuests = ref([])
  const meals = ref([])
  const isLoading = ref(false)

  const isFamilyAdmin = computed(() => {
    const authStore = useAuthStore()
    if (authStore.isSuperAdmin) return true
    return currentFamilyIsAdmin.value === true || currentFamilyRole.value === 'admin'
  })

  const getHeaders = () => {
    const authStore = useAuthStore()
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    }
    const slug = currentFamily.value?.slug || localStorage.getItem('familygest_active_slug')
    if (slug) {
      headers['X-Family-Slug'] = slug
    }
    return headers
  }

  const clearFamilyData = () => {
    members.value = []
    tasks.value = []
    events.value = []
    shoppingList.value = []
    shoppingCategories.value = []
    shortcuts.value = []
    absences.value = []
    longAbsences.value = []
    mealGuests.value = []
    meals.value = []
  }

  // Fetch accessible families for user
  const fetchUserFamilies = async () => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return []
    try {
      const res = await fetch('/api/user/families', { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        userFamilies.value = data
        authStore.families = data
        return data
      }
    } catch (err) {
      console.error('Erreur fetchUserFamilies', err)
    }
    return []
  }

  // Fetch current family info & quota
  const fetchCurrentFamily = async (slug) => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return false

    const targetSlug = slug || currentFamily.value?.slug || localStorage.getItem('familygest_active_slug')
    if (!targetSlug) return false

    try {
      const res = await fetch(`/api/families/${targetSlug}`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'X-Family-Slug': targetSlug
        }
      })
      if (res.ok) {
        const data = await res.json()
        currentFamily.value = data.family
        currentFamilyRole.value = data.role || data.membership?.role || 'Membre'
        currentFamilyIsAdmin.value = Boolean(data.isAdmin ?? data.membership?.isAdmin ?? authStore.isSuperAdmin)
        currentFamilyQuota.value = {
          memberCount: data.memberCount,
          maxMembers: data.maxMembers
        }
        localStorage.setItem('familygest_active_slug', data.family.slug)
        return true
      }
      if (res.status === 403 || res.status === 404) {
        clearFamilyData()
        currentFamily.value = null
        localStorage.removeItem('familygest_active_slug')
        return false
      }
    } catch (err) {
      console.error('Erreur fetchCurrentFamily', err)
    }
    return false
  }

  // Switch active family
  const switchFamily = async (slug) => {
    localStorage.setItem('familygest_active_slug', slug)
    clearFamilyData()
    const ok = await fetchCurrentFamily(slug)
    if (ok) {
      await fetchAllData()
    }
    return ok
  }

  // Check email before sending invitation
  const checkEmailInFamily = async (email) => {
    try {
      const slug = currentFamily.value?.slug || localStorage.getItem('familygest_active_slug')
      const res = await fetch(`/api/families/${slug}/check-email`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email })
      })
      return await res.json()
    } catch (err) {
      return { exists: false, error: err.message }
    }
  }

  // Invite member to current family
  const inviteMember = async (inviteData) => {
    try {
      const slug = currentFamily.value?.slug || localStorage.getItem('familygest_active_slug')
      const res = await fetch(`/api/families/${slug}/invite`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(inviteData)
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh members & quota
        await fetchCurrentFamily(slug)
        const membersRes = await fetch('/api/members', { headers: getHeaders() })
        if (membersRes.ok) members.value = await membersRes.json()
        return { success: true, ...data }
      }
      return { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Fetch all data from Express + MongoDB API
  const fetchAllData = async () => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    try {
      isLoading.value = true
      const headers = getHeaders()

      const [membersRes, tasksRes, eventsRes, shoppingRes, categoriesRes, shortcutsRes, absencesRes, guestsRes, mealsRes, longAbsencesRes] = await Promise.all([
        fetch('/api/members', { headers }),
        fetch('/api/tasks', { headers }),
        fetch('/api/events', { headers }),
        fetch('/api/shopping', { headers }),
        fetch('/api/shopping-categories', { headers }),
        fetch('/api/shortcuts', { headers }),
        fetch('/api/absences', { headers }),
        fetch('/api/meal-guests', { headers }),
        fetch('/api/meals', { headers }),
        fetch('/api/long-absences', { headers })
      ])

      // Check if session token expired or user is invalid (401)
      if (membersRes.status === 401 || tasksRes.status === 401) {
        console.warn('Session expirée ou utilisateur non trouvé en base. Déconnexion automatique...')
        authStore.logout()
        clearFamilyData()
        return
      }

      // Check if access forbidden (family deactivated or user not member) (403)
      if (membersRes.status === 403 || tasksRes.status === 403) {
        console.warn('Accès refusé à cet espace familial (désactivé ou non autorisé). Nettoyage des données...')
        clearFamilyData()
        currentFamily.value = null
        localStorage.removeItem('familygest_active_slug')
        return
      }

      // Prolonger automatiquement la validité à chaque requête API
      const renewedToken = membersRes.headers.get('x-renewed-token')
      if (renewedToken) {
        authStore.setToken(renewedToken)
      }

      if (membersRes.ok) members.value = await membersRes.json()
      if (tasksRes.ok) tasks.value = await tasksRes.json()
      if (eventsRes.ok) events.value = await eventsRes.json()
      if (shoppingRes.ok) shoppingList.value = await shoppingRes.json()
      if (categoriesRes && categoriesRes.ok) shoppingCategories.value = await categoriesRes.json()
      if (shortcutsRes.ok) shortcuts.value = await shortcutsRes.json()
      if (absencesRes.ok) absences.value = await absencesRes.json()
      if (guestsRes && guestsRes.ok) mealGuests.value = await guestsRes.json()
      if (mealsRes && mealsRes.ok) meals.value = await mealsRes.json()
      if (longAbsencesRes && longAbsencesRes.ok) longAbsences.value = await longAbsencesRes.json()
    } catch (err) {
      console.error('Erreur lors du chargement des données API', err)
    } finally {
      isLoading.value = false
    }
  }

  // Getters & Computed Properties
  const completedTasksCount = computed(() => tasks.value.filter(t => t.completed).length)
  const pendingTasksCount = computed(() => tasks.value.filter(t => !t.completed).length)
  const taskCompletionPercentage = computed(() => {
    if (tasks.value.length === 0) return 0
    return Math.round((completedTasksCount.value / tasks.value.length) * 100)
  })

  const todayStr = computed(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const todayAbsences = computed(() => {
    return absences.value.filter(a => a.date === todayStr.value)
  })

  const upcomingAbsences = computed(() => {
    return [...absences.value]
      .filter(a => a.date >= todayStr.value)
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  const todayMealGuests = computed(() => {
    return mealGuests.value.filter(g => g.date === todayStr.value)
  })

  const upcomingMealGuests = computed(() => {
    return [...mealGuests.value]
      .filter(g => g.date >= todayStr.value)
      .sort((a, b) => a.date.localeCompare(b.date))
  })



  const pendingShoppingCount = computed(() => shoppingList.value.filter(item => !item.checked).length)

  // Calcul précis des présences et repas pour n'importe quelle date et créneau ('lunch', 'dinner', 'night')
  const getMealSlotPresence = (dateStr, slot) => {
    const usuallyPresentMembers = members.value.filter(m => m.usualPresence !== 'absent')
    const usuallyAbsentMembers = members.value.filter(m => m.usualPresence === 'absent')

    const dayRecords = absences.value.filter(a => a.date === dateStr && a[slot])
    const absenceRecords = dayRecords.filter(a => a.type !== 'presence')
    const presenceRecords = dayRecords.filter(a => a.type === 'presence')

    const absentMembers = usuallyPresentMembers
      .filter(m => absenceRecords.some(a => Number(a.memberId) === Number(m.id)))
      .map(m => {
        const record = absenceRecords.find(a => Number(a.memberId) === Number(m.id))
        return {
          ...m,
          memberId: m.id,
          absenceId: record?.id,
          note: record?.note || '',
          declaredBy: record?.declaredBy || null,
          record
        }
      })

    const presentUsualMembers = usuallyPresentMembers.filter(m => 
      !absenceRecords.some(a => Number(a.memberId) === Number(m.id))
    )

    const exceptionalPresences = usuallyAbsentMembers
      .filter(m => presenceRecords.some(a => Number(a.memberId) === Number(m.id)))
      .map(m => {
        const record = presenceRecords.find(a => Number(a.memberId) === Number(m.id))
        return {
          ...m,
          memberId: m.id,
          absenceId: record?.id,
          note: record?.note || '',
          declaredBy: record?.declaredBy || null,
          record
        }
      })

    const presentMembers = [...presentUsualMembers, ...exceptionalPresences]
    const dayGuests = mealGuests.value.filter(g => g.date === dateStr && g[slot])

    return {
      date: dateStr,
      slot,
      presentMembers,
      absentMembers,
      exceptionalPresences,
      guests: dayGuests,
      presentMembersCount: presentMembers.length,
      absentMembersCount: absentMembers.length,
      guestsCount: dayGuests.length,
      headcount: presentMembers.length + dayGuests.length
    }
  }

  // Horloge réactive pour recalculer les créneaux repas toutes les minutes
  const currentTime = ref(new Date())
  if (typeof window !== 'undefined') {
    setInterval(() => {
      currentTime.value = new Date()
    }, 60000)
  }

  // Prochain repas : de 00:00 à 14:00 (midi), de 14:00 à 21:00 (dîner), après 21:00 (midi de demain)
  const nextMealInfo = computed(() => {
    const current = currentTime.value
    const hours = current.getHours()

    let targetDate = current
    let slot = 'lunch'
    let label = 'ce midi'
    let isTomorrow = false

    if (hours >= 14 && hours < 21) {
      slot = 'dinner'
      label = 'ce soir'
    } else if (hours >= 21) {
      const tomorrow = new Date(current)
      tomorrow.setDate(tomorrow.getDate() + 1)
      targetDate = tomorrow
      slot = 'lunch'
      label = 'demain midi'
      isTomorrow = true
    } else {
      slot = 'lunch'
      label = 'ce midi'
    }

    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const targetDateStr = `${year}-${month}-${day}`

    const presence = getMealSlotPresence(targetDateStr, slot)
    return {
      date: targetDateStr,
      slot,
      label,
      isTomorrow,
      headcount: presence.headcount,
      presence
    }
  })

  const nextMealHeadcount = computed(() => nextMealInfo.value.headcount)

  // API Actions
  const addMember = async (memberData) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(memberData)
      })
      const data = await res.json()
      if (res.ok) {
        members.value.push(data)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const deleteMember = async (id) => {
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      const data = await res.json()
      if (res.ok) {
        members.value = members.value.filter(m => m.id !== id)
        return { success: true }
      } else {
        alert(data.error || 'Erreur lors de la suppression du membre')
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const toggleAdminStatus = async (id) => {
    try {
      const res = await fetch(`/api/members/${id}/toggle-admin`, {
        method: 'PUT',
        headers: getHeaders()
      })
      const data = await res.json()
      if (res.ok) {
        const index = members.value.findIndex(m => m.id === id)
        if (index !== -1) members.value[index] = data
        return { success: true }
      } else {
        alert(data.error || 'Erreur lors de la modification du statut administrateur')
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const updateMember = async (id, memberData) => {
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(memberData)
      })
      const data = await res.json()
      if (res.ok) {
        const index = members.value.findIndex(m => m.id === id)
        if (index !== -1) members.value[index] = data
        return { success: true, data }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const resendWelcomeEmail = async (id) => {
    try {
      const res = await fetch(`/api/members/${id}/resend-welcome`, {
        method: 'POST',
        headers: getHeaders()
      })
      const data = await res.json()
      if (res.ok) {
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const addTask = async (taskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(taskData)
      })
      if (res.ok) {
        const created = await res.json()
        tasks.value.unshift(created)
      }
    } catch (err) {
      console.error('Erreur addTask API', err)
    }
  }

  const toggleTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}/toggle`, {
        method: 'PUT',
        headers: getHeaders()
      })
      if (res.ok) {
        const updatedTask = await res.json()
        const index = tasks.value.findIndex(t => t.id === id)
        if (index !== -1) tasks.value[index] = updatedTask
        
        // Refresh members to update points
        const membersRes = await fetch('/api/members', { headers: getHeaders() })
        if (membersRes.ok) members.value = await membersRes.json()
      }
    } catch (err) {
      console.error('Erreur toggleTask API', err)
    }
  }

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        tasks.value = tasks.value.filter(t => t.id !== id)
      }
    } catch (err) {
      console.error('Erreur deleteTask API', err)
    }
  }

  const addEvent = async (eventData) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.events)) {
          events.value.push(...data.events)
          if (Array.isArray(data.absences)) absences.value.push(...data.absences)
          return { success: true, events: data.events, truncated: data.truncated }
        }
        events.value.push(data)
        return { success: true, event: data }
      } else {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: err.error }
      }
    } catch (err) {
      console.error('Erreur addEvent API', err)
      return { success: false, error: err.message }
    }
  }

  const updateEvent = async (id, eventData) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(eventData)
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.events)) {
          for (const updated of data.events) {
            const idx = events.value.findIndex(e => e.id === updated.id)
            if (idx !== -1) events.value[idx] = updated
          }
          if (Array.isArray(data.absences)) {
            const recurrenceId = data.events[0]?.recurrenceId
            absences.value = absences.value.filter(a => a.recurrenceId !== recurrenceId)
            absences.value.push(...data.absences)
          }
          return { success: true, events: data.events }
        }
        const index = events.value.findIndex(e => e.id === Number(id))
        if (index !== -1) {
          events.value[index] = data
        }
        return { success: true, event: data }
      } else {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: err.error }
      }
    } catch (err) {
      console.error('Erreur updateEvent API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteEvent = async (id, scope) => {
    try {
      const url = scope === 'series' ? `/api/events/${id}?scope=series` : `/api/events/${id}`
      const target = events.value.find(e => e.id === id)
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        if (scope === 'series' && target?.recurrenceId) {
          const recurrenceId = target.recurrenceId
          events.value = events.value.filter(e => e.recurrenceId !== recurrenceId)
          absences.value = absences.value.filter(a => a.recurrenceId !== recurrenceId)
        } else {
          events.value = events.value.filter(e => e.id !== id)
          absences.value = absences.value.filter(a => a.eventId !== id)
        }
      }
    } catch (err) {
      console.error('Erreur deleteEvent API', err)
    }
  }



  const addShoppingItem = async (itemData) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemData)
      })
      if (res.ok) {
        const created = await res.json()
        shoppingList.value.unshift(created)
      }
    } catch (err) {
      console.error('Erreur addShoppingItem API', err)
    }
  }

  const toggleShoppingItem = async (id) => {
    try {
      const res = await fetch(`/api/shopping/${id}/toggle`, {
        method: 'PUT',
        headers: getHeaders()
      })
      if (res.ok) {
        const updatedItem = await res.json()
        const index = shoppingList.value.findIndex(i => i.id === id)
        if (index !== -1) shoppingList.value[index] = updatedItem
      }
    } catch (err) {
      console.error('Erreur toggleShoppingItem API', err)
    }
  }

  const deleteShoppingItem = async (id) => {
    try {
      const res = await fetch(`/api/shopping/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        shoppingList.value = shoppingList.value.filter(i => i.id !== id)
      }
    } catch (err) {
      console.error('Erreur deleteShoppingItem API', err)
    }
  }

  const updateShoppingItem = async (id, itemData) => {
    try {
      const res = await fetch(`/api/shopping/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(itemData)
      })
      if (res.ok) {
        const updated = await res.json()
        const index = shoppingList.value.findIndex(i => i.id === id)
        if (index !== -1) shoppingList.value[index] = updated
      }
    } catch (err) {
      console.error('Erreur updateShoppingItem API', err)
      const index = shoppingList.value.findIndex(i => i.id === id)
      if (index !== -1) shoppingList.value[index] = { ...shoppingList.value[index], ...itemData }
    }
  }

  // --- SHOPPING CATEGORIES ACTIONS ---
  const fetchShoppingCategories = async () => {
    try {
      const res = await fetch('/api/shopping-categories', { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        shoppingCategories.value = data.sort((a, b) => a.rank - b.rank)
      }
    } catch (err) {
      console.error('Erreur fetchShoppingCategories', err)
    }
  }

  const addShoppingCategory = async (catData) => {
    try {
      const res = await fetch('/api/shopping-categories', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(catData)
      })
      if (res.ok) {
        const created = await res.json()
        shoppingCategories.value.push(created)
        shoppingCategories.value.sort((a, b) => a.rank - b.rank)
        return { success: true, category: created }
      }
    } catch (err) {
      console.error('Erreur addShoppingCategory', err)
    }
    return { success: false }
  }

  const updateShoppingCategory = async (id, catData) => {
    try {
      const res = await fetch(`/api/shopping-categories/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(catData)
      })
      if (res.ok) {
        const updated = await res.json()
        const index = shoppingCategories.value.findIndex(c => c.id === id)
        if (index !== -1) shoppingCategories.value[index] = updated
        shoppingCategories.value.sort((a, b) => a.rank - b.rank)
        return { success: true, category: updated }
      }
    } catch (err) {
      console.error('Erreur updateShoppingCategory', err)
    }
    return { success: false }
  }

  const deleteShoppingCategory = async (id) => {
    try {
      const res = await fetch(`/api/shopping-categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        shoppingCategories.value = shoppingCategories.value.filter(c => c.id !== id)
        return { success: true }
      }
    } catch (err) {
      console.error('Erreur deleteShoppingCategory', err)
    }
    return { success: false }
  }

  const reorderShoppingCategories = async (orderedIds) => {
    // orderedIds : tableau de { id, rank }
    shoppingCategories.value = shoppingCategories.value
      .map(c => {
        const found = orderedIds.find(o => o.id === c.id)
        return found ? { ...c, rank: found.rank } : c
      })
      .sort((a, b) => a.rank - b.rank)
    try {
      await fetch('/api/shopping-categories/reorder', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(orderedIds)
      })
    } catch (err) {
      console.error('Erreur reorderShoppingCategories', err)
    }
  }

  // --- SHORTCUTS ACTIONS ---
  const addShortcut = async (shortcutData) => {
    try {
      const res = await fetch('/api/shortcuts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(shortcutData)
      })
      if (res.ok) {
        const created = await res.json()
        shortcuts.value.push(created)
        return { success: true, shortcut: created }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur addShortcut API', err)
      return { success: false, error: err.message }
    }
  }

  const updateShortcut = async (id, shortcutData) => {
    try {
      const res = await fetch(`/api/shortcuts/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(shortcutData)
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = shortcuts.value.findIndex(s => s.id === id)
        if (idx !== -1) shortcuts.value[idx] = updated
        return { success: true, shortcut: updated }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur updateShortcut API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteShortcut = async (id) => {
    try {
      const res = await fetch(`/api/shortcuts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        shortcuts.value = shortcuts.value.filter(s => s.id !== id)
        return { success: true }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur deleteShortcut API', err)
      return { success: false, error: err.message }
    }
  }

  // --- ABSENCES ACTIONS ---
  const addAbsence = async (absenceData) => {
    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(absenceData)
      })
      if (res.ok) {
        const saved = await res.json()
        const existingIdx = absences.value.findIndex(a => a.id === saved.id || (a.memberId === saved.memberId && a.date === saved.date))
        if (existingIdx !== -1) {
          absences.value[existingIdx] = saved
        } else {
          absences.value.push(saved)
        }
        return { success: true, absence: saved }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur addAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  const updateAbsence = async (id, absenceData) => {
    try {
      const res = await fetch(`/api/absences/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(absenceData)
      })
      if (res.ok) {
        const updated = await res.json()
        if (updated.message && updated.message.includes('supprimée')) {
          absences.value = absences.value.filter(a => a.id !== id)
        } else {
          const idx = absences.value.findIndex(a => a.id === id)
          if (idx !== -1) absences.value[idx] = updated
        }
        return { success: true, absence: updated }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur updateAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteAbsence = async (id) => {
    try {
      const res = await fetch(`/api/absences/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        absences.value = absences.value.filter(a => a.id !== id)
        return { success: true }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur deleteAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  // --- LONG ABSENCES ACTIONS ---
  const addLongAbsence = async (longAbsenceData) => {
    try {
      const res = await fetch('/api/long-absences', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(longAbsenceData)
      })
      if (res.ok) {
        const { longAbsence, absences: createdOrUpdatedAbsences } = await res.json()
        longAbsences.value.push(longAbsence)
        createdOrUpdatedAbsences.forEach(saved => {
          const existingIdx = absences.value.findIndex(a => a.id === saved.id || (a.memberId === saved.memberId && a.date === saved.date))
          if (existingIdx !== -1) {
            absences.value[existingIdx] = saved
          } else {
            absences.value.push(saved)
          }
        })
        return { success: true, longAbsence, count: createdOrUpdatedAbsences.length }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur addLongAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  const updateLongAbsence = async (id, longAbsenceData) => {
    try {
      const res = await fetch(`/api/long-absences/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(longAbsenceData)
      })
      if (res.ok) {
        const { longAbsence, absences: createdOrUpdatedAbsences } = await res.json()
        const idx = longAbsences.value.findIndex(la => la.id === id)
        if (idx !== -1) longAbsences.value[idx] = longAbsence

        // Retirer les anciens créneaux liés à cette absence longue
        absences.value = absences.value.filter(a => a.longAbsenceId !== id)

        // Injecter les nouveaux créneaux
        createdOrUpdatedAbsences.forEach(saved => {
          const existingIdx = absences.value.findIndex(a => a.id === saved.id || (a.memberId === saved.memberId && a.date === saved.date))
          if (existingIdx !== -1) {
            absences.value[existingIdx] = saved
          } else {
            absences.value.push(saved)
          }
        })
        return { success: true, longAbsence, count: createdOrUpdatedAbsences.length }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur updateLongAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteLongAbsence = async (id) => {
    try {
      const res = await fetch(`/api/long-absences/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        longAbsences.value = longAbsences.value.filter(la => la.id !== id)
        absences.value = absences.value.filter(a => a.longAbsenceId !== id)
        return { success: true }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur deleteLongAbsence API', err)
      return { success: false, error: err.message }
    }
  }

  // Meal Guests Actions (Invités aux Repas)
  const addMealGuest = async (guestData) => {
    try {
      const res = await fetch('/api/meal-guests', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(guestData)
      })
      const data = await res.json()
      if (res.ok) {
        if (Array.isArray(data)) {
          mealGuests.value.push(...data)
        } else {
          mealGuests.value.push(data)
        }
        return { success: true, guest: data }
      }
      return { success: false, error: data.error }
    } catch (err) {
      console.error('Erreur addMealGuest API', err)
      return { success: false, error: err.message }
    }
  }

  const updateMealGuest = async (id, guestData) => {
    try {
      const res = await fetch(`/api/meal-guests/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(guestData)
      })
      if (res.ok) {
        const updated = await res.json()
        if (updated.message && updated.message.includes('supprimé')) {
          mealGuests.value = mealGuests.value.filter(g => g.id !== id)
        } else {
          const idx = mealGuests.value.findIndex(g => g.id === id)
          if (idx !== -1) mealGuests.value[idx] = updated
        }
        return { success: true, guest: updated }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur updateMealGuest API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteMealGuest = async (id) => {
    try {
      const res = await fetch(`/api/meal-guests/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        mealGuests.value = mealGuests.value.filter(g => g.id !== id)
        return { success: true }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur deleteMealGuest API', err)
      return { success: false, error: err.message }
    }
  }

  // --- MEALS ACTIONS (Repas de la semaine) ---
  const addMeal = async (mealData) => {
    try {
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(mealData)
      })
      const data = await res.json()
      if (res.ok) {
        meals.value.push(data)
        if (Array.isArray(data.createdIngredients) && data.createdIngredients.length > 0) {
          shoppingList.value.unshift(...data.createdIngredients)
        }
        return { success: true, meal: data }
      }
      return { success: false, error: data.error }
    } catch (err) {
      console.error('Erreur addMeal API', err)
      return { success: false, error: err.message }
    }
  }

  const updateMeal = async (id, mealData) => {
    try {
      const res = await fetch(`/api/meals/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(mealData)
      })
      if (res.ok) {
        const updated = await res.json()
        const idx = meals.value.findIndex(m => m.id === id)
        if (idx !== -1) meals.value[idx] = updated
        return { success: true, meal: updated }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur updateMeal API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteMeal = async (id) => {
    try {
      const res = await fetch(`/api/meals/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        meals.value = meals.value.filter(m => m.id !== id)
        // Suppression en cascade des ingrédients associés dans la liste de courses
        shoppingList.value = shoppingList.value.filter(item => item.mealId !== id)
        return { success: true }
      }
      const err = await res.json()
      return { success: false, error: err.error }
    } catch (err) {
      console.error('Erreur deleteMeal API', err)
      return { success: false, error: err.message }
    }
  }

  const getMealsForDate = (dateStr) => {
    const dayMeals = meals.value.filter(m => m.date === dateStr)
    return {
      lunch: dayMeals.filter(m => m.slot === 'lunch'),
      dinner: dayMeals.filter(m => m.slot === 'dinner')
    }
  }

  const getShoppingItemsForMeal = (mealId) => {
    if (!mealId) return []
    return shoppingList.value.filter(item => item.mealId === Number(mealId))
  }

  return {
    isDarkMode,
    toggleTheme,
    currentFamily,
    currentFamilyRole,
    currentFamilyIsAdmin,
    currentFamilyQuota,
    userFamilies,
    isFamilyAdmin,
    fetchUserFamilies,
    fetchCurrentFamily,
    switchFamily,
    checkEmailInFamily,
    inviteMember,
    members,
    tasks,
    events,
    shoppingList,
    shoppingCategories,
    shortcuts,
    absences,
    longAbsences,
    mealGuests,
    todayStr,
    todayAbsences,
    upcomingAbsences,
    todayMealGuests,
    upcomingMealGuests,
    isLoading,
    completedTasksCount,
    pendingTasksCount,
    taskCompletionPercentage,
    pendingShoppingCount,
    getMealSlotPresence,
    nextMealInfo,
    nextMealHeadcount,
    fetchAllData,
    addMember,
    deleteMember,
    toggleAdminStatus,
    updateMember,
    resendWelcomeEmail,
    addTask,
    toggleTask,
    deleteTask,
    addEvent,
    updateEvent,
    deleteEvent,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    updateShoppingItem,
    addShoppingCategory,
    updateShoppingCategory,
    deleteShoppingCategory,
    reorderShoppingCategories,
    fetchShoppingCategories,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    addAbsence,
    updateAbsence,
    deleteAbsence,
    addLongAbsence,
    updateLongAbsence,
    deleteLongAbsence,
    addMealGuest,
    updateMealGuest,
    deleteMealGuest,
    meals,
    addMeal,
    updateMeal,
    deleteMeal,
    getMealsForDate,
    getShoppingItemsForMeal
  }
})
