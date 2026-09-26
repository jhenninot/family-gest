// Modèle de dialogue de la skill (fr-FR), à importer dans la console développeur Amazon
// (Build › Interaction Model › JSON Editor). Il est généré avec les prénoms de la famille, pour que
// la reconnaissance vocale les connaisse dès la première phrase ; la skill les renvoie aussi à Alexa
// à l'ouverture (entités dynamiques), ce qui couvre les membres ajoutés après l'import.

// « family gest » est mal reconnu en français : nom par défaut en mots courants, modifiable par
// famille (AlexaConnector.invocationName) et repris à chaque téléchargement du modèle.
export const DEFAULT_INVOCATION_NAME = 'gestion famille'

// Règles d'Amazon : au moins deux mots, lettres minuscules, espaces et apostrophes, pas de mot
// de lancement ni de nom réservé. Renvoie le nom nettoyé, ou null s'il n'est pas utilisable.
const FORBIDDEN_INVOCATION_WORDS = ['alexa', 'amazon', 'echo', 'skill', 'app', 'application', 'ouvre', 'demande', 'lance', 'dis', 'commence', 'arrête', 'stop']
export const normalizeInvocationName = (value) => {
  const name = String(value || '').trim().toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 50) return null
  if (!/^[a-zàâäçéèêëîïôöùûüÿœæ' ]+$/.test(name)) return null
  const words = name.split(' ')
  if (words.length < 2) return null
  if (words.some(w => FORBIDDEN_INVOCATION_WORDS.includes(w))) return null
  return name
}

// « {member} ne sera pas là [{date}] {slotOne} » : les parties entre crochets sont optionnelles.
const expand = (templates) => {
  const out = new Set()
  for (const template of templates) {
    let variants = [template]
    while (variants.some(v => v.includes('['))) {
      variants = variants.flatMap(v => {
        const match = /\[([^\]]*)\]/.exec(v)
        if (!match) return [v]
        return [v.replace(match[0], match[1]), v.replace(match[0], '')]
      })
    }
    variants.forEach(v => out.add(v.replace(/\s+/g, ' ').trim()))
  }
  return [...out]
}

const prompt = (id, texts) => ({ id, variations: texts.map(value => ({ type: 'PlainText', value })) })

// Valeurs d'exemple des textes libres : un type personnalisé renvoie aussi les mots entendus
// qui ne figurent pas dans la liste, ces exemples servent surtout à calibrer la reconnaissance.
const freeText = (samples) => samples.map(value => ({ name: { value } }))

const MEAL_SLOT_VALUES = [
  { id: 'LUNCH', name: { value: 'midi', synonyms: ['ce midi', 'le midi', 'déjeuner', 'au déjeuner', 'à midi'] } },
  { id: 'DINNER', name: { value: 'soir', synonyms: ['ce soir', 'le soir', 'dîner', 'au dîner'] } },
  { id: 'NIGHT', name: { value: 'nuit', synonyms: ['la nuit', 'cette nuit', 'dormir'] } },
  { id: 'ALL_DAY', name: { value: 'toute la journée', synonyms: ['la journée', 'toute la journée et la nuit'] } }
]

// Formulations supplémentaires (synonymes), ajoutées aux phrases de base de chaque intention
const EXTRA_SAMPLES = {
  AddEventIntent: [
    'ajoute un rendez-vous {title} {date} [à {time}]',
    'ajoute un événement {title} [{date}] [à {time}]',
    'ajoute {title} au calendrier [{date}] [à {time}]',
    'crée un événement {title} [{date}] [à {time}]',
    'crée un rendez-vous {title} {date} [à {time}]',
    'programme {title} {date} [à {time}]',
    'planifie {title} {date} [à {time}]',
    "inscris {title} [dans l'agenda] {date} [à {time}]",
    "note dans l'agenda {title} {date} [à {time}]",
    'mets {title} au calendrier [{date}] [à {time}]',
    'on a {title} {date} [à {time}]',
    'il y a {title} {date} [à {time}]',
    '{title} le {date} [à {time}]'
  ],
  AddShoppingIntent: [
    'achète {items}',
    'rajoute {items} aux courses',
    'ajoute {items} à la liste des courses',
    'ajoute aux courses {items}',
    'note {items} sur la liste [de courses]',
    'note {items} pour les courses',
    "on n'a plus de {items}",
    "il n'y a plus de {items}",
    'pense à acheter {items}',
    'il faudrait acheter {items}',
    'il faut racheter {items}',
    'racheter {items}',
    'à acheter {items}',
    'liste de courses {items}'
  ],
  AddMealIntent: [
    'au {mealSlot} [{date}] on mange {dish}',
    '{date} au {mealSlot} on mange {dish}',
    'on fait {dish} [{date}] au {mealSlot}',
    'on fait {dish} au {mealSlot} [{date}]',
    'on fait {dish} {date} {mealSlot}',
    'je fais {dish} au {mealSlot} [{date}]',
    'je fais {dish} {date} {mealSlot}',
    'mets au menu {dish} [{date}] [au] [{mealSlot}]',
    "le menu du {mealSlot} [{date}] c'est {dish}",
    'planifie {dish} pour le {mealSlot} [{date}]',
    'ajoute le plat {dish} [au] {mealSlot} [{date}]'
  ],
  AbsenceIntent: [
    '{member} sera absent [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} sera absente [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} sera absent {date}',
    '{member} sera absente {date}',
    "{member} n'est pas là {date}",
    '{member} ne mangera pas à la maison [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} ne sera pas à la maison [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} ne mange pas avec nous [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} ne rentre pas manger [{date}] [le] {slotOne}',
    '{member} mange dehors [{date}] [le] {slotOne}',
    "{member} mange à l'extérieur [{date}] [le] {slotOne}",
    'déclare une absence pour {member} [{date}] [le] {slotOne} [et {slotTwo}]',
    'note une absence pour {member} [{date}] [le] {slotOne} [et {slotTwo}]'
  ],
  AbsenceNightIntent: [
    '{member} ne rentre pas dormir [{date}]',
    '{member} ne dort pas là [{date}]',
    '{member} dort chez des amis [{date}]',
    '{member} dort chez un copain [{date}]',
    '{member} dort chez une copine [{date}]',
    '{member} passe la nuit dehors [{date}]',
    '{member} passe la nuit ailleurs [{date}]'
  ],
  PresenceIntent: [
    '{member} sera à la maison [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} mange avec nous [{date}] [le] {slotOne} [et {slotTwo}]',
    '{member} rentre manger [{date}] [le] {slotOne}',
    '{member} sera présent {date}',
    '{member} sera présente {date}',
    '{member} est là {date}',
    'déclare une présence pour {member} [{date}] [le] {slotOne} [et {slotTwo}]'
  ],
  PresenceNightIntent: [
    '{member} dort ici [{date}]',
    '{member} passe la nuit à la maison [{date}]'
  ],
  AddGuestIntent: [
    '{guests} vient manger [au] {slotOne} [{date}]',
    '{guests} vient manger {date} [le] {slotOne}',
    '{guests} viennent manger [au] {slotOne} [{date}]',
    '{guests} viennent manger {date} [le] {slotOne}',
    '{guests} mangent avec nous [{date}] [le] {slotOne}',
    'invite {guests} à {slotOne} [et {slotTwo}] [{date}]',
    'invite {guests} au {slotOne} [{date}]',
    'on a {guests} à {slotOne} [{date}]',
    'ajoute {guests} comme invité [{date}] [au] {slotOne}',
    'ajoute {guests} aux invités [{date}] [au] {slotOne}'
  ],
  WhoIsHomeIntent: [
    'combien serons-nous [{date}] [{mealSlot}]',
    'on est combien [{date}] [{mealSlot}]',
    'combien de personnes mangent [à la maison] [{date}] [{mealSlot}]',
    'qui est à la maison [{date}] [{mealSlot}]',
    'qui sera à la maison [{date}] [{mealSlot}]',
    'qui vient manger [{date}] [{mealSlot}]',
    'pour combien je cuisine [{date}] [{mealSlot}]',
    'je fais à manger pour combien [{date}] [{mealSlot}]',
    'combien de couverts faut-il [{date}] [{mealSlot}]',
    // Sur une semaine ou un week-end (« qui est là la semaine prochaine »)
    'qui est là pendant {date}',
    'qui sera là pendant {date}',
    'qui est là pour {date}',
    'qui sera présent [{date}] [{mealSlot}]',
    'qui sera à la maison pendant {date}',
    'quelles sont les présences [{date}]',
    'les présences [{date}]',
    'qui est absent [{date}] [{mealSlot}]',
    'qui sera absent [{date}] [{mealSlot}]',
    'quelles sont les absences [{date}]',
    'les absences [{date}]',
    'est-ce que quelqu\'un est absent [{date}]',
    'il y a des invités [{date}]',
    'qui est invité [{date}] [{mealSlot}]'
  ],
  WhoSleepsIntent: ['qui dort ici [{date}]', 'qui passe la nuit à la maison [{date}]'],
  TasksIntent: [
    'quelles sont mes tâches',
    "qu'est-ce qu'il y a comme tâches",
    'y a-t-il des tâches [en cours]',
    'est-ce qu\'il reste des tâches',
    'quelles tâches sont en retard',
    'les tâches à faire',
    'la liste des choses à faire',
    "qu'est-ce que je dois faire",
    "ce qu'il reste à faire",
    'quelles tâches a {member} à faire',
    "qu'est-ce qu'il reste à faire pour {member}",
    '{member} a des tâches',
    '{member} doit faire quoi',
    'les tâches pour {member}'
  ],
  MealsIntent: [
    "qu'est-ce qu'on a au menu [{date}] [{mealSlot}]",
    "qu'y a-t-il au menu [{date}] [{mealSlot}]",
    "c'est quoi le menu [{date}] [{mealSlot}]",
    "c'est quoi le repas [{date}] [{mealSlot}]",
    "qu'est-ce qu'il y a à manger [{date}] [{mealSlot}]",
    "qu'est-ce qu'on mange de bon [{date}] [{mealSlot}]",
    'que mange-t-on [{date}] [{mealSlot}]',
    'que mange-t-on [au] {mealSlot} [{date}]',
    // La reconnaissance vocale transcrit souvent « mange-t-on » sans tirets
    'que mange t on [{date}] [{mealSlot}]',
    "que mange t'on [{date}] [{mealSlot}]",
    "qu'est-ce que l'on mange [{date}] [{mealSlot}]",
    "qu'est-ce qu'on va manger [{date}] [{mealSlot}]",
    "ce qu'on va manger [{date}] [{mealSlot}]",
    "ce que l'on mange [{date}] [{mealSlot}]",
    'que va-t-on manger [{date}] [{mealSlot}]',
    "qu'allons-nous manger [{date}] [{mealSlot}]",
    'que mangeons-nous [{date}] [{mealSlot}]',
    'quel est le repas [de] [{date}] [{mealSlot}]',
    'le repas de {date} [{mealSlot}]',
    'quel est le plat du {mealSlot} [{date}]',
    'quel plat est prévu [{date}] [{mealSlot}]',
    "ce qu'on a prévu de manger [{date}]",
    'le menu de la semaine',
    'les repas de la semaine',
    'quel est le menu de la semaine'
  ],
  'AMAZON.HelpIntent': ['comment ça marche', 'que sais-tu faire', "qu'est-ce que tu sais faire"]
}

// Après « Alexa, demande à … », on emploie l'infinitif : « … d'ajouter du lait », « … de mettre des
// lasagnes au dîner ». Chaque phrase d'action à l'impératif reçoit donc sa forme indirecte.
const INDIRECT_FORMS = {
  ajoute: "d'ajouter", rajoute: 'de rajouter', mets: 'de mettre', note: 'de noter', 'prévois': 'de prévoir',
  'achète': "d'acheter", 'crée': 'de créer', programme: 'de programmer', planifie: 'de planifier',
  invite: "d'inviter", inscris: "d'inscrire", 'déclare': 'de déclarer', prends: 'de prendre'
}
const withIndirectForms = (samples) => {
  const out = new Set(samples)
  for (const sample of samples) {
    const [first, ...rest] = sample.split(' ')
    if (INDIRECT_FORMS[first]) out.add([INDIRECT_FORMS[first], ...rest].join(' '))
  }
  return [...out]
}

// Complète les intentions (synonymes + formes indirectes) ; une phrase déjà utilisée par une autre
// intention est écartée, Amazon refusant les doublons entre intentions.
const enrichIntents = (intents) => {
  const used = new Set()
  return intents.map(intent => {
    const samples = withIndirectForms([...intent.samples, ...expand(EXTRA_SAMPLES[intent.name] || [])])
      .filter(sample => !used.has(sample))
    samples.forEach(sample => used.add(sample))
    return { ...intent, samples }
  })
}

export const buildInteractionModel = ({ invocationName = DEFAULT_INVOCATION_NAME, members = [] } = {}) => {
  const memberValues = members.map(m => ({
    id: String(m.id),
    name: { value: m.firstName, synonyms: [m.name].filter(n => n && n !== m.firstName) }
  }))
  // Le type doit contenir au moins une valeur, même pour une famille encore vide
  if (memberValues.length === 0) memberValues.push({ id: 'EXEMPLE', name: { value: 'Camille' } })

  const date = { name: 'date', type: 'AMAZON.DATE' }
  const intents = [
    {
      name: 'AddEventIntent',
      slots: [{ name: 'title', type: 'EventTitle' }, { ...date }, { name: 'time', type: 'AMAZON.TIME' }],
      samples: expand([
        "ajoute {title} [à l'agenda] {date} [à {time}]",
        "ajoute {title} à l'agenda",
        "ajoute l'événement {title} [{date}] [à {time}]",
        'note {title} {date} [à {time}]',
        "mets {title} dans l'agenda [{date}] [à {time}]",
        'prends rendez-vous {title} {date} [à {time}]',
        '{title} {date} à {time}'
      ])
    },
    {
      name: 'AddShoppingIntent',
      slots: [{ name: 'items', type: 'ShoppingItems' }],
      samples: expand([
        'ajoute {items} à la liste [de courses]',
        'ajoute {items} à ma liste [de courses]',
        'ajoute {items} aux courses',
        'ajoute {items} à mes courses',
        'rajoute {items} à ma liste [de courses]',
        'acheter {items}',
        "qu'il faut {items}",
        "qu'il faut acheter {items}",
        "qu'il manque {items}",
        'il faut {items}',
        'ajoute {items} sur la liste [de courses]',
        'rajoute {items} [à la liste] [aux courses]',
        'mets {items} sur la liste [de courses]',
        'il faut acheter {items}',
        'il manque {items}',
        'on a besoin de {items}',
        'courses {items}'
      ])
    },
    {
      name: 'AddMealIntent',
      slots: [{ name: 'dish', type: 'DishName' }, { ...date }, { name: 'mealSlot', type: 'MealSlot' }],
      samples: expand([
        'mets {dish} au {mealSlot} [de] [{date}]',
        'mets {dish} [au menu] {date} {mealSlot}',
        'prévois {dish} pour le {mealSlot} [de] [{date}]',
        'prévois {dish} {date} {mealSlot}',
        'on mange {dish} {date} [au] {mealSlot}',
        'on mange {dish} {mealSlot}',
        'au menu {date} {mealSlot} {dish}',
        'au menu du {mealSlot} {dish}',
        'ajoute {dish} au menu [du] [{mealSlot}] [{date}]'
      ])
    },
    {
      name: 'AbsenceIntent',
      slots: [{ name: 'member', type: 'MemberName' }, { ...date }, { name: 'slotOne', type: 'MealSlot' }, { name: 'slotTwo', type: 'MealSlot' }],
      samples: expand([
        '{member} ne sera pas là [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} ne sera pas là {slotOne} [et {slotTwo}] {date}',
        "{member} n'est pas là [{date}] [le] {slotOne} [et {slotTwo}]",
        '{member} est absent [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} est absente [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} ne mange pas à la maison [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} ne rentre pas [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} ne sera pas là {date}',
        'absence de {member} [{date}] [le] {slotOne} [et {slotTwo}]'
      ])
    },
    {
      name: 'AbsenceNightIntent',
      slots: [{ name: 'member', type: 'MemberName' }, { ...date }],
      samples: expand([
        '{member} ne dort pas à la maison [{date}]',
        '{member} dort ailleurs [{date}]',
        '{member} découche [{date}]'
      ])
    },
    {
      name: 'PresenceIntent',
      slots: [{ name: 'member', type: 'MemberName' }, { ...date }, { name: 'slotOne', type: 'MealSlot' }, { name: 'slotTwo', type: 'MealSlot' }],
      samples: expand([
        '{member} sera là [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} sera là {slotOne} [et {slotTwo}] {date}',
        '{member} est là [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} est présent [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} est présente [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} mange à la maison [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} rentre [{date}] [le] {slotOne} [et {slotTwo}]',
        '{member} sera là {date}',
        'présence de {member} [{date}] [le] {slotOne} [et {slotTwo}]'
      ])
    },
    {
      name: 'PresenceNightIntent',
      slots: [{ name: 'member', type: 'MemberName' }, { ...date }],
      samples: expand([
        '{member} dort à la maison [{date}]',
        '{member} rentre dormir [{date}]'
      ])
    },
    {
      name: 'AddGuestIntent',
      slots: [{ name: 'guests', type: 'GuestNames' }, { ...date }, { name: 'slotOne', type: 'MealSlot' }, { name: 'slotTwo', type: 'MealSlot' }],
      samples: expand([
        '{guests} vient {slotOne} [et {slotTwo}] [{date}]',
        '{guests} viennent {slotOne} [et {slotTwo}] [{date}]',
        '{guests} reste {slotOne} [et {slotTwo}] [{date}]',
        '{guests} restent {slotOne} [et {slotTwo}] [{date}]',
        'on invite {guests} à {slotOne} [et {slotTwo}] [{date}]',
        'on invite {guests} au {slotOne} [et {slotTwo}] [{date}]',
        'on invite {guests} {date} [le] {slotOne} [et {slotTwo}]',
        'on reçoit {guests} [au] {slotOne} [et {slotTwo}] [{date}]',
        'ajoute un invité {guests} [{date}] [le] {slotOne}',
        'ajoute les invités {guests} [{date}] [le] {slotOne}',
        '{guests} sont invités [au] {slotOne} [{date}]',
        '{guests} est invitée [au] {slotOne} [{date}]',
        '{guests} est invité [au] {slotOne} [{date}]'
      ])
    },
    {
      name: 'WhoIsHomeIntent',
      slots: [{ ...date }, { name: 'mealSlot', type: 'MealSlot' }],
      samples: expand([
        'qui mange à la maison [{date}] [{mealSlot}]',
        'qui mange à la maison [au] {mealSlot} [{date}]',
        'qui mange [au] {mealSlot} [{date}]',
        'qui est là [{date}] [{mealSlot}]',
        'qui est là [au] {mealSlot} [{date}]',
        'qui est présent [{date}] [{mealSlot}]',
        'qui sera là [{date}] [{mealSlot}]',
        'qui sera là [au] {mealSlot} [{date}]',
        'combien on est [{date}] [{mealSlot}]',
        'combien on est [au] {mealSlot} [{date}]',
        'on sera combien [{date}] [{mealSlot}]',
        'on sera combien [au] {mealSlot} [{date}]',
        'combien de personnes [{date}] [{mealSlot}]',
        'combien de couverts [{date}] [{mealSlot}]'
      ])
    },
    {
      name: 'WhoSleepsIntent',
      slots: [{ ...date }],
      samples: expand(['qui dort à la maison [{date}]', 'qui dort là [{date}]', 'qui sera là [{date}] pour dormir'])
    },
    {
      name: 'TasksIntent',
      slots: [{ name: 'member', type: 'MemberName' }],
      samples: expand([
        'quelles sont les tâches [en cours]',
        'quelles sont les tâches à faire',
        'quelles tâches restent à faire',
        "qu'est-ce qu'il reste à faire",
        "qu'est-ce qu'il y a à faire",
        'la liste des tâches',
        'les tâches en cours',
        'quelles sont les tâches de {member}',
        "qu'est-ce que {member} doit faire",
        'quelles tâches a {member}',
        'les tâches de {member}'
      ])
    },
    {
      name: 'MealsIntent',
      slots: [{ ...date }, { name: 'mealSlot', type: 'MealSlot' }],
      samples: expand([
        "qu'est-ce qu'on mange [{date}] [{mealSlot}]",
        // « Alexa, demande à … ce qu'on mange lundi soir » : forme indirecte après « demande à »
        "ce qu'on mange [{date}] [{mealSlot}]",
        "ce qu'on mange [au] {mealSlot} [{date}]",
        "ce qu'il y a au menu [{date}] [{mealSlot}]",
        "ce qui est prévu [au] {mealSlot} [{date}]",
        "qu'est-ce qu'on mange [au] {mealSlot} [{date}]",
        'on mange quoi [{date}] [{mealSlot}]',
        'on mange quoi [au] {mealSlot} [{date}]',
        'quel est le menu [{date}] [{mealSlot}]',
        'quel est le menu [du] {mealSlot} [{date}]',
        'quel est le menu de {date}',
        'quels sont les repas prévus [{date}]',
        'quels repas sont prévus [{date}]',
        "qu'est-ce qui est prévu [au] {mealSlot} [{date}]",
        "qu'est-ce qui est prévu à manger [{date}]",
        'le menu [{date}]'
      ])
    },
    {
      name: 'EventsIntent',
      slots: [{ ...date }],
      samples: expand([
        'quels sont les [prochains] événements [à venir] [{date}]',
        'quels événements sont prévus [{date}]',
        'quels sont les [prochains] rendez-vous [{date}]',
        "qu'est-ce qu'il y a dans l'agenda [{date}]",
        "ce qu'il y a dans l'agenda [{date}]",
        "qu'est-ce qu'on a dans l'agenda [{date}]",
        "qu'est-ce qui est prévu dans l'agenda [{date}]",
        "on a quoi dans l'agenda [{date}]",
        "est-ce qu'on a des rendez-vous [{date}]",
        "est-ce qu'il y a des événements [{date}]",
        'les [prochains] événements [{date}]',
        'les [prochains] rendez-vous [{date}]',
        "l'agenda [de] [{date}]",
        "lis-moi l'agenda [{date}]",
        "de me lire l'agenda [{date}]",
        "c'est quoi les prochains rendez-vous",
        "quel est le prochain rendez-vous",
        "quel est le prochain événement"
      ])
    },
    {
      name: 'DaySummaryIntent',
      slots: [{ ...date }],
      samples: expand([
        '[fais-moi] [donne-moi] le récapitulatif [du jour]',
        '[fais-moi] [donne-moi] le récapitulatif de {date}',
        'le récapitulatif de la journée',
        'de me faire le récapitulatif [du jour]',
        'de me faire le récapitulatif de {date}',
        'de me donner le récapitulatif [du jour]',
        '[fais-moi] un récap [du jour]',
        'le récap [du jour]',
        'le récap de {date}',
        '[fais-moi] le résumé de la journée',
        'le résumé [du jour]',
        'le résumé de {date}',
        'quel est le programme [du jour] [{date}]',
        'quel est le programme de la journée',
        "qu'est-ce qu'il y a au programme [{date}]",
        "ce qu'il y a au programme [{date}]",
        'le programme [du jour]',
        'le programme de {date}',
        'quoi de prévu [{date}]',
        "qu'est-ce qui est prévu [{date}]",
        "qu'est-ce qu'on a de prévu [{date}]",
        'comment se passe la journée',
        'comment se présente la journée [{date}]',
        'fais le point [du jour]',
        'fais le point sur {date}',
        'le point du jour'
      ])
    },
    { name: 'AMAZON.HelpIntent', samples: ['aide', 'aide-moi', "qu'est-ce que je peux dire"] },
    { name: 'AMAZON.CancelIntent', samples: [] },
    { name: 'AMAZON.StopIntent', samples: [] },
    { name: 'AMAZON.NoIntent', samples: ["c'est tout", 'rien', 'non merci'] },
    { name: 'AMAZON.YesIntent', samples: [] },
    { name: 'AMAZON.FallbackIntent', samples: [] },
    { name: 'AMAZON.NavigateHomeIntent', samples: [] }
  ]

  const types = [
    { name: 'MemberName', values: memberValues },
    { name: 'MealSlot', values: MEAL_SLOT_VALUES },
    { name: 'EventTitle', values: freeText(['dentiste', 'rendez-vous chez le médecin', 'anniversaire de mamie', 'réunion de parents', 'match de foot', 'cours de piano', 'contrôle technique', 'repas chez les voisins']) },
    { name: 'ShoppingItems', values: freeText(['du lait', 'des œufs', 'du pain', 'deux baguettes', 'du lait et des œufs', 'du beurre, de la farine et du sucre', 'des pommes de terre', 'une salade', 'du papier toilette', 'six yaourts']) },
    { name: 'DishName', values: freeText(['des lasagnes', 'une raclette', 'des pâtes carbonara', 'un poulet rôti', 'une soupe de légumes', 'des crêpes', 'une quiche lorraine', 'du poisson', 'un gratin dauphinois', 'des burgers']) },
    { name: 'GuestNames', values: freeText(['mamie', 'papi', 'mamie et papi', 'les dupont', 'tante sophie', 'les voisins', 'lucas et emma', 'le parrain de léa']) }
  ]

  // Dialogue : Alexa demande d'elle-même les informations obligatoires manquantes
  const dialogIntent = (name, slots) => ({
    name,
    delegationStrategy: 'ALWAYS',
    confirmationRequired: false,
    prompts: {},
    slots: slots.map(([slotName, type, promptId]) => ({
      name: slotName,
      type,
      confirmationRequired: false,
      elicitationRequired: Boolean(promptId),
      ...(promptId ? { prompts: { elicitation: promptId } } : {})
    }))
  })

  return {
    interactionModel: {
      languageModel: { invocationName, intents: enrichIntents(intents), types },
      dialog: {
        intents: [
          dialogIntent('AddEventIntent', [['title', 'EventTitle', 'Elicit.Event.Title'], ['date', 'AMAZON.DATE', 'Elicit.Event.Date'], ['time', 'AMAZON.TIME', null]]),
          dialogIntent('AddShoppingIntent', [['items', 'ShoppingItems', 'Elicit.Shopping.Items']]),
          dialogIntent('AddMealIntent', [['dish', 'DishName', 'Elicit.Meal.Dish'], ['date', 'AMAZON.DATE', null], ['mealSlot', 'MealSlot', 'Elicit.Meal.Slot']]),
          dialogIntent('AbsenceIntent', [['member', 'MemberName', 'Elicit.Member'], ['date', 'AMAZON.DATE', null], ['slotOne', 'MealSlot', 'Elicit.Presence.Slot'], ['slotTwo', 'MealSlot', null]]),
          dialogIntent('AbsenceNightIntent', [['member', 'MemberName', 'Elicit.Member'], ['date', 'AMAZON.DATE', null]]),
          dialogIntent('PresenceIntent', [['member', 'MemberName', 'Elicit.Member'], ['date', 'AMAZON.DATE', null], ['slotOne', 'MealSlot', 'Elicit.Presence.Slot'], ['slotTwo', 'MealSlot', null]]),
          dialogIntent('PresenceNightIntent', [['member', 'MemberName', 'Elicit.Member'], ['date', 'AMAZON.DATE', null]]),
          dialogIntent('AddGuestIntent', [['guests', 'GuestNames', 'Elicit.Guest.Names'], ['date', 'AMAZON.DATE', null], ['slotOne', 'MealSlot', 'Elicit.Guest.Slot'], ['slotTwo', 'MealSlot', null]])
        ],
        delegationStrategy: 'ALWAYS'
      },
      prompts: [
        prompt('Elicit.Event.Title', ["Quel est l'événement ?", "Comment s'appelle l'événement ?"]),
        prompt('Elicit.Event.Date', ['Pour quel jour ?', 'À quelle date ?']),
        prompt('Elicit.Shopping.Items', ['Que faut-il ajouter à la liste de courses ?']),
        prompt('Elicit.Meal.Dish', ['Quel plat ?', 'Que voulez-vous mettre au menu ?']),
        prompt('Elicit.Meal.Slot', ['Pour le déjeuner ou le dîner ?']),
        prompt('Elicit.Member', ['De qui s\'agit-il ?', 'Pour quel membre de la famille ?']),
        prompt('Elicit.Presence.Slot', ['Pour le midi, le soir ou la nuit ?']),
        prompt('Elicit.Guest.Names', ['Qui est invité ?']),
        prompt('Elicit.Guest.Slot', ['Pour le déjeuner, le dîner ou la nuit ?'])
      ]
    }
  }
}
