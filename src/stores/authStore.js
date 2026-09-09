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

  const updateProfile = async (profileData) => {
    error.value = ''
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify(profileData)
      })

      const data = await res.json()

      if (!res.ok) {
        error.value = data.error || 'Erreur lors de la mise à jour du profil'
        return { success: false, error: data.error }
      }

      user.value = data
      localStorage.setItem('familygest_user', JSON.stringify(data))
      return { success: true, user: data }
    } catch (err) {
      error.value = 'Impossible de contacter le serveur'
      return { success: false, error: err.message }
    }
  }

  const setAuth = (userData, tokenStr) => {
    token.value = tokenStr
    user.value = userData
    localStorage.setItem('familygest_token', tokenStr)
    localStorage.setItem('familygest_user', JSON.stringify(userData))
  }

  const setToken = (newToken) => {
    if (newToken && newToken !== token.value) {
      token.value = newToken
      localStorage.setItem('familygest_token', newToken)
    }
  }

  const refreshSession = async () => {
    if (!token.value) return false
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        token.value = data.token
        user.value = data.user
        localStorage.setItem('familygest_token', data.token)
        localStorage.setItem('familygest_user', JSON.stringify(data.user))
        return true
      } else if (res.status === 401) {
        logout()
        return false
      }
      return !!user.value
    } catch (err) {
      return !!user.value
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
    setAuth,
    setToken,
    refreshSession,
    updateProfile,
    logout
  }
})
