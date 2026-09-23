// Source UNIQUE de la règle de présence habituelle, partagée par le frontend (src/) et le
// backend (server/), qui sont deux packages npm distincts.
//
// POURQUOI CE MODULE EXISTE : la règle « qui est présent à ce repas ? » était auparavant
// réimplémentée à trois endroits (src/stores/familyStore.js, server/digest/mealPresence.js,
// server/mcp/tools/aggregation.js) et ces copies avaient déjà divergé. Avec l'alternance
// semaine A/B, une divergence produirait un récapitulatif email contredisant l'app une semaine
// sur deux — un bug intermittent et très coûteux à diagnostiquer. Toute évolution de la règle
// se fait ICI, jamais dans les appelants.
//
// CONTRAINTES À RESPECTER si tu modifies ce fichier :
//  - Zéro dépendance (ni mongoose, ni vue, ni pinia) : il est importé des deux côtés.
//  - Ne JAMAIS appeler new Date() sans argument : toutes les fonctions de date sont pures et
//    prennent une chaîne 'YYYY-MM-DD'. Le repo mélange les fuseaux (familyStore.todayStr
//    formate en heure LOCALE, server/index.js getDatesRange itère en UTC) ; en ne manipulant
//    que des chaînes déjà formées, la parité A/B reste indépendante du fuseau du process.
//  - Ne JAMAIS dériver l'alternance du numéro de semaine ISO (cf. weekPhaseFor).

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const SLOT_KEYS = ['lunch', 'dinner', 'night']

export const DAY_LABELS = {
  mon: 'lundi',
  tue: 'mardi',
  wed: 'mercredi',
  thu: 'jeudi',
  fri: 'vendredi',
  sat: 'samedi',
  sun: 'dimanche'
}

export const DAY_SHORT_LABELS = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mer',
  thu: 'Jeu',
  fri: 'Ven',
  sat: 'Sam',
  sun: 'Dim'
}

// Libellés FR des créneaux. Historiquement dupliqués 3× dans server/index.js
// (notifications d'absence, formatSlotLabel, notifications d'invités) : utiliser ceux-ci.
export const SLOT_LABELS = { lunch: 'Midi', dinner: 'Soir', night: 'Nuit' }

// Lundi de référence par défaut. Valeur fixe et arbitraire : elle rend la parité A/B purement
// fonction de la date, donc déterministe et partagée, sans migration pour les familles
// existantes. Une famille qui clique « cette semaine = Semaine A » y écrit son propre lundi.
export const DEFAULT_WEEK_ANCHOR = '1970-01-05'

const MS_PER_DAY = 86400000
const MS_PER_WEEK = 7 * MS_PER_DAY

// Parse 'YYYY-MM-DD' à MIDI UTC. Midi (et non minuit) neutralise tout décalage de changement
// d'heure ; UTC rend le résultat indépendant du fuseau du navigateur ou du conteneur.
const parseUTC = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0)
}

const fmtUTC = (ts) => {
  const d = new Date(ts)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${mm}-${dd}`
}

// 'YYYY-MM-DD' -> 'mon' | 'tue' | ... | 'sun'
// Le décalage (+6) % 7 convertit la convention JS (0 = dimanche) en convention ISO (0 = lundi).
// C'est exactement l'ajustement que getMonday() d'AbsencesView faisait à la main.
export const dayKeyFor = (dateStr) => DAY_KEYS[(new Date(parseUTC(dateStr)).getUTCDay() + 6) % 7]

// Lundi de la semaine civile contenant dateStr, au format 'YYYY-MM-DD'.
export const mondayOf = (dateStr) => {
  const ts = parseUTC(dateStr)
  const back = (new Date(ts).getUTCDay() + 6) % 7
  return fmtUTC(ts - back * MS_PER_DAY)
}

// Phase d'alternance ('A' | 'B') de la semaine civile contenant dateStr.
//
// On compte les semaines écoulées entre deux LUNDIS plutôt que d'utiliser le numéro de semaine
// ISO : une année ISO compte 52 OU 53 semaines (2020 en avait 53), donc isoWeek % 2 saute une
// phase au passage du nouvel an. La soustraction de timestamps est immunisée contre ça, gère le
// changement d'année sans cas particulier, et le double modulo gère les dates ANTÉRIEURES à
// l'ancrage (weeks négatif).
export const weekPhaseFor = (dateStr, anchor = DEFAULT_WEEK_ANCHOR) => {
  const a = parseUTC(mondayOf(anchor || DEFAULT_WEEK_ANCHOR)) // mondayOf défensif : un ancrage
  const d = parseUTC(mondayOf(dateStr))                       // mal saisi reste exploitable
  const weeks = Math.round((d - a) / MS_PER_WEEK)
  return ((weeks % 2) + 2) % 2 === 0 ? 'A' : 'B'
}

// Grille 7 jours × 3 créneaux uniformément remplie.
export const fullGrid = (value = true) =>
  Object.fromEntries(
    DAY_KEYS.map(d => [d, Object.fromEntries(SLOT_KEYS.map(s => [s, Boolean(value)]))])
  )

const normalizeGrid = (raw, fallback) => {
  const out = {}
  for (const day of DAY_KEYS) {
    out[day] = {}
    for (const slot of SLOT_KEYS) {
      const v = raw?.[day]?.[slot]
      out[day][slot] = v === undefined || v === null ? fallback : Boolean(v)
    }
  }
  return out
}

// LE filet de sécurité de rétrocompatibilité. Accepte undefined, {}, une grille partielle, un
// sous-document Mongoose hydraté ou un objet .lean(), et retourne toujours une config complète
// et saine. Les membres créés avant cette fonctionnalité n'ont pas de usualPresenceConfig : ils
// retombent sur leur usualPresence historique, donc se comportent exactement comme avant.
//
// NE JAMAIS lire member.usualPresenceConfig.weekA.mon.lunch en direct : toujours passer par ici.
export const normalizeUsualPresenceConfig = (raw, legacyUsualPresence = 'present') => {
  const simple = legacyUsualPresence === 'absent' ? 'absent' : 'present'
  const base = simple !== 'absent'
  return {
    mode: raw?.mode === 'weekly' ? 'weekly' : 'simple',
    simple,
    alternating: Boolean(raw?.alternating),
    weekA: normalizeGrid(raw?.weekA, base),
    weekB: normalizeGrid(raw?.weekB, base)
  }
}

// Grille effectivement applicable à une date donnée.
export const gridForDate = (cfg, dateStr, anchor = DEFAULT_WEEK_ANCHOR) =>
  (cfg.alternating && weekPhaseFor(dateStr, anchor) === 'B') ? cfg.weekB : cfg.weekA

// Prédicat central : ce membre est-il HABITUELLEMENT présent à ce créneau, ce jour-là ?
// (indépendamment de toute déclaration ponctuelle d'absence ou de présence exceptionnelle)
//
// `member` peut être un objet du front (GET /api/members) ou un document FamilyMember : on ne
// lit que .usualPresenceConfig et .usualPresence, présents dans les deux formes.
export const isUsuallyPresent = (member, dateStr, slot, anchor = DEFAULT_WEEK_ANCHOR) => {
  const cfg = normalizeUsualPresenceConfig(member?.usualPresenceConfig, member?.usualPresence)
  if (cfg.mode !== 'weekly') return cfg.simple !== 'absent'
  const grid = gridForDate(cfg, dateStr, anchor)
  return Boolean(grid[dayKeyFor(dateStr)]?.[slot])
}

// Sélectionne LA déclaration qui fait foi pour (membre, créneau) parmi les lignes Absence d'un
// jour. Plusieurs lignes peuvent désormais coexister pour un même membre et une même date : une
// 'absence' générée par une absence longue ou un événement d'agenda, et une 'presence'
// exceptionnelle saisie à la main. Règle de départage unique et déterministe : la déclaration
// écrite le plus récemment gagne (Absence a bien { timestamps: true }).
export const pickDeclaredRecord = (records, memberId, slot) => {
  const hits = records.filter(r => Number(r.memberId) === Number(memberId) && r[slot])
  if (hits.length <= 1) return hits[0] || null
  return hits.reduce((best, r) => {
    const rTs = new Date(r.updatedAt || r.createdAt || 0).getTime()
    const bTs = new Date(best.updatedAt || best.createdAt || 0).getTime()
    return rTs >= bTs ? r : best
  })
}

// Table de vérité : une déclaration explicite prime toujours sur l'habitude.
export const resolveSlot = (usuallyPresent, declared) =>
  declared ? declared.type === 'presence' : Boolean(usuallyPresent)

export const TOTAL_SLOTS_PER_WEEK = DAY_KEYS.length * SLOT_KEYS.length // 21

export const countPresentSlots = (grid) =>
  DAY_KEYS.reduce((n, d) => n + SLOT_KEYS.filter(s => grid?.[d]?.[s]).length, 0)

// Dénormalisation de la config vers l'enum historique usualPresence, qui reste exposé partout
// (export RGPD, list_members MCP, sérialisations legacy de server/index.js). DOIT être ré-écrit
// à chaque sauvegarde de la config, sinon ces consommateurs se mettent à mentir.
//
// Règle : la majorité des créneaux. « Au moins un créneau » ferait passer pour « habituellement
// présent » quelqu'un qui ne vient que le dimanche midi, ce qui est trompeur.
export const summarizeUsualPresence = (cfg) => {
  if (cfg.mode !== 'weekly') return cfg.simple
  const present = cfg.alternating
    ? countPresentSlots(cfg.weekA) + countPresentSlots(cfg.weekB)
    : countPresentSlots(cfg.weekA)
  const total = cfg.alternating ? TOTAL_SLOTS_PER_WEEK * 2 : TOTAL_SLOTS_PER_WEEK
  return present * 2 > total ? 'present' : 'absent'
}

const joinFr = (parts) => {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`
}

// Décrit une grille en français : « tous les créneaux », « aucun créneau », ou la liste des
// absences groupée par jour (« absent le mercredi soir et nuit, le samedi midi »).
export const describeGrid = (grid) => {
  const present = countPresentSlots(grid)
  if (present === TOTAL_SLOTS_PER_WEEK) return 'présent(e) à tous les créneaux'
  if (present === 0) return 'absent(e) à tous les créneaux'

  // On décrit le plus court des deux : les absences ou les présences.
  const describeMissing = present * 2 >= TOTAL_SLOTS_PER_WEEK
  const groups = []
  for (const day of DAY_KEYS) {
    const slots = SLOT_KEYS.filter(s => Boolean(grid?.[day]?.[s]) !== describeMissing)
    if (slots.length === 0) continue
    const label = slots.length === SLOT_KEYS.length
      ? DAY_LABELS[day]
      : `${DAY_LABELS[day]} ${joinFr(slots.map(s => SLOT_LABELS[s].toLowerCase()))}`
    groups.push(label)
  }
  // Les groupes sont séparés par des virgules et jamais par « et » : un groupe contient déjà
  // son propre « et » entre créneaux (« mercredi soir et nuit »), et enchaîner les deux
  // donnerait « mercredi soir et nuit et samedi midi ».
  const verb = describeMissing ? 'absent(e)' : 'présent(e)'
  return `${verb} le ${groups.join(', ')}`
}

// Résumé d'une ligne pour l'UI : personne ne relit 42 cases à cocher.
export const describeUsualPresence = (cfg, dateStr = null, anchor = DEFAULT_WEEK_ANCHOR) => {
  if (cfg.mode !== 'weekly') {
    return cfg.simple === 'absent'
      ? 'Habituellement absent(e) — vous signalez vos présences'
      : 'Habituellement présent(e) — vous signalez vos absences'
  }
  if (!cfg.alternating) {
    const s = describeGrid(cfg.weekA)
    return `Chaque semaine : ${s}`
  }
  const currentPhase = dateStr ? weekPhaseFor(dateStr, anchor) : null
  const mark = (p) => (currentPhase === p ? ' (en cours)' : '')
  return `Semaine A${mark('A')} : ${describeGrid(cfg.weekA)} · Semaine B${mark('B')} : ${describeGrid(cfg.weekB)}`
}
