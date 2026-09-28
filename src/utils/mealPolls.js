// Repas à organiser (sondages de dates) : dates proposées d'un jour, pour l'agenda.
// Seuls les votes en cours comptent ; une fois la date fixée, l'événement créé prend le relais.
export const proposedOn = (polls, dateStr) => (polls || [])
  .filter(p => p.status === 'open' && Array.isArray(p.dates) && p.dates.includes(dateStr))
  .map(p => ({
    id: p.id,
    title: p.title,
    slot: p.slot,
    // Personnes disponibles ce jour-là (« oui »), d'après le décompte du serveur
    yes: p.summary?.perDate?.find(d => d.date === dateStr)?.yes || 0
  }))
