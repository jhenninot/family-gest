// Événements de l'agenda, éventuellement sur plusieurs jours (endDate = dernier jour inclus)

export const eventEndDate = (ev) => (ev?.endDate && ev.endDate > ev.date ? ev.endDate : ev?.date)

export const isMultiDayEvent = (ev) => Boolean(ev?.endDate && ev.endDate > ev.date)

// L'événement a lieu ce jour-là (dates au format AAAA-MM-JJ)
export const eventOnDate = (ev, dateStr) => ev.date <= dateStr && dateStr <= eventEndDate(ev)

// L'événement chevauche la période [start, end] (bornes incluses)
export const eventOverlaps = (ev, start, end) => ev.date <= end && eventEndDate(ev) >= start
