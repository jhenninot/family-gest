import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
  // Public routes
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { titleKey: 'routes.login', public: true }
  },
  {
    path: '/set-password',
    name: 'set-password',
    component: () => import('../views/SetPasswordView.vue'),
    meta: { titleKey: 'routes.setPassword', public: true }
  },
  {
    path: '/invitation/:token',
    name: 'invitation',
    component: () => import('../views/InvitationView.vue'),
    meta: { titleKey: 'routes.invitation', public: true }
  },
  {
    path: '/mentions-legales',
    name: 'legal-notice',
    component: () => import('../views/LegalDocView.vue'),
    meta: { titleKey: 'legal.notice', public: true, field: 'legalNotice' }
  },
  {
    path: '/confidentialite',
    name: 'privacy-policy',
    component: () => import('../views/LegalDocView.vue'),
    meta: { titleKey: 'legal.privacy', public: true, field: 'privacyPolicy' }
  },

  // Special workspace selection & Super Admin
  {
    path: '/select-family',
    name: 'select-family',
    component: () => import('../views/SelectFamilyView.vue'),
    meta: { titleKey: 'routes.selectFamily', requiresAuth: true }
  },
  {
    path: '/super-admin',
    name: 'super-admin',
    component: () => import('../views/SuperAdminView.vue'),
    meta: { titleKey: 'routes.superAdmin', requiresAuth: true, requiresSuperAdmin: true }
  },

  // Family scoped routes
  {
    path: '/:familySlug',
    name: 'family-dashboard',
    component: DashboardView,
    meta: { titleKey: 'routes.dashboard', requiresAuth: true }
  },
  {
    path: '/:familySlug/dashboard',
    name: 'family-dashboard-explicit',
    component: DashboardView,
    meta: { titleKey: 'routes.dashboard', requiresAuth: true }
  },
  {
    path: '/:familySlug/tasks',
    name: 'family-tasks',
    component: () => import('../views/TasksView.vue'),
    meta: { titleKey: 'routes.tasks', requiresAuth: true }
  },
  {
    path: '/:familySlug/calendar',
    name: 'family-calendar',
    component: () => import('../views/CalendarView.vue'),
    meta: { titleKey: 'routes.calendar', requiresAuth: true }
  },
  {
    path: '/:familySlug/absences',
    name: 'family-absences',
    component: () => import('../views/AbsencesView.vue'),
    meta: { titleKey: 'routes.absences', requiresAuth: true }
  },
  {
    path: '/:familySlug/meals',
    name: 'family-meals',
    component: () => import('../views/MealsView.vue'),
    meta: { titleKey: 'routes.meals', requiresAuth: true }
  },
  {
    path: '/:familySlug/shopping',
    name: 'family-shopping',
    component: () => import('../views/ShoppingView.vue'),
    meta: { titleKey: 'routes.shopping', requiresAuth: true }
  },
  {
    path: '/:familySlug/settings/email',
    name: 'family-settings',
    alias: ['/:familySlug/settings', '/:familySlug/admin'],
    component: () => import('../views/FamilySettingsView.vue'),
    meta: { titleKey: 'routes.familySettings', requiresAuth: true, requiresAdmin: true }
  },

  // Root and legacy shortcuts (redirected via beforeEach)
  {
    path: '/',
    name: 'root',
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks',
    meta: { requiresAuth: true }
  },
  {
    path: '/calendar',
    meta: { requiresAuth: true }
  },
  {
    path: '/absences',
    meta: { requiresAuth: true }
  },
  {
    path: '/shopping',
    meta: { requiresAuth: true }
  },
  {
    path: '/meals',
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/email',
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // Catch-all 404 fallback (prevents infinite redirect loops)
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: () => {
      const activeSlug = localStorage.getItem('familygest_active_slug')
      return activeSlug ? `/${activeSlug}` : '/select-family'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Retour de l'autorisation Amazon (skill Alexa) arrivé dans l'application au lieu du serveur :
// URL publique de la plateforme contenant un chemin ou un « # », ou service worker d'une ancienne
// version. Il est reconnaissable à son code d'autorisation et à sa portée « alexa::ask » : on le
// transmet au serveur, une seule fois par autorisation (pas de boucle si la page revient ici).
const ALEXA_OAUTH_CALLBACK = '/api/alexa-oauth/callback'
const forwardAlexaOauthReturn = (to) => {
  const { code, state, scope, error } = to.query
  const looksLikeAmazonReturn = to.path.endsWith(ALEXA_OAUTH_CALLBACK) ||
    (state && (code || error) && String(scope || '').includes('alexa::ask'))
  if (!looksLikeAmazonReturn || !state) return false
  const guardKey = `familygest_alexa_oauth_${state}`
  try {
    if (sessionStorage.getItem(guardKey)) return false
    sessionStorage.setItem(guardKey, '1')
  } catch { /* stockage indisponible : on tente quand même */ }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(to.query)) if (value != null) params.set(key, String(value))
  window.location.replace(`${ALEXA_OAUTH_CALLBACK}?${params}`)
  return true
}

router.beforeEach(async (to, from, next) => {
  if (forwardAlexaOauthReturn(to)) return next(false)
  document.title = `${to.meta.title || 'Accueil'} - FamilyGest`
  const authStore = useAuthStore()
  const familyStore = useFamilyStore()

  // Déconnexion obligatoire de toute session active lors de l'arrivée sur la page de définition du mot de passe
  if (to.name === 'set-password' && authStore.isAuthenticated) {
    authStore.logout()
  }

  // Public route access
  if (to.meta.public) {
    if (to.name === 'login' && authStore.isAuthenticated) {
      const activeSlug = localStorage.getItem('familygest_active_slug') || authStore.families[0]?.slug
      if (activeSlug) return next({ path: `/${activeSlug}` })
      return next({ name: 'select-family' })
    }
    return next()
  }

  // Authentication check
  if (!authStore.isAuthenticated) {
    return next({ name: 'login' })
  }

  // Super Admin route check
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return next({ path: '/' })
  }

  // If URL has :familySlug
  if (to.params.familySlug) {
    const targetSlug = to.params.familySlug

    // Load user families if not already loaded
    let userFamilies = familyStore.userFamilies
    if (!userFamilies || userFamilies.length === 0) {
      userFamilies = await familyStore.fetchUserFamilies()
    }

    const hasAccess = authStore.isSuperAdmin || (userFamilies && userFamilies.some(f => f.slug === targetSlug))

    if (!hasAccess) {
      return next({ name: 'select-family' })
    }

    if (familyStore.currentFamily?.slug !== targetSlug) {
      const ok = await familyStore.fetchCurrentFamily(targetSlug)
      if (!ok && !authStore.isSuperAdmin) {
        return next({ name: 'select-family' })
      }
      await familyStore.fetchAllData()
    }

    // Check family admin permissions if required
    if (to.meta.requiresAdmin && !familyStore.isFamilyAdmin) {
      return next({ path: `/${targetSlug}` })
    }

    return next()
  }

  // Special routes without familySlug
  if (to.name === 'select-family' || to.name === 'super-admin') {
    return next()
  }

  // Redirect known legacy / un-prefixed URLs (/, /tasks, etc.) to active family
  const legacyMap = {
    '/': '',
    '/tasks': '/tasks',
    '/calendar': '/calendar',
    '/absences': '/absences',
    '/meals': '/meals',
    '/shopping': '/shopping',
    '/settings/email': '/settings/email',
    '/settings': '/settings/email',
    '/admin': '/settings/email'
  }

  if (legacyMap[to.path] !== undefined) {
    let userFamilies = familyStore.userFamilies
    if (!userFamilies || userFamilies.length === 0) {
      userFamilies = await familyStore.fetchUserFamilies()
    }

    let activeSlug = localStorage.getItem('familygest_active_slug')

    // Pour les non-superadmin, valider que activeSlug est réellement une famille active accessible
    if (!authStore.isSuperAdmin) {
      const isValidActive = activeSlug && userFamilies && userFamilies.some(f => f.slug === activeSlug)
      if (!isValidActive) {
        if (userFamilies && userFamilies.length > 0) {
          activeSlug = userFamilies[0].slug
          localStorage.setItem('familygest_active_slug', activeSlug)
        } else {
          // L'utilisateur n'a aucune famille active accessible
          localStorage.removeItem('familygest_active_slug')
          familyStore.clearFamilyData()
          familyStore.currentFamily = null
          return next({ name: 'select-family' })
        }
      }
    }

    if (activeSlug) {
      return next({ path: `/${activeSlug}${legacyMap[to.path]}` })
    }

    if (authStore.isSuperAdmin) {
      return next({ name: 'super-admin' })
    }

    return next({ name: 'select-family' })
  }

  return next()
})

export default router
