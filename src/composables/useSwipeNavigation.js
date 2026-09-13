import { onMounted, onUnmounted, watch, unref } from 'vue'

/**
 * Composable pour détecter les gestes de balayage tactile (swipe) horizontal
 * afin de naviguer entre les semaines ou les mois sur mobile et tablette.
 *
 * @param {Object} options
 * @param {import('vue').Ref<HTMLElement>|HTMLElement} options.target - Élément cible sur lequel écouter les gestes tactiles
 * @param {Function} [options.onSwipeLeft] - Callback déclenché lors d'un swipe vers la gauche (suivante / avancer dans le temps)
 * @param {Function} [options.onSwipeRight] - Callback déclenché lors d'un swipe vers la droite (précédente / reculer dans le temps)
 * @param {number} [options.threshold=50] - Distance minimale en pixels pour déclencher le swipe
 * @param {number} [options.maxVerticalRatio=0.75] - Ratio vertical max autorisé (|deltaY| / |deltaX|) pour ignorer le défilement vertical
 * @param {number} [options.maxDuration=700] - Durée maximale du geste en ms pour garantir un geste vif et intentionnel
 */
export function useSwipeNavigation({
  target,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  maxVerticalRatio = 0.75,
  maxDuration = 700
}) {
  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0
  let currentElement = null

  const handleTouchStart = (e) => {
    // Un seul doigt autorisé
    if (e.touches.length !== 1) return

    const targetEl = e.target
    if (targetEl && targetEl.closest) {
      // Ignorer si le geste débute sur un élément interactif ou une modale ouverte
      if (
        targetEl.closest('button') ||
        targetEl.closest('input') ||
        targetEl.closest('select') ||
        targetEl.closest('textarea') ||
        targetEl.closest('a') ||
        targetEl.closest('.modal-overlay') ||
        targetEl.closest('.modal-content')
      ) {
        return
      }
    }

    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    touchStartTime = Date.now()
  }

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length !== 1) return
    if (touchStartTime === 0) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const duration = Date.now() - touchStartTime

    // Réinitialiser le temps de début
    touchStartTime = 0

    // Vérifier la durée du geste
    if (duration > maxDuration) return

    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Vérifier le seuil minimal de déplacement horizontal
    if (absX < threshold) return

    // S'assurer que le geste est majoritairement horizontal (protection du scroll vertical)
    if (absY > absX * maxVerticalRatio) return

    if (deltaX < -threshold) {
      // Glissement droite -> gauche (Suivant)
      if (typeof onSwipeLeft === 'function') {
        onSwipeLeft()
      }
    } else if (deltaX > threshold) {
      // Glissement gauche -> droite (Précédent)
      if (typeof onSwipeRight === 'function') {
        onSwipeRight()
      }
    }
  }

  const attachListeners = (el) => {
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    currentElement = el
  }

  const detachListeners = () => {
    if (currentElement) {
      currentElement.removeEventListener('touchstart', handleTouchStart)
      currentElement.removeEventListener('touchend', handleTouchEnd)
      currentElement = null
    }
  }

  onMounted(() => {
    const el = unref(target)
    if (el) {
      attachListeners(el)
    }
  })

  onUnmounted(() => {
    detachListeners()
  })

  // Observer si la référence de l'élément cible change
  watch(() => unref(target), (newEl, oldEl) => {
    if (oldEl) detachListeners()
    if (newEl) attachListeners(newEl)
  })
}
