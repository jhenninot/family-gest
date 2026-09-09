/**
 * Utilitaire de validation et d'analyse de robustesse des mots de passe
 * Règle : 10 caractères minimum, au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.
 */

export const checkPasswordCriteria = (password = '') => {
  const p = password || ''
  return {
    length: p.length >= 10,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p)
  }
}

export const isPasswordValid = (password = '') => {
  const c = checkPasswordCriteria(password)
  return c.length && c.hasUpper && c.hasLower && c.hasNumber && c.hasSpecial
}

export const getPasswordErrorMessage = (password = '') => {
  const c = checkPasswordCriteria(password)
  if (!c.length) return 'Le mot de passe doit comporter au moins 10 caractères.'
  if (!c.hasUpper) return 'Le mot de passe doit comporter au moins 1 lettre majuscule (A-Z).'
  if (!c.hasLower) return 'Le mot de passe doit comporter au moins 1 lettre minuscule (a-z).'
  if (!c.hasNumber) return 'Le mot de passe doit comporter au moins 1 chiffre (0-9).'
  if (!c.hasSpecial) return 'Le mot de passe doit comporter au moins 1 caractère spécial (ex: ! @ # $ % * _ -).'
  return ''
}
