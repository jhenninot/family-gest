import { ref, onUnmounted } from 'vue'

/**
 * Glisser-déposer unifié souris + tactile, bâti sur les Pointer Events.
 *
 * Pourquoi ne pas utiliser l'API HTML5 (draggable / dragover / drop) : elle n'est pas
 * implémentée sur les navigateurs tactiles. Sur une application installable utilisée
 * majoritairement au téléphone, elle ne couvrirait qu'une partie des usages.
 *
 * Distinction geste / défilement :
 *  - à la souris, le glissement démarre dès que le pointeur a bougé de `mouseThreshold` px,
 *    ce qui laisse passer les clics simples ;
 *  - au doigt, il faut un appui maintenu de `touchHoldDelay` ms SANS bouger. Un doigt qui
 *    bouge tout de suite veut faire défiler la page, et le glissement est abandonné.
 *
 * Une fois le glissement engagé au doigt, le défilement natif est neutralisé par un
 * écouteur touchmove non passif : c'est le seul moyen fiable de le bloquer, `touch-action`
 * étant figé au début du geste, avant que l'on sache s'il s'agit d'un glissement.
 *
 * @param {Object} options
 * @param {string}   [options.dropSelector]    - Sélecteur des zones de dépôt (porteuses de data-*)
 * @param {Function} [options.canDrop]         - (payload, data, el) => bool ; cible refusée si faux
 * @param {Function} options.onDrop            - (payload, data, el) => void|Promise, au dépôt validé
 * @param {number}   [options.touchHoldDelay]  - Durée d'appui avant glissement tactile (ms)
 * @param {number}   [options.mouseThreshold]  - Distance avant glissement à la souris (px)
 * @param {number}   [options.edgeSize]        - Bande near-bord déclenchant le défilement auto (px)
 * @param {number}   [options.maxScrollSpeed]  - Vitesse max du défilement auto (px/frame)
 */
export function usePointerDrag ({
  dropSelector = '[data-drop-zone]',
  canDrop = () => true,
  onDrop,
  touchHoldDelay = 250,
  mouseThreshold = 5,
  edgeSize = 72,
  maxScrollSpeed = 18
} = {}) {
  // Charge utile en cours de déplacement (null hors glissement).
  const dragPayload = ref(null)
  // Position courante du pointeur, pour afficher le fantôme qui suit le doigt.
  const pointerPos = ref({ x: 0, y: 0 })
  // Données (dataset) de la zone survolée, pour la mettre en évidence.
  const hoverData = ref(null)
  // Vrai quand la cible survolée refuse le dépôt : permet un retour visuel « interdit ».
  const hoverRejected = ref(false)
  // Type de pointeur du glissement en cours : le fantôme se place au-dessus du doigt, qui
  // masquerait la cible, mais près du curseur à la souris, où rien n'est occulté.
  const dragPointerType = ref('mouse')

  // Horodatage jusqu'auquel les gestes concurrents (swipe de navigation) doivent être ignorés.
  // Un simple booléen ne suffirait pas : pointerup précède touchend, le drapeau serait déjà
  // retombé quand le détecteur de swipe examine le geste.
  const suppressUntil = ref(0)
  const isGestureSuppressed = () => Boolean(dragPayload.value) || Date.now() < suppressUntil.value

  let pending = null // { payload, x, y, pointerType, el }
  let holdTimer = null
  let rafId = null
  let scrollTargets = []
  let didDrag = false

  const clearHoldTimer = () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null }
  }

  const blockTouchScroll = (e) => { e.preventDefault() }

  // Le relâchement d'un glissement produit un clic de synthèse à l'endroit du dépôt. Sans
  // cela, déposer un plat déclencherait le gestionnaire de la zone d'arrivée (ouvrir une
  // fiche, ouvrir le formulaire d'ajout...). On l'intercepte en phase de capture, ce qui
  // couvre d'un coup tous les gestionnaires imbriqués, plutôt que d'ajouter un garde à chacun.
  const swallowNextClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    document.removeEventListener('click', swallowNextClick, true)
  }

  const armClickSwallow = () => {
    document.addEventListener('click', swallowNextClick, true)
    // Si aucun clic ne suit (relâchement hors d'une zone cliquable), l'écouteur ne doit pas
    // rester en embuscade et avaler le prochain vrai clic.
    setTimeout(() => document.removeEventListener('click', swallowNextClick, true), 400)
  }

  // Remonte la chaîne des ancêtres réellement défilables. Selon la largeur d'écran, c'est
  // tantôt .main-content, tantôt la fenêtre : on collecte les deux plutôt que de parier.
  const collectScrollTargets = (el) => {
    const out = []
    let node = el?.parentElement
    while (node && node !== document.body) {
      const style = getComputedStyle(node)
      const scrollable = /(auto|scroll)/.test(style.overflowY)
      if (scrollable && node.scrollHeight > node.clientHeight + 1) out.push(node)
      node = node.parentElement
    }
    out.push(window)
    return out
  }

  const scrollBy = (target, dy) => {
    if (target === window) window.scrollBy(0, dy)
    else target.scrollTop += dy
  }

  const autoScrollStep = () => {
    if (!dragPayload.value) { rafId = null; return }
    const y = pointerPos.value.y
    const h = window.innerHeight
    let dy = 0
    if (y < edgeSize) dy = -Math.ceil(maxScrollSpeed * (1 - y / edgeSize))
    else if (y > h - edgeSize) dy = Math.ceil(maxScrollSpeed * (1 - (h - y) / edgeSize))

    if (dy !== 0) {
      for (const t of scrollTargets) scrollBy(t, dy)
      // Le contenu a bougé sous un pointeur immobile : la cible survolée a pu changer.
      updateHover(pointerPos.value.x, pointerPos.value.y)
    }
    rafId = requestAnimationFrame(autoScrollStep)
  }

  const updateHover = (x, y) => {
    // Le fantôme porte pointer-events:none, il n'intercepte donc jamais ce test.
    const el = document.elementFromPoint(x, y)
    const zone = el?.closest?.(dropSelector) || null
    if (!zone) { hoverData.value = null; hoverRejected.value = false; return }
    const data = { ...zone.dataset }
    if (canDrop(dragPayload.value, data, zone)) {
      hoverData.value = data
      hoverRejected.value = false
    } else {
      hoverData.value = null
      hoverRejected.value = true
    }
  }

  const beginDrag = () => {
    if (!pending) return
    dragPayload.value = pending.payload
    dragPointerType.value = pending.pointerType
    didDrag = true
    document.body.classList.add('is-dragging-item')
    document.addEventListener('touchmove', blockTouchScroll, { passive: false })
    scrollTargets = collectScrollTargets(pending.el)
    if (!rafId) rafId = requestAnimationFrame(autoScrollStep)
    updateHover(pointerPos.value.x, pointerPos.value.y)
  }

  const cancelDrag = () => {
    clearHoldTimer()
    pending = null
    dragPayload.value = null
    hoverData.value = null
    hoverRejected.value = false
    document.body.classList.remove('is-dragging-item')
    document.removeEventListener('touchmove', blockTouchScroll)
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    scrollTargets = []
  }

  const onPointerMove = (e) => {
    pointerPos.value = { x: e.clientX, y: e.clientY }

    if (!dragPayload.value) {
      if (!pending) return
      const dx = Math.abs(e.clientX - pending.x)
      const dy = Math.abs(e.clientY - pending.y)
      if (pending.pointerType === 'mouse') {
        if (dx > mouseThreshold || dy > mouseThreshold) beginDrag()
      } else if (dx > mouseThreshold || dy > mouseThreshold) {
        // Le doigt bouge avant la fin de l'appui maintenu : c'est un défilement, pas un
        // glissement. On abandonne pour ne pas confisquer le geste à l'utilisateur.
        clearHoldTimer()
        pending = null
      }
      return
    }

    updateHover(e.clientX, e.clientY)
  }

  const onPointerUp = async () => {
    const payload = dragPayload.value
    const data = hoverData.value
    const wasDragging = Boolean(payload)
    cancelDrag()
    if (wasDragging) {
      // Le détecteur de swipe examine le geste à touchend, qui arrive après notre pointerup :
      // la fenêtre d'inhibition doit donc survivre quelques centaines de millisecondes.
      suppressUntil.value = Date.now() + 600
      armClickSwallow()
      if (data && typeof onDrop === 'function') await onDrop(payload, data)
    }
    detachWindowListeners()
  }

  const onPointerCancel = () => {
    const wasDragging = Boolean(dragPayload.value)
    cancelDrag()
    if (wasDragging) suppressUntil.value = Date.now() + 600
    detachWindowListeners()
  }

  const attachWindowListeners = () => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  const detachWindowListeners = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
  }

  /**
   * À câbler sur @pointerdown de l'élément déplaçable.
   * @param {PointerEvent} e
   * @param {*} payload - Donnée transmise à canDrop / onDrop
   */
  const startDrag = (e, payload) => {
    // Bouton droit/milieu ignorés ; un geste à plusieurs doigts est un zoom ou un défilement.
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Ne pas confisquer les contrôles interactifs de la carte (boutons d'action).
    if (e.target?.closest?.('button, a, input, select, textarea')) return

    didDrag = false
    pointerPos.value = { x: e.clientX, y: e.clientY }
    pending = { payload, x: e.clientX, y: e.clientY, pointerType: e.pointerType, el: e.currentTarget }
    attachWindowListeners()

    if (e.pointerType !== 'mouse') {
      clearHoldTimer()
      holdTimer = setTimeout(() => {
        holdTimer = null
        if (pending) beginDrag()
      }, touchHoldDelay)
    }
  }

  /**
   * Vrai si le geste qui vient de se terminer était un glissement, pour inhiber le clic de
   * synthèse émis au relâchement. Volontairement basé sur le seul drapeau du geste et non sur
   * la fenêtre d'inhibition temporelle : celle-ci vaut 600 ms et avalerait un vrai clic
   * effectué juste après un dépôt.
   */
  const consumedAsDrag = () => didDrag

  onUnmounted(() => {
    cancelDrag()
    detachWindowListeners()
    document.removeEventListener('click', swallowNextClick, true)
  })

  return {
    dragPayload,
    dragPointerType,
    pointerPos,
    hoverData,
    hoverRejected,
    startDrag,
    consumedAsDrag,
    isGestureSuppressed
  }
}
