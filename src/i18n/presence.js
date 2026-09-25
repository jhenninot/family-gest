import { t } from './index.js'
import { describeUsualPresence, describeGrid, DEFAULT_WEEK_ANCHOR } from '@shared/presence.js'

// Libellés traduits des jours et créneaux de la présence habituelle (clés de shared/presence.js)
export const dayLabel = (dayKey) => t(`presence.days.${dayKey}`)
export const dayShortLabel = (dayKey) => t(`presence.daysShort.${dayKey}`)
export const slotLabel = (slotKey) => t(`presence.slots.${slotKey}`)
export const slotInlineLabel = (slotKey) => t(`presence.slotsInline.${slotKey}`)

// Fonction de traduction transmise aux descriptions de shared/presence.js
const presenceTr = (key, params) => {
  if (key.startsWith('day.')) return t(`presence.days.${key.slice(4)}`)
  if (key.startsWith('slot.')) return t(`presence.slotsInline.${key.slice(5)}`)
  return t(`presence.describe.${key}`, params)
}

export const describePresence = (cfg, dateStr = null, anchor = DEFAULT_WEEK_ANCHOR) =>
  describeUsualPresence(cfg, dateStr, anchor || DEFAULT_WEEK_ANCHOR, presenceTr)

export const describePresenceGrid = (grid) => describeGrid(grid, presenceTr)
