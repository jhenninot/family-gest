// Repas à organiser (MealPoll) : règles sans base de données, testables isolément.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ANSWERS = ['yes', 'maybe', 'no']
export const MAX_GUESTS = 40
export const MAX_DATES = 30

const cleanText = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// Dates proposées : format AAAA-MM-JJ valide, sans doublon, triées
export const sanitizeDates = (dates) => {
  if (!Array.isArray(dates)) return []
  const valid = dates.map(d => String(d).trim()).filter(d => {
    if (!DATE_RE.test(d)) return false
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, day))
    return date.getUTCMonth() === m - 1 && date.getUTCDate() === day
  })
  return [...new Set(valid)].sort().slice(0, MAX_DATES)
}

// Invités : on garde l'identifiant (et donc les votes) de ceux qui existent déjà, les nouveaux en
// reçoivent un ; noms vides ou en double ignorés
export const mergeGuests = (existing, incoming, now = Date.now()) => {
  if (!Array.isArray(incoming)) return existing || []
  const byId = new Map((existing || []).map(g => [g.id, g]))
  const seen = new Set()
  const result = []
  let next = now
  for (const raw of incoming) {
    const name = cleanText(typeof raw === 'string' ? raw : raw?.name, 60)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    const previous = raw && typeof raw === 'object' && raw.id != null ? byId.get(Number(raw.id)) : null
    result.push(previous ? { ...previous, name } : { id: next++, name, comment: '', votedAt: null })
    if (result.length >= MAX_GUESTS) break
  }
  return result
}

// Votes qui portent encore sur un invité et une date du sondage
export const pruneVotes = (votes, guests, dates) => {
  const guestIds = new Set(guests.map(g => g.id))
  const dateSet = new Set(dates)
  return (votes || []).filter(v => guestIds.has(v.guestId) && dateSet.has(v.date))
}

// Enregistre les réponses d'un invité (remplace les précédentes) ; null si l'invité est inconnu
export const applyGuestVote = (poll, guestId, answers, comment, now = new Date()) => {
  const guest = poll.guests.find(g => g.id === Number(guestId))
  if (!guest) return null
  const dateSet = new Set(poll.dates)
  const mine = Object.entries(answers && typeof answers === 'object' ? answers : {})
    .filter(([date, answer]) => dateSet.has(date) && ANSWERS.includes(answer))
    .map(([date, answer]) => ({ guestId: guest.id, date, answer }))
  const votes = [...poll.votes.filter(v => v.guestId !== guest.id), ...mine]
  const guests = poll.guests.map(g => g.id === guest.id
    ? { ...g, comment: cleanText(comment, 300), votedAt: now }
    : g)
  return { votes, guests }
}

// Décompte par date (oui, si besoin, non) ; meilleure date = le plus de « oui », puis de « si besoin »
export const summarize = (poll) => {
  const perDate = poll.dates.map(date => {
    const votes = poll.votes.filter(v => v.date === date)
    return {
      date,
      yes: votes.filter(v => v.answer === 'yes').length,
      maybe: votes.filter(v => v.answer === 'maybe').length,
      no: votes.filter(v => v.answer === 'no').length
    }
  })
  const best = perDate.reduce((acc, d) => (!acc || d.yes > acc.yes || (d.yes === acc.yes && d.maybe > acc.maybe) ? d : acc), null)
  return {
    perDate,
    bestDate: best && (best.yes > 0 || best.maybe > 0) ? best.date : null,
    answered: poll.guests.filter(g => g.votedAt).length,
    total: poll.guests.length
  }
}

// Invités à inscrire au repas pour la date retenue : ceux qui n'ont pas répondu « non »
export const guestsForDate = (poll, date) => {
  const declined = new Set(poll.votes.filter(v => v.date === date && v.answer === 'no').map(v => v.guestId))
  return poll.guests.filter(g => !declined.has(g.id))
}

// Vue publique : rien d'interne (famille, identifiants de création, etc.)
export const publicView = (poll, familyName) => ({
  title: poll.title,
  slot: poll.slot,
  note: poll.note,
  familyName,
  guests: poll.guests.map(g => ({ id: g.id, name: g.name, comment: g.comment, voted: Boolean(g.votedAt) })),
  dates: poll.dates,
  votes: poll.votes.map(v => ({ guestId: v.guestId, date: v.date, answer: v.answer })),
  status: poll.status,
  chosenDate: poll.chosenDate,
  summary: summarize(poll)
})
