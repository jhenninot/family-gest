// Modèle de dialogue de la skill (fr-FR), à importer dans la console développeur Amazon
// (Build › Interaction Model › JSON Editor). Il est généré avec les prénoms de la famille, pour que
// la reconnaissance vocale les connaisse dès la première phrase ; la skill les renvoie aussi à Alexa
// à l'ouverture (entités dynamiques), ce qui couvre les membres ajoutés après l'import.

export const DEFAULT_INVOCATION_NAME = 'family gest'

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
        'ajoute {items} aux courses',
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
      languageModel: { invocationName, intents, types },
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
