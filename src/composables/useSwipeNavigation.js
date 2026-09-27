import { onMounted, onUnmounted, watch, unref, nextTick } from 'vue'

/**
 * Composable pour détecter les gestes de balayage tactile (swipe) horizontal
 * afin de naviguer entre les semaines ou les mois sur mobile et tablette.
 *
 * Avec `slideSelector`, le contenu de la période (grille, colonnes…) suit le doigt pendant le
 * geste, sort de l'écran du côté du balayage, puis la nouvelle période entre par le côté opposé.
 * Un geste trop court le fait revenir en place. Désactivé si l'utilisateur a demandé à réduire
 * les animations (prefers-reduced-motion).
 *
 * @param {Object} options
 * @param {import('vue').Ref<HTMLElement>|HTMLElement} options.target - Élément cible sur lequel écouter les gestes tactiles
 * @param {Function} [options.onSwipeLeft] - Callback déclenché lors d'un swipe vers la gauche (suivante / avancer dans le temps)
 * @param {Function} [options.onSwipeRight] - Callback déclenché lors d'un swipe vers la droite (précédente / reculer dans le temps)
 * @param {string} [options.slideSelector] - Sélecteur (dans `target`) des éléments à faire glisser
 * @param {number} [options.threshold=50] - Distance minimale en pixels pour déclencher le swipe
 * @param {number} [options.maxVerticalRatio=0.75] - Ratio vertical max autorisé (|deltaY| / |deltaX|) pour ignorer le défilement vertical
 * @param {number} [options.maxDuration=700] - Durée maximale d'un geste vif ; un geste plus lent
 *   compte quand même s'il a parcouru un quart de la largeur (le contenu suit alors le doigt)
 * @param {Function} [options.isBlocked] - Prédicat ; si vrai, le geste est ignoré. Sert à céder
 *   la priorité à un autre geste en cours, typiquement un glisser-déposer d'élément : sans cela,
 *   déplacer une carte de quelques dizaines de pixels changerait aussi de semaine.
 */
export function useSwipeNavigation({
  target,
  onSwipeLeft,
  onSwipeRight,
  slideSelector = null,
  threshold = 50,
  maxVerticalRatio = 0.75,
  maxDuration = 700,
  isBlocked = null
}) {
  const OUT_MS = 160
  const IN_MS = 220
  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0
  let currentElement = null
  // null : direction pas encore connue ; 'x' : balayage suivi ; 'y' : défilement vertical, ignoré
  let axis = null
  let slides = []
  let animating = false

  const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const blocked = () => typeof isBlocked === 'function' && isBlocked()

  const findSlides = () => {
    const root = unref(target)
    if (!slideSelector || !root || reducedMotion()) return []
    return [...root.querySelectorAll(slideSelector)]
  }

  const setStyle = (els, transform, opacity, transition = 'none') => {
    for (const el of els) {
      el.style.transition = transition
      el.style.transform = transform
      el.style.opacity = opacity
    }
  }

  const clearStyle = (els) => {
    for (const el of els) {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      el.style.willChange = ''
    }
  }

  // Pendant le geste, le contenu déplacé ne doit pas élargir la page (barre de défilement horizontale)
  const clip = (on) => {
    const root = unref(target)
    if (root) root.style.overflowX = on ? 'clip' : ''
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const snapBack = async () => {
    const els = slides
    slides = []
    if (els.length === 0) return
    setStyle(els, 'translateX(0)', '1', `transform ${IN_MS}ms ${EASE}, opacity ${IN_MS}ms ${EASE}`)
    await wait(IN_MS)
    clearStyle(els)
    clip(false)
  }

  // Sortie du côté du geste, changement de période, puis entrée par le côté opposé
  const slideTo = async (direction, callback) => {
    const els = slides
    slides = []
    if (els.length === 0) {
      callback()
      return
    }
    animating = true
    try {
      const width = unref(target)?.clientWidth || window.innerWidth
      const sign = direction === 'left' ? -1 : 1
      setStyle(els, `translateX(${sign * width}px)`, '0', `transform ${OUT_MS}ms ${EASE}, opacity ${OUT_MS}ms ${EASE}`)
      await wait(OUT_MS)
      clearStyle(els)
      callback()
      await nextTick()
      // Le contenu a pu être recréé par Vue : on reprend les éléments actuels
      const incoming = findSlides()
      setStyle(incoming, `translateX(${-sign * width * 0.35}px)`, '0')
      incoming.forEach(el => el.getBoundingClientRect()) // applique la position de départ avant la transition
      setStyle(incoming, 'translateX(0)', '1', `transform ${IN_MS}ms ${EASE}, opacity ${IN_MS}ms ${EASE}`)
      await wait(IN_MS)
      clearStyle(incoming)
    } finally {
      clip(false)
      animating = false
    }
  }

  const handleTouchStart = (e) => {
    // Un seul doigt autorisé
    if (e.touches.length !== 1 || animating) return
    if (blocked()) return

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
    axis = null
  }

  // Le contenu suit le doigt dès que le geste est clairement horizontal
  const handleTouchMove = (e) => {
    if (touchStartTime === 0 || e.touches.length !== 1 || axis === 'y') return
    const deltaX = e.touches[0].clientX - touchStartX
    const deltaY = e.touches[0].clientY - touchStartY
    if (axis === null) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return
      axis = Math.abs(deltaY) > Math.abs(deltaX) * maxVerticalRatio ? 'y' : 'x'
      if (axis === 'y') return
      slides = findSlides()
      if (slides.length > 0) {
        clip(true)
        slides.forEach(el => { el.style.willChange = 'transform' })
      }
    }
    if (blocked()) {
      snapBack()
      return
    }
    if (slides.length === 0) return
    const width = unref(target)?.clientWidth || window.innerWidth
    setStyle(slides, `translateX(${deltaX}px)`, String(1 - Math.min(Math.abs(deltaX) / width, 1) * 0.5))
  }

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length !== 1) return
    if (touchStartTime === 0) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const duration = Date.now() - touchStartTime

    // Réinitialiser le temps de début
    touchStartTime = 0

    // Réévalué ici aussi : un glissement peut avoir démarré APRÈS le touchstart (appui
    // maintenu), et pointerup précède touchend, donc le prédicat doit couvrir les deux bords.
    if (blocked()) return snapBack()

    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const width = unref(target)?.clientWidth || window.innerWidth

    // Geste vif, ou geste lent mais ample (le contenu a suivi le doigt)
    const quick = duration <= maxDuration && absX >= threshold
    const long = absX >= Math.max(threshold, width * 0.25)
    // S'assurer que le geste est majoritairement horizontal (protection du scroll vertical)
    if (axis === 'y' || !(quick || long) || absY > absX * maxVerticalRatio) return snapBack()

    if (deltaX < 0 && typeof onSwipeLeft === 'function') {
      // Glissement droite -> gauche (Suivant)
      slideTo('left', onSwipeLeft)
    } else if (deltaX > 0 && typeof onSwipeRight === 'function') {
      // Glissement gauche -> droite (Précédent)
      slideTo('right', onSwipeRight)
    } else {
      snapBack()
    }
  }

  const handleTouchCancel = () => {
    touchStartTime = 0
    snapBack()
  }

  const attachListeners = (el) => {
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    currentElement = el
  }

  const detachListeners = () => {
    if (currentElement) {
      currentElement.removeEventListener('touchstart', handleTouchStart)
      currentElement.removeEventListener('touchmove', handleTouchMove)
      currentElement.removeEventListener('touchend', handleTouchEnd)
      currentElement.removeEventListener('touchcancel', handleTouchCancel)
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
