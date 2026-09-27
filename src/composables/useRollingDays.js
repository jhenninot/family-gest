import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

/**
 * Liste continue de jours pour le mobile (agenda, repas, présences) : elle commence
 * aujourd'hui, s'allonge d'elle-même quand on approche du bas (sentinelle observée), et peut
 * être prolongée vers le passé (loadPrevious) sans que l'écran saute : la position est
 * compensée de la hauteur ajoutée au-dessus.
 *
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} options.enabled - Liste active (mobile, vue semaine)
 * @param {import('vue').Ref<string>} options.today - Date du jour (YYYY-MM-DD)
 * @param {number} [options.initialDays=14] - Jours affichés au départ
 * @param {number} [options.step=14] - Jours ajoutés à chaque chargement vers le bas
 * @param {number} [options.previousStep=7] - Jours ajoutés vers le passé
 */
export function useRollingDays ({ enabled, today, initialDays = 14, step = 14, previousStep = 7 }) {
  const startOffset = ref(0) // décalage (en jours, ≤ 0) du premier jour par rapport à aujourd'hui
  const count = ref(initialDays)
  const sentinel = ref(null)

  const pad = (n) => String(n).padStart(2, '0')
  const addDays = (dateStr, n) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d + n)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  // Dates affichées (YYYY-MM-DD), dans l'ordre
  const dates = computed(() => Array.from({ length: count.value }, (_, i) => addDays(today.value, startOffset.value + i)))

  const reset = () => {
    startOffset.value = 0
    count.value = initialDays
  }

  const loadMore = () => { count.value += step }

  // Élément qui défile (la page, ou un conteneur avec overflow)
  const scrollParent = (el) => {
    for (let node = el?.parentElement; node && node !== document.body; node = node.parentElement) {
      const { overflowY } = getComputedStyle(node)
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
    }
    return null
  }

  // Jours précédents : le premier jour actuellement affiché reste à la même place à l'écran
  const loadPrevious = async (anchorSelector) => {
    const anchor = anchorSelector ? document.querySelector(anchorSelector) : null
    const before = anchor?.getBoundingClientRect().top ?? null
    startOffset.value -= previousStep
    count.value += previousStep
    await nextTick()
    if (anchor && before !== null && anchor.isConnected) {
      const delta = anchor.getBoundingClientRect().top - before
      const scroller = scrollParent(anchor)
      if (scroller) scroller.scrollTop += delta
      else window.scrollBy(0, delta)
    }
  }

  // Chargement automatique vers le bas, un peu avant d'atteindre la fin
  let observer = null
  const observe = () => {
    observer?.disconnect()
    observer = null
    if (!enabled.value || !sentinel.value || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) loadMore()
    }, { rootMargin: '600px 0px' })
    observer.observe(sentinel.value)
  }
  watch([enabled, sentinel], observe, { flush: 'post' })
  // Après un ajout, la sentinelle peut être encore visible (écran haut) : on relance l'observation
  watch(count, () => nextTick(observe))
  onUnmounted(() => observer?.disconnect())

  // Retour à aujourd'hui : liste réinitialisée puis jour du jour en haut de l'écran
  const scrollToToday = async (todaySelector) => {
    reset()
    await nextTick()
    document.querySelector(todaySelector)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Aller à une date précise (sélecteur de date) : la liste s'étend jusqu'à elle puis elle défile en haut
  const jumpTo = async (dateStr, selectorFor) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const [ty, tm, td] = today.value.split('-').map(Number)
    const offset = Math.round((new Date(y, m - 1, d) - new Date(ty, tm - 1, td)) / 86400000)
    if (offset < startOffset.value) {
      count.value += startOffset.value - offset
      startOffset.value = offset
    }
    if (offset >= startOffset.value + count.value) count.value = offset - startOffset.value + 7
    await nextTick()
    document.querySelector(selectorFor(dateStr))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Changement de jour (après minuit) ou désactivation : on repart d'aujourd'hui
  watch([today, enabled], reset)

  return { dates, sentinel, loadMore, loadPrevious, scrollToToday, jumpTo, reset, addDays }
}
