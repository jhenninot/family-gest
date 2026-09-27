import { onMounted, onUnmounted, unref } from 'vue'
import { isAnyDragGestureActive } from './usePointerDrag'

/**
 * Balayage horizontal entre les écrans principaux sur mobile (dans l'ordre du menu). La page
 * suit le doigt ; au relâchement, elle sort du côté du geste et l'écran voisin arrive par le
 * côté opposé (transition de route choisie par l'appelant via onNavigate). Un geste trop court
 * ou vers un bord sans écran voisin la ramène en place.
 *
 * Le geste est ignoré quand il commence sur un champ de saisie, une fenêtre modale ou une zone qui
 * défile horizontalement, et pendant un glisser-déposer (plats des repas). Il peut partir d'un lien
 * ou d'un bouton (cartes du tableau de bord) : le clic qui suivrait un glissement est alors annulé.
 *
 * @param {Object} options
 * @param {import('vue').Ref<HTMLElement>} options.target - Zone qui écoute les gestes (contenu principal)
 * @param {Function} options.enabled - () => bool : mobile et écran faisant partie de la navigation
 * @param {Function} options.neighbour - (direction: 1 | -1) => bool : un écran existe de ce côté
 * @param {Function} options.onNavigate - (direction: 1 | -1) => void : aller à l'écran voisin
 */
export function useScreenSwipe ({ target, enabled, neighbour, onNavigate }) {
  const OUT_MS = 160
  const BACK_MS = 220
  const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
  const RESISTANCE = 0.25 // vers un bord sans écran voisin, la page résiste

  let startX = 0
  let startY = 0
  let startTime = 0
  let axis = null
  let page = null
  let animating = false

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const scrollsHorizontally = (el) => {
    for (let node = el; node && node !== unref(target); node = node.parentElement) {
      const { overflowX } = getComputedStyle(node)
      if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1) return true
    }
    return false
  }

  const ignoredStart = (el) => !el?.closest || Boolean(
    el.closest('input, select, textarea, [contenteditable], .modal-overlay, .modal-content, [data-no-screen-swipe]')
  ) || scrollsHorizontally(el)

  const setPage = (transform, opacity, transition = 'none') => {
    if (!page) return
    page.style.transition = transition
    page.style.transform = transform
    page.style.opacity = opacity
  }

  const releasePage = () => {
    if (!page) return
    page.style.transition = ''
    page.style.transform = ''
    page.style.opacity = ''
    page.style.willChange = ''
    page = null
  }

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  const snapBack = async () => {
    if (!page) return
    setPage('translateX(0)', '1', `transform ${BACK_MS}ms ${EASE}, opacity ${BACK_MS}ms ${EASE}`)
    await wait(BACK_MS)
    releasePage()
  }

  const onTouchStart = (e) => {
    startTime = 0
    if (animating || e.touches.length !== 1 || !enabled() || isAnyDragGestureActive()) return
    if (ignoredStart(e.target)) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    startTime = Date.now()
    axis = null
  }

  const onTouchMove = (e) => {
    if (!startTime || e.touches.length !== 1 || axis === 'y') return
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    if (axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      axis = Math.abs(dy) > Math.abs(dx) * 0.75 ? 'y' : 'x'
      if (axis === 'y') return
      if (!reducedMotion()) {
        page = unref(target)?.firstElementChild || null
        if (page) page.style.willChange = 'transform'
      }
    }
    if (isAnyDragGestureActive()) {
      startTime = 0
      snapBack()
      return
    }
    const direction = dx < 0 ? 1 : -1
    const shown = neighbour(direction) ? dx : dx * RESISTANCE
    const width = unref(target)?.clientWidth || window.innerWidth
    setPage(`translateX(${shown}px)`, String(1 - Math.min(Math.abs(shown) / width, 1) * 0.4))
  }

  // Un glissement commencé sur un lien ou une carte ne doit pas aussi l'ouvrir
  const swallowClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
  }
  const blockNextClick = () => {
    document.addEventListener('click', swallowClick, { capture: true, once: true })
    setTimeout(() => document.removeEventListener('click', swallowClick, { capture: true }), 400)
  }

  const onTouchEnd = async (e) => {
    if (startTime && axis === 'x') blockNextClick()
    if (!startTime || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    const duration = Date.now() - startTime
    startTime = 0
    const width = unref(target)?.clientWidth || window.innerWidth
    const direction = dx < 0 ? 1 : -1

    const horizontal = axis === 'x' && Math.abs(dy) <= Math.abs(dx) * 0.75
    const farEnough = (duration <= 700 && Math.abs(dx) >= 50) || Math.abs(dx) >= width * 0.3
    if (!horizontal || !farEnough || isAnyDragGestureActive() || !neighbour(direction)) return snapBack()

    animating = true
    try {
      if (page) {
        setPage(`translateX(${-direction * width}px)`, '0', `transform ${OUT_MS}ms ${EASE}, opacity ${OUT_MS}ms ${EASE}`)
        await wait(OUT_MS)
      }
      onNavigate(direction)
      // La page sortante est remplacée ; ses styles en ligne disparaissent avec elle
      page = null
    } finally {
      animating = false
    }
  }

  const onTouchCancel = () => {
    startTime = 0
    snapBack()
  }

  let attached = null
  onMounted(() => {
    attached = unref(target)
    if (!attached) return
    attached.addEventListener('touchstart', onTouchStart, { passive: true })
    attached.addEventListener('touchmove', onTouchMove, { passive: true })
    attached.addEventListener('touchend', onTouchEnd, { passive: true })
    attached.addEventListener('touchcancel', onTouchCancel, { passive: true })
  })
  onUnmounted(() => {
    if (!attached) return
    attached.removeEventListener('touchstart', onTouchStart)
    attached.removeEventListener('touchmove', onTouchMove)
    attached.removeEventListener('touchend', onTouchEnd)
    attached.removeEventListener('touchcancel', onTouchCancel)
  })
}
