import { ref, computed, watchEffect } from 'vue'

// Thème de l'application : préférence 'auto' (suit le mode nuit de l'appareil, par défaut),
// 'light' ou 'dark', mémorisée par appareil dans localStorage. L'attribut data-theme reçoit
// toujours le thème effectif ('light'/'dark'). Module importé dès main.js pour que le mode
// automatique suive l'appareil en direct sur toutes les pages, y compris la connexion ;
// index.html applique la même règle avant le chargement du bundle (pas de flash clair).
export const THEME_PREFERENCES = ['auto', 'light', 'dark']
const STORAGE_KEY = 'familygest_theme'

function readStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return THEME_PREFERENCES.includes(stored) ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

export const themePreference = ref(readStoredPreference())

const darkMediaQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null
const systemPrefersDark = ref(!!darkMediaQuery?.matches)
darkMediaQuery?.addEventListener?.('change', (e) => { systemPrefersDark.value = e.matches })

export const isDarkMode = computed(() =>
  themePreference.value === 'dark' || (themePreference.value === 'auto' && systemPrefersDark.value)
)

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
})

export function setThemePreference(preference) {
  if (!THEME_PREFERENCES.includes(preference)) return
  themePreference.value = preference
  try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* stockage indisponible */ }
}
