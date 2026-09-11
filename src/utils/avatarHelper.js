/**
 * Utilitaire de gestion des avatars (3D et photos personnalisées)
 * Compatible iOS / Android / Mac / PC
 */

export const PRESET_3D_AVATARS = [
  { id: 'dad-1', label: 'Papa', path: '/avatars/3d/dad-1.webp' },
  { id: 'mom-1', label: 'Maman', path: '/avatars/3d/mom-1.webp' },
  { id: 'mom-2', label: 'Maman (style 2)', path: '/avatars/3d/mom-2.webp' },
  { id: 'boy-teen', label: 'Ado garçon', path: '/avatars/3d/boy-teen.webp' },
  { id: 'girl-teen', label: 'Ado fille', path: '/avatars/3d/girl-teen.webp' },
  { id: 'boy-kid', label: 'Garçon', path: '/avatars/3d/boy-kid.webp' },
  { id: 'girl-kid', label: 'Fille', path: '/avatars/3d/girl-kid.webp' },
  { id: 'baby', label: 'Bébé', path: '/avatars/3d/baby.webp' },
  { id: 'grandpa', label: 'Papy', path: '/avatars/3d/grandpa.webp' },
  { id: 'grandma', label: 'Mamie', path: '/avatars/3d/grandma.webp' },
  { id: 'cat', label: 'Chat', path: '/avatars/3d/cat.webp' },
  { id: 'dog', label: 'Chien', path: '/avatars/3d/dog.webp' }
]

export const DEFAULT_AVATAR = '/avatars/3d/dad-1.webp'

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
      return reject(new Error('Aucun fichier sélectionné'))
    }

    if (!file.type.startsWith('image/')) {
      return reject(new Error('Le fichier sélectionné n\'est pas une image valide.'))
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
            return reject(new Error('Impossible d\'initialiser le contexte graphique canvas.'))
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
        reject(new Error('Impossible de lire l\'image sélectionnée.'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier.'))
    }

    reader.readAsDataURL(file)
  })
}
