// Utilitaires d'exportation d'événements vers des agendas externes (Google Agenda, Apple Calendar, Outlook)

/**
 * Formate une date (YYYY-MM-DD) et une heure (HH:mm) en date ISO compacte pour Google Calendar et iCalendar
 */
function parseEventDates(dateStr, timeStr) {
  if (!dateStr) return { start: '', end: '', isAllDay: true }

  const [year, month, day] = dateStr.split('-').map(Number)

  if (timeStr && timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const startDate = new Date(year, month - 1, day, hours, minutes, 0)
    // Par défaut, durée de 1 heure
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)

    const formatCompact = (d) => {
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
    }

    return {
      start: formatCompact(startDate),
      end: formatCompact(endDate),
      isAllDay: false
    }
  } else {
    // Événement sur toute la journée
    const pad = (n) => String(n).padStart(2, '0')
    const start = `${year}${pad(month)}${pad(day)}`
    // Date de fin exclusive pour Google (jour suivant)
    const nextDay = new Date(year, month - 1, day + 1)
    const end = `${nextDay.getFullYear()}${pad(nextDay.getMonth() + 1)}${pad(nextDay.getDate())}`

    return { start, end, isAllDay: true }
  }
}

/**
 * Génère le lien Web direct vers Google Agenda
 */
export function getGoogleCalendarUrl(event) {
  const { start, end } = parseEventDates(event.date, event.time)
  const title = encodeURIComponent(event.title || 'Événement FamilyGest')
  const location = encodeURIComponent(event.location || '')
  
  let detailsText = 'Événement FamilyGest'
  if (event.category) detailsText += ` (${event.category})`
  const details = encodeURIComponent(detailsText)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
}

/**
 * Ouvre Google Agenda dans un nouvel onglet
 */
export function openGoogleCalendar(event) {
  const url = getGoogleCalendarUrl(event)
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Génère le contenu d'un fichier standard .ics (iCalendar)
 */
export function generateIcsContent(event) {
  const { start, end, isAllDay } = parseEventDates(event.date, event.time)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const uid = `familygest-${event.id || Date.now()}@familygest.local`
  const summary = (event.title || 'Événement FamilyGest').replace(/[,;\\]/g, ' ')
  const location = (event.location || '').replace(/[,;\\]/g, ' ')
  const description = `Événement FamilyGest${event.category ? ' - ' + event.category : ''}`

  let dateLines = ''
  if (isAllDay) {
    dateLines = `DTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}`
  } else {
    dateLines = `DTSTART:${start}\r\nDTEND:${end}`
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FamilyGest//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dateLines,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : '',
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
}

/**
 * Télécharge un fichier .ics pour l'importer dans Apple Calendrier, Outlook ou tout autre agenda
 */
export function downloadIcsFile(event) {
  const icsData = generateIcsContent(event)
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const sanitizedTitle = (event.title || 'evenement')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30)
  const filename = `${sanitizedTitle || 'evenement'}.ics`

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
