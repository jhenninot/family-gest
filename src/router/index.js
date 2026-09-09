import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'Connexion', public: true }
  },
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Tableau de bord', requiresAuth: true }
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('../views/TasksView.vue'),
    meta: { title: 'Tâches & Corvées', requiresAuth: true }
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('../views/CalendarView.vue'),
    meta: { title: 'Calendrier Familial', requiresAuth: true }
  },

  {
    path: '/absences',
    name: 'absences',
    component: () => import('../views/AbsencesView.vue'),
    meta: { title: 'Absences & Repas', requiresAuth: true }
  },
  {
    path: '/shopping',
    name: 'shopping',
    component: () => import('../views/ShoppingView.vue'),
    meta: { title: 'Liste de Courses', requiresAuth: true }
  },
  {
    path: '/settings/email',
    name: 'admin-settings',
    alias: '/admin',
    component: () => import('../views/EmailSettingsView.vue'),
    meta: { title: 'Administration', requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/set-password',
    name: 'set-password',
    component: () => import('../views/SetPasswordView.vue'),
    meta: { title: 'Définir mon mot de passe', public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'Accueil'} - FamilyGest`
  const authStore = useAuthStore()

  // Déconnexion obligatoire de toute session active lors de l'arrivée sur la page de définition du mot de passe
  if (to.name === 'set-password' && authStore.isAuthenticated) {
    authStore.logout()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'dashboard' })
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
