import { guestCountOf } from '@shared/presence.js'

// « Les Dupont ×2 » : nom d'un invité de repas, avec son nombre de personnes s'il y en a plusieurs
export const guestLabel = (guest) => (guestCountOf(guest) > 1 ? `${guest.name} ×${guestCountOf(guest)}` : guest.name)
