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
    name: 'email-settings',
    component: () => import('../views/EmailSettingsView.vue'),
    meta: { title: 'Configuration Email', requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'Accueil'} - FamilyGest`
  const authStore = useAuthStore()

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
