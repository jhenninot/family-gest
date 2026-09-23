import crypto from 'crypto'

const ENC_PREFIX = 'enc:v1:'

// Clé dérivée de JWT_SECRET (déjà présent dans tous les déploiements, voir compose.yaml) : évite
// d'imposer une nouvelle variable d'environnement dédiée au chiffrement des secrets stockés.
const getEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'familygest_secret_jwt_key_2026_change_in_production')
  .digest()

// Chiffrement des secrets au repos (AES-256-GCM), utilisé comme setter/getter Mongoose (mot de passe
// SMTP plateforme, jeton d'API Mealie). Le getter reconnaît aussi les valeurs historiques stockées
// en clair (avant l'introduction du chiffrement) et les renvoie telles quelles ; elles seront
// rechiffrées à la prochaine sauvegarde.
export const encryptSecret = (plainText) => {
  if (!plainText) return plainText
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return ENC_PREFIX + [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

export const decryptSecret = (storedValue) => {
  if (!storedValue || !storedValue.startsWith(ENC_PREFIX)) return storedValue
  try {
    const [ivHex, authTagHex, dataHex] = storedValue.slice(ENC_PREFIX.length).split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
  } catch (err) {
    console.error('[secretCrypto] Erreur déchiffrement secret:', err.message)
    return ''
  }
}
