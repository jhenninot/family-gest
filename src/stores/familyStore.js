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
  const expenses = ref([])
  const shoppingList = ref([])
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

      const [membersRes, tasksRes, eventsRes, expensesRes, shoppingRes] = await Promise.all([
        fetch('/api/members', { headers }),
        fetch('/api/tasks', { headers }),
        fetch('/api/events', { headers }),
        fetch('/api/expenses', { headers }),
        fetch('/api/shopping', { headers })
      ])

      // Check if session token expired or user is invalid (401)
      if (membersRes.status === 401 || tasksRes.status === 401) {
        console.warn('Session expirée ou utilisateur non trouvé en base. Déconnexion automatique...')
        authStore.logout()
        members.value = []
        tasks.value = []
        events.value = []
        expenses.value = []
        shoppingList.value = []
        return
      }

      if (membersRes.ok) members.value = await membersRes.json()
      if (tasksRes.ok) tasks.value = await tasksRes.json()
      if (eventsRes.ok) events.value = await eventsRes.json()
      if (expensesRes.ok) expenses.value = await expensesRes.json()
      if (shoppingRes.ok) shoppingList.value = await shoppingRes.json()
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

  const totalExpenses = computed(() => {
    return expenses.value.reduce((acc, curr) => acc + curr.amount, 0)
  })

  const expensesByPayer = computed(() => {
    const summary = {}
    members.value.forEach(m => {
      summary[m.id] = { name: m.name, total: 0 }
    })
    expenses.value.forEach(e => {
      if (summary[e.payerId]) {
        summary[e.payerId].total += e.amount
      }
    })
    return summary
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
      }
    } catch (err) {
      console.error('Erreur addEvent API', err)
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

  const addExpense = async (expenseData) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(expenseData)
      })
      if (res.ok) {
        const created = await res.json()
        expenses.value.unshift(created)
      }
    } catch (err) {
      console.error('Erreur addExpense API', err)
    }
  }

  const deleteExpense = async (id) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) {
        expenses.value = expenses.value.filter(e => e.id !== id)
      }
    } catch (err) {
      console.error('Erreur deleteExpense API', err)
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

  return {
    isDarkMode,
    toggleTheme,
    members,
    tasks,
    events,
    expenses,
    shoppingList,
    isLoading,
    completedTasksCount,
    pendingTasksCount,
    taskCompletionPercentage,
    totalExpenses,
    expensesByPayer,
    pendingShoppingCount,
    fetchAllData,
    addMember,
    deleteMember,
    toggleAdminStatus,
    updateMember,
    addTask,
    toggleTask,
    deleteTask,
    addEvent,
    deleteEvent,
    addExpense,
    deleteExpense,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem
  }
})
