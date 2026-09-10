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
  const members = ref([])
  const tasks = ref([])
  const events = ref([])
  const shoppingList = ref([])
  const shortcuts = ref([])
  const absences = ref([])
  const mealGuests = ref([])
  const isLoading = ref(false)

  const getHeaders = () => {
    const authStore = useAuthStore()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    }
  }

  // Fetch all data from Express + MongoDB API
  const fetchAllData = async () => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) return

    try {
      isLoading.value = true
      const headers = getHeaders()

      const [membersRes, tasksRes, eventsRes, shoppingRes, shortcutsRes, absencesRes, guestsRes] = await Promise.all([
        fetch('/api/members', { headers }),
        fetch('/api/tasks', { headers }),
        fetch('/api/events', { headers }),
        fetch('/api/shopping', { headers }),
        fetch('/api/shortcuts', { headers }),
        fetch('/api/absences', { headers }),
        fetch('/api/meal-guests', { headers })
      ])

      // Check if session token expired or user is invalid (401)
      if (membersRes.status === 401 || tasksRes.status === 401) {
        console.warn('Session expirée ou utilisateur non trouvé en base. Déconnexion automatique...')
        authStore.logout()
        members.value = []
        tasks.value = []
        events.value = []
        shoppingList.value = []
        shortcuts.value = []
        absences.value = []
        mealGuests.value = []
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
      if (shortcutsRes.ok) shortcuts.value = await shortcutsRes.json()
      if (absencesRes.ok) absences.value = await absencesRes.json()
      if (guestsRes && guestsRes.ok) mealGuests.value = await guestsRes.json()
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
        const created = await res.json()
        events.value.push(created)
        return { success: true, event: created }
      } else {
        const err = await res.json().catch(() => ({}))
        return { success: false, error: err.error }
      }
    } catch (err) {
      console.error('Erreur addEvent API', err)
      return { success: false, error: err.message }
    }
  }

  const deleteEvent = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        events.value = events.value.filter(e => e.id !== id)
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

  return {
    isDarkMode,
    toggleTheme,
    members,
    tasks,
    events,
    shoppingList,
    shortcuts,
    absences,
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
    deleteEvent,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    addShortcut,
    updateShortcut,
    deleteShortcut,
    addAbsence,
    updateAbsence,
    deleteAbsence,
    addMealGuest,
    updateMealGuest,
    deleteMealGuest
  }
})
