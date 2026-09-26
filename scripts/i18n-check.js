// Vérifie les fichiers de traduction (npm run i18n:check) :
//  - chaque clé du français existe dans les autres langues, et inversement ;
//  - chaque message est syntaxiquement valide pour vue-i18n (accolades, « @ » à échapper…) ;
//  - les variables {nom} sont les mêmes dans toutes les langues ;
//  - chaque clé littérale utilisée dans le code (t('...'), $t('...')) existe en français.
// Code de sortie 1 en cas de problème.
import fs from 'fs'
import path from 'path'
import { baseCompile } from '@intlify/message-compiler'

const ROOTS = [
  { name: 'interface', localesDir: 'src/locales', sourceDirs: ['src'], sourceExt: /\.(vue|js)$/ },
  { name: 'serveur', localesDir: 'server/locales', sourceDirs: ['server'], sourceExt: /\.js$/ }
]
const REFERENCE = 'fr'

let problems = 0
const report = (msg) => { problems++; console.log(`  ✗ ${msg}`) }

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, full, out)
    else out[full] = value
  }
  return out
}

function loadLocale(dir) {
  const messages = {}
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const ns = file.replace(/\.json$/, '')
    try {
      Object.assign(messages, flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), ns))
    } catch (err) {
      report(`${path.join(dir, file)} : JSON invalide (${err.message})`)
    }
  }
  return messages
}

// Ensemble des variables d'un message (une forme plurielle peut les répéter ou non)
const placeholders = (msg) => [...new Set([...String(msg).matchAll(/\{\s*([\w.]+)\s*\}/g)].map(m => m[1]))].sort().join(',')

function walk(dir, ext, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'locales' || entry.name === 'data') continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, ext, files)
    else if (ext.test(entry.name)) files.push(p)
  }
  return files
}

for (const root of ROOTS) {
  if (!fs.existsSync(root.localesDir)) continue
  console.log(`\n[${root.name}] ${root.localesDir}`)
  const languages = fs.readdirSync(root.localesDir).filter(d => fs.statSync(path.join(root.localesDir, d)).isDirectory())
  const locales = Object.fromEntries(languages.map(l => [l, loadLocale(path.join(root.localesDir, l))]))
  const ref = locales[REFERENCE] || {}
  const before = problems

  for (const [lang, messages] of Object.entries(locales)) {
    for (const [key, msg] of Object.entries(messages)) {
      if (typeof msg !== 'string') { report(`${lang} : ${key} n'est pas un texte`); continue }
      baseCompile(msg, { onError: (err) => report(`${lang} : ${key} — syntaxe invalide (${err.message}) : « ${msg} »`) })
    }
    if (lang === REFERENCE) continue
    for (const key of Object.keys(ref)) {
      if (!(key in messages)) report(`${lang} : clé manquante ${key}`)
      else if (placeholders(ref[key]) !== placeholders(messages[key])) {
        report(`${lang} : ${key} — variables différentes du français ({${placeholders(ref[key])}} ≠ {${placeholders(messages[key])}})`)
      }
    }
    for (const key of Object.keys(messages)) {
      if (!(key in ref)) report(`${lang} : clé absente du français ${key}`)
    }
  }

  // Clés littérales utilisées dans le code
  const used = new Set()
  const callRe = /(?:\$t|\bt|\bte|\btc|\$te|\btl)\(\s*(?:[\w.]+\s*,\s*)?'([a-zA-Z][\w-]*(?:\.[\w-]+)+)'/g
  for (const dir of root.sourceDirs) {
    for (const file of walk(dir, root.sourceExt)) {
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(callRe)) {
        used.add(m[1])
        const isPrefix = Object.keys(ref).some(k => k.startsWith(`${m[1]}.`))
        if (!(m[1] in ref) && !isPrefix) report(`${file} : clé inconnue ${m[1]}`)
      }
    }
  }

  // Composants Vue : fonctions de traduction utilisées sans être importées (un gabarit qui
  // référence un identifiant inconnu ne casse pas le build, il affiche simplement du vide).
  if (root.name === 'interface') {
    const helpers = ['translateValue', 'FAMILY_ROLE_VALUES', 'TASK_CATEGORY_VALUES', 'TASK_PRIORITY_VALUES', 'EVENT_CATEGORY_VALUES']
    for (const file of walk('src', /\.vue$/)) {
      const src = fs.readFileSync(file, 'utf8')
      const script = (src.match(/<script[\s\S]*?<\/script>/) || [''])[0]
      for (const name of helpers) {
        if (new RegExp(`\\b${name}\\b`).test(src) && !new RegExp(`import\\s*\\{[^}]*\\b${name}\\b`).test(script)) {
          report(`${file} : ${name} utilisé sans import`)
        }
      }
      if (/\bt\(\s*['`]/.test(src) && !/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(/.test(script)) {
        report(`${file} : t() utilisé sans const { t } = useI18n()`)
      }
    }
  }

  const count = Object.keys(ref).length
  console.log(`  ${count} textes de référence, ${languages.length} langues (${languages.join(', ')}), ${used.size} clés littérales utilisées dans le code`)
  if (problems === before) console.log('  ✓ aucun problème')
}

if (problems) {
  console.log(`\n${problems} problème(s) trouvé(s).`)
  process.exit(1)
}
console.log('\nTraductions cohérentes.')
