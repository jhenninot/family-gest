/**
 * Utilitaire de gestion des avatars (3D et photos personnalisées)
 * Compatible iOS / Android / Mac / PC
 */

import { t } from '../i18n'

// Libellés (infobulle, texte alternatif) : avatar.presets.<id>
export const PRESET_3D_AVATARS = [
  // --- 15 ANS (ADOS) ---
  { id: 'teen-boy-asian', path: '/avatars/3d/teen-boy-asian.webp' },
  { id: 'teen-girl-fair-blonde', path: '/avatars/3d/teen-girl-fair-blonde.webp' },
  { id: 'teen-boy-black', path: '/avatars/3d/teen-boy-black.webp' },
  { id: 'teen-boy-fair-blond', path: '/avatars/3d/teen-boy-fair-blond.webp' },
  { id: 'teen-girl-black-braids', path: '/avatars/3d/teen-girl-black-braids.webp' },
  { id: 'teen-girl-asian-bob', path: '/avatars/3d/teen-girl-asian-bob.webp' },
  { id: 'teen-girl-fair-brunette', path: '/avatars/3d/teen-girl-fair-brunette.webp' },
  { id: 'teen-boy-fair-brown', path: '/avatars/3d/teen-boy-fair-brown.webp' },

  // --- 25 ANS (JEUNES ADULTES) ---
  { id: 'young-man-black-afro', path: '/avatars/3d/young-man-black-afro.webp' },
  { id: 'young-woman-fair-ginger', path: '/avatars/3d/young-woman-fair-ginger.webp' },
  { id: 'young-man-asian', path: '/avatars/3d/young-man-asian.webp' },
  { id: 'young-woman-black-puff', path: '/avatars/3d/young-woman-black-puff.webp' },
  { id: 'young-woman-fair-brunette', path: '/avatars/3d/young-woman-fair-brunette.webp' },
  { id: 'young-man-fair-brown', path: '/avatars/3d/young-man-fair-brown.webp' },
  { id: 'young-woman-fair-blonde', path: '/avatars/3d/young-woman-fair-blonde.webp' },
  { id: 'young-man-fair-blond', path: '/avatars/3d/young-man-fair-blond.webp' },
  { id: 'young-woman-asian-long', path: '/avatars/3d/young-woman-asian-long.webp' },

  // --- 40 ANS (ADULTES) ---
  { id: 'adult-woman-asian-ponytail', path: '/avatars/3d/adult-woman-asian-ponytail.webp' },
  { id: 'adult-woman-fair-chestnut', path: '/avatars/3d/adult-woman-fair-chestnut.webp' },
  { id: 'adult-woman-black-twists', path: '/avatars/3d/adult-woman-black-twists.webp' },
  { id: 'adult-man-fair-glasses', path: '/avatars/3d/adult-man-fair-glasses.webp' },
  { id: 'adult-man-black-beard', path: '/avatars/3d/adult-man-black-beard.webp' },
  { id: 'adult-man-asian', path: '/avatars/3d/adult-man-asian.webp' },
  { id: 'adult-man-fair-bald', path: '/avatars/3d/adult-man-fair-bald.webp' },
  { id: 'adult-woman-fair-blonde', path: '/avatars/3d/adult-woman-fair-blonde.webp' },
  { id: 'adult-man-fair-curly', path: '/avatars/3d/adult-man-fair-curly.webp' },

  // --- 50 ANS (MATURES) ---
  { id: 'mature-woman-fair-auburn', path: '/avatars/3d/mature-woman-fair-auburn.webp' },
  { id: 'mature-woman-black-bun', path: '/avatars/3d/mature-woman-black-bun.webp' },
  { id: 'mature-woman-asian-bob', path: '/avatars/3d/mature-woman-asian-bob.webp' },
  { id: 'mature-man-asian', path: '/avatars/3d/mature-man-asian.webp' },
  { id: 'mature-man-fair-grey', path: '/avatars/3d/mature-man-fair-grey.webp' },
  { id: 'mature-man-asian-glasses', path: '/avatars/3d/mature-man-asian-glasses.webp' },
  { id: 'mature-man-black-grey', path: '/avatars/3d/mature-man-black-grey.webp' },
  { id: 'mature-man-fair-silver', path: '/avatars/3d/mature-man-fair-silver.webp' },
  { id: 'mature-woman-black-short', path: '/avatars/3d/mature-woman-black-short.webp' },

  // --- 60 ANS (SENIORS) ---
  { id: 'senior-woman-asian-glasses', path: '/avatars/3d/senior-woman-asian-glasses.webp' },
  { id: 'senior-man-fair-beard', path: '/avatars/3d/senior-man-fair-beard.webp' },
  { id: 'senior-woman-black-curls', path: '/avatars/3d/senior-woman-black-curls.webp' },
  { id: 'senior-man-black-goatee', path: '/avatars/3d/senior-man-black-goatee.webp' },
  { id: 'senior-man-asian', path: '/avatars/3d/senior-man-asian.webp' },
  { id: 'senior-woman-fair-glasses', path: '/avatars/3d/senior-woman-fair-glasses.webp' },
  { id: 'senior-man-fair-glasses', path: '/avatars/3d/senior-man-fair-glasses.webp' },

  // --- FAMILLE & COMPAGNIE ---
  { id: 'baby', path: '/avatars/3d/baby.webp' },
  { id: 'cat', path: '/avatars/3d/cat.webp' },
  { id: 'dog', path: '/avatars/3d/dog.webp' }
]

export const DEFAULT_AVATAR = '/avatars/3d/adult-man-fair-glasses.webp'

/**
 * Vérifie si la chaîne correspond à une URL / Data-URL d'image
 */
export function isImageAvatar(avatar) {
  if (!avatar || typeof avatar !== 'string') return false
  return (
    avatar.startsWith('data:image/') ||
    avatar.startsWith('/avatars/') ||
    avatar.startsWith('/') ||
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.endsWith('.webp') ||
    avatar.endsWith('.png') ||
    avatar.endsWith('.jpg') ||
    avatar.endsWith('.jpeg')
  )
}

/**
 * Retourne un emoji de repli pour les contextes où les balises <img> ne sont pas supportées (ex: <option>)
 */
export function getAvatarTextFallback(avatar, defaultEmoji = '👤') {
  if (!avatar) return defaultEmoji
  if (!isImageAvatar(avatar)) return avatar
  return defaultEmoji
}

/**
 * Traite et compresse une photo importée depuis un fichier (iOS, Android, PC, Mac)
 * - Recadre au format carré centré 1:1
 * - Redimensionne à 256x256 px
 * - Compresse en WebP (ou JPEG) pour un poids plume (~20-30 Ko)
 * 
 * @param {File} file 
 * @param {number} targetSize 
 * @returns {Promise<string>} Base64 Data URL
 */
export function processUploadedImage(file, targetSize = 256) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error(t('avatar.errors.noFile')))
    }

    if (!file.type.startsWith('image/')) {
      return reject(new Error(t('avatar.errors.notImage')))
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = targetSize
          canvas.height = targetSize
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            return reject(new Error(t('avatar.errors.canvas')))
          }

          // Lissage haute qualité
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Calcul du recadrage centré au carré 1:1
          const srcW = img.naturalWidth || img.width
          const srcH = img.naturalHeight || img.height
          const minDim = Math.min(srcW, srcH)
          const srcX = (srcW - minDim) / 2
          const srcY = (srcH - minDim) / 2

          // Dessin centré
          ctx.drawImage(img, srcX, srcY, minDim, minDim, 0, 0, targetSize, targetSize)

          // Exportation WebP avec fallback JPEG
          let dataUrl = ''
          try {
            dataUrl = canvas.toDataURL('image/webp', 0.85)
            // Si le navigateur ne supporte pas webp dans toDataURL, il retourne généralement image/png
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            }
          } catch {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          }

          resolve(dataUrl)
        } catch (err) {
          reject(err)
        }
      }

      img.onerror = () => {
        reject(new Error(t('avatar.errors.readImage')))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error(t('avatar.errors.readFile')))
    }

    reader.readAsDataURL(file)
  })
}
