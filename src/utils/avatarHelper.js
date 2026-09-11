/**
 * Utilitaire de gestion des avatars (3D et photos personnalisées)
 * Compatible iOS / Android / Mac / PC
 */

export const PRESET_3D_AVATARS = [
  // --- 15 ANS (ADOS) ---
  { id: 'teen-boy-asian', label: 'Ado garçon (Asiatique)', path: '/avatars/3d/teen-boy-asian.webp' },
  { id: 'teen-girl-fair-blonde', label: 'Ado fille (Blonde)', path: '/avatars/3d/teen-girl-fair-blonde.webp' },
  { id: 'teen-boy-black', label: 'Ado garçon (Noir)', path: '/avatars/3d/teen-boy-black.webp' },
  { id: 'teen-boy-fair-blond', label: 'Ado garçon (Blond)', path: '/avatars/3d/teen-boy-fair-blond.webp' },
  { id: 'teen-girl-black-braids', label: 'Ado fille (Tresses)', path: '/avatars/3d/teen-girl-black-braids.webp' },
  { id: 'teen-girl-asian-bob', label: 'Ado fille (Carré asiatique)', path: '/avatars/3d/teen-girl-asian-bob.webp' },
  { id: 'teen-girl-fair-brunette', label: 'Ado fille (Châtain bouclée)', path: '/avatars/3d/teen-girl-fair-brunette.webp' },
  { id: 'teen-boy-fair-brown', label: 'Ado garçon (Châtain)', path: '/avatars/3d/teen-boy-fair-brown.webp' },

  // --- 25 ANS (JEUNES ADULTES) ---
  { id: 'young-man-black-afro', label: 'Jeune homme (Afro)', path: '/avatars/3d/young-man-black-afro.webp' },
  { id: 'young-woman-fair-ginger', label: 'Jeune femme (Rousse)', path: '/avatars/3d/young-woman-fair-ginger.webp' },
  { id: 'young-man-asian', label: 'Jeune homme (Asiatique)', path: '/avatars/3d/young-man-asian.webp' },
  { id: 'young-woman-black-puff', label: 'Jeune femme (Chignon afro)', path: '/avatars/3d/young-woman-black-puff.webp' },
  { id: 'young-woman-fair-brunette', label: 'Jeune femme (Brune)', path: '/avatars/3d/young-woman-fair-brunette.webp' },
  { id: 'young-man-fair-brown', label: 'Jeune homme (Châtain)', path: '/avatars/3d/young-man-fair-brown.webp' },
  { id: 'young-woman-fair-blonde', label: 'Jeune femme (Blonde)', path: '/avatars/3d/young-woman-fair-blonde.webp' },
  { id: 'young-man-fair-blond', label: 'Jeune homme (Blond)', path: '/avatars/3d/young-man-fair-blond.webp' },
  { id: 'young-woman-asian-long', label: 'Jeune femme (Asiatique)', path: '/avatars/3d/young-woman-asian-long.webp' },

  // --- 40 ANS (ADULTES) ---
  { id: 'adult-woman-asian-ponytail', label: 'Femme 40 ans (Asiatique chic)', path: '/avatars/3d/adult-woman-asian-ponytail.webp' },
  { id: 'adult-woman-fair-chestnut', label: 'Femme 40 ans (Châtain)', path: '/avatars/3d/adult-woman-fair-chestnut.webp' },
  { id: 'adult-woman-black-twists', label: 'Femme 40 ans (Tresses)', path: '/avatars/3d/adult-woman-black-twists.webp' },
  { id: 'adult-man-fair-glasses', label: 'Homme 40 ans (Lunettes & barbe)', path: '/avatars/3d/adult-man-fair-glasses.webp' },
  { id: 'adult-man-black-beard', label: 'Homme 40 ans (Noir, barbe)', path: '/avatars/3d/adult-man-black-beard.webp' },
  { id: 'adult-man-asian', label: 'Homme 40 ans (Asiatique)', path: '/avatars/3d/adult-man-asian.webp' },
  { id: 'adult-man-fair-bald', label: 'Homme 40 ans (Chauve & barbe)', path: '/avatars/3d/adult-man-fair-bald.webp' },
  { id: 'adult-woman-fair-blonde', label: 'Femme 40 ans (Blonde)', path: '/avatars/3d/adult-woman-fair-blonde.webp' },
  { id: 'adult-man-fair-curly', label: 'Homme 40 ans (Bouclé)', path: '/avatars/3d/adult-man-fair-curly.webp' },

  // --- 50 ANS (MATURES) ---
  { id: 'mature-woman-fair-auburn', label: 'Femme 50 ans (Auburn)', path: '/avatars/3d/mature-woman-fair-auburn.webp' },
  { id: 'mature-woman-black-bun', label: 'Femme 50 ans (Chignon tressé)', path: '/avatars/3d/mature-woman-black-bun.webp' },
  { id: 'mature-woman-asian-bob', label: 'Femme 50 ans (Asiatique)', path: '/avatars/3d/mature-woman-asian-bob.webp' },
  { id: 'mature-man-asian', label: 'Homme 50 ans (Asiatique)', path: '/avatars/3d/mature-man-asian.webp' },
  { id: 'mature-man-fair-grey', label: 'Homme 50 ans (Poivre & sel)', path: '/avatars/3d/mature-man-fair-grey.webp' },
  { id: 'mature-man-asian-glasses', label: 'Homme 50 ans (Lunettes)', path: '/avatars/3d/mature-man-asian-glasses.webp' },
  { id: 'mature-man-black-grey', label: 'Homme 50 ans (Noir, barbe argentée)', path: '/avatars/3d/mature-man-black-grey.webp' },
  { id: 'mature-man-fair-silver', label: 'Homme 50 ans (Argenté)', path: '/avatars/3d/mature-man-fair-silver.webp' },
  { id: 'mature-woman-black-short', label: 'Femme 50 ans (Courte argentée)', path: '/avatars/3d/mature-woman-black-short.webp' },

  // --- 60 ANS (SENIORS) ---
  { id: 'senior-woman-asian-glasses', label: 'Femme 60 ans (Asiatique)', path: '/avatars/3d/senior-woman-asian-glasses.webp' },
  { id: 'senior-man-fair-beard', label: 'Homme 60 ans (Barbe blanche)', path: '/avatars/3d/senior-man-fair-beard.webp' },
  { id: 'senior-woman-black-curls', label: 'Femme 60 ans (Boucles argentées)', path: '/avatars/3d/senior-woman-black-curls.webp' },
  { id: 'senior-man-black-goatee', label: 'Homme 60 ans (Bouc argenté)', path: '/avatars/3d/senior-man-black-goatee.webp' },
  { id: 'senior-man-asian', label: 'Homme 60 ans (Asiatique)', path: '/avatars/3d/senior-man-asian.webp' },
  { id: 'senior-woman-fair-glasses', label: 'Femme 60 ans (Lunettes rondes)', path: '/avatars/3d/senior-woman-fair-glasses.webp' },
  { id: 'senior-man-fair-glasses', label: 'Homme 60 ans (Lunettes)', path: '/avatars/3d/senior-man-fair-glasses.webp' },

  // --- FAMILLE & COMPAGNIE ---
  { id: 'baby', label: 'Bébé', path: '/avatars/3d/baby.webp' },
  { id: 'cat', label: 'Chat', path: '/avatars/3d/cat.webp' },
  { id: 'dog', label: 'Chien', path: '/avatars/3d/dog.webp' }
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
