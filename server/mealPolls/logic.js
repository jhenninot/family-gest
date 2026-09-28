// Repas à organiser (MealPoll) : règles sans base de données, testables isolément.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ANSWERS = ['yes', 'maybe', 'no']
export const MAX_GUESTS = 40
export const MAX_DATES = 30

const cleanText = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
export const MAX_PER_LINE = 20
const cleanCount = (value) => Math.min(MAX_PER_LINE, Math.max(1, Math.round(Number(value)) || 1))

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
// reçoivent un ; noms vides ou en double ignorés. Chaque ligne a un nombre de personnes (1 à 20).
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
    const count = cleanCount(raw && typeof raw === 'object' ? raw.count : 1)
    result.push(previous ? { ...previous, name, count } : { id: next++, name, count, comment: '', votedAt: null })
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

// Décompte par date en personnes (une ligne « couple » compte 2) ; meilleure date = le plus de
// « oui », puis de « si besoin »
export const guestCount = (guest) => cleanCount(guest?.count)

export const summarize = (poll) => {
  const sizes = new Map(poll.guests.map(g => [g.id, guestCount(g)]))
  const people = (votes, answer) => votes.filter(v => v.answer === answer).reduce((n, v) => n + (sizes.get(v.guestId) || 1), 0)
  const perDate = poll.dates.map(date => {
    const votes = poll.votes.filter(v => v.date === date)
    return { date, yes: people(votes, 'yes'), maybe: people(votes, 'maybe'), no: people(votes, 'no') }
  })
  const best = perDate.reduce((acc, d) => (!acc || d.yes > acc.yes || (d.yes === acc.yes && d.maybe > acc.maybe) ? d : acc), null)
  return {
    perDate,
    bestDate: best && (best.yes > 0 || best.maybe > 0) ? best.date : null,
    answered: poll.guests.filter(g => g.votedAt).length,
    total: poll.guests.length,
    people: poll.guests.reduce((n, g) => n + guestCount(g), 0)
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
  guests: poll.guests.map(g => ({ id: g.id, name: g.name, count: guestCount(g), comment: g.comment, voted: Boolean(g.votedAt) })),
  dates: poll.dates,
  votes: poll.votes.map(v => ({ guestId: v.guestId, date: v.date, answer: v.answer })),
  status: poll.status,
  chosenDate: poll.chosenDate,
  summary: summarize(poll)
})
