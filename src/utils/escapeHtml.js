/**
 * Échappe les caractères HTML spéciaux d'une chaîne pour permettre son interpolation
 * sans risque dans un template HTML rendu ensuite via v-html (ex: ConfirmModal).
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
