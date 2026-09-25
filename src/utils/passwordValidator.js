/**
 * Utilitaire de validation et d'analyse de robustesse des mots de passe
 * Règle : 10 caractères minimum, au moins 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.
 */

import { t } from '../i18n'

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
  if (!c.length) return t('password.errors.length')
  if (!c.hasUpper) return t('password.errors.upper')
  if (!c.hasLower) return t('password.errors.lower')
  if (!c.hasNumber) return t('password.errors.number')
  if (!c.hasSpecial) return t('password.errors.special')
  return ''
}
