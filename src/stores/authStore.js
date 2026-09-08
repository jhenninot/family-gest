import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('familygest_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('familygest_user') || 'null'))
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value && user.value.isAdmin === true)

  const login = async (email, password) => {
    error.value = ''
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        error.value = data.error || 'Erreur lors de la connexion'
        return false
      }

      token.value = data.token
      user.value = data.user

      localStorage.setItem('familygest_token', data.token)
      localStorage.setItem('familygest_user', JSON.stringify(data.user))

      return true
    } catch (err) {
      error.value = 'Impossible de contacter le serveur d\'authentification'
      return false
    }
  }

  const logout = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('familygest_token')
    localStorage.removeItem('familygest_user')
  }

  return {
    token,
    user,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout
  }
})
