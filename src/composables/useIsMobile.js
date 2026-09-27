import { ref, onMounted, onUnmounted } from 'vue'

// Vrai quand l'écran correspond à la mise en page mobile (une colonne), mis à jour en direct
// (rotation, redimensionnement). Le seuil suit les feuilles de style des vues concernées.
export const MOBILE_QUERY = '(max-width: 768px)'

export function useIsMobile (query = MOBILE_QUERY) {
  const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null
  const isMobile = ref(Boolean(media?.matches))
  const update = () => { isMobile.value = Boolean(media?.matches) }
  onMounted(() => media?.addEventListener('change', update))
  onUnmounted(() => media?.removeEventListener('change', update))
  return isMobile
}
