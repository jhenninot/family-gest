import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Nouveautés de chaque version (releases.json, la plus récente en premier). Une entrée est ajoutée
// pour toute évolution visible ; au démarrage, une version pas encore traitée est proposée au
// Super Admin, qui la publie aux utilisateurs ou l'écarte (voir checkPendingRelease, index.js).

const RELEASES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'releases.json')

let cache = null
export const listReleases = () => {
  if (!cache) {
    try {
      const data = JSON.parse(readFileSync(RELEASES_PATH, 'utf8'))
      cache = Array.isArray(data) ? data.filter(r => r && typeof r.version === 'string' && r.notes?.fr?.length) : []
    } catch (err) {
      console.error('[Releases] Lecture de releases.json impossible :', err.message)
      cache = []
    }
  }
  return cache
}

export const latestRelease = () => listReleases()[0] || null

export const releaseByVersion = (version) => listReleases().find(r => r.version === version) || null

// État d'une version pour le Super Admin : publiée, écartée, ou à publier
export const releaseState = (config, release) => {
  if (!release) return 'none'
  if (config?.releasePublishedVersion === release.version) return 'published'
  if (config?.releaseDismissedVersion === release.version) return 'dismissed'
  return 'pending'
}

// La version doit être signalée au Super Admin : à publier, et pas encore signalée
export const needsProposal = (config, release) =>
  releaseState(config, release) === 'pending' && config?.releaseProposedVersion !== release.version

// Points d'une version choisis par le Super Admin : indices valides, sans doublon, dans l'ordre.
// Les listes des trois langues sont alignées (même point au même rang).
export const normalizeSelection = (release, selection) => {
  if (!release || !Array.isArray(selection)) return null
  const count = release.notes.fr.length
  return [...new Set(selection.map(Number))].filter(i => Number.isInteger(i) && i >= 0 && i < count).sort((a, b) => a - b)
}

// Points cochés par défaut : tous, sauf ceux marqués « minor » dans releases.json (corrections,
// détails) que le Super Admin peut quand même ajouter
export const defaultSelection = (release) => {
  if (!release) return []
  const minor = new Set(Array.isArray(release.minor) ? release.minor : [])
  return release.notes.fr.map((_, i) => i).filter(i => !minor.has(i))
}

// Nouveautés dans une langue (en français à défaut, ou si la traduction n'a pas le même nombre de
// points), limitées aux points choisis quand une sélection est donnée
export const notesFor = (release, lang, selection = null) => {
  if (!release) return []
  const translated = release.notes?.[lang]
  const notes = Array.isArray(translated) && translated.length === release.notes.fr.length ? translated : release.notes.fr
  return Array.isArray(selection) ? selection.filter(i => i < notes.length).map(i => notes[i]) : notes
}
