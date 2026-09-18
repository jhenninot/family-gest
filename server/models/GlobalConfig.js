import mongoose from 'mongoose'
import crypto from 'crypto'

const ENC_PREFIX = 'enc:v1:'

// Clé dérivée de JWT_SECRET (déjà présent dans tous les déploiements, voir compose.yaml) : évite
// d'imposer une nouvelle variable d'environnement dédiée au chiffrement du mot de passe SMTP.
const getEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'familygest_secret_jwt_key_2026_change_in_production')
  .digest()

// Chiffrement du mot de passe SMTP plateforme au repos (AES-256-GCM). Le getter reconnaît aussi
// les valeurs historiques stockées en clair (avant l'introduction du chiffrement) et les renvoie
// telles quelles ; elles seront rechiffrées à la prochaine sauvegarde de la config SMTP.
const encryptSecret = (plainText) => {
  if (!plainText) return plainText
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return ENC_PREFIX + [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

const decryptSecret = (storedValue) => {
  if (!storedValue || !storedValue.startsWith(ENC_PREFIX)) return storedValue
  try {
    const [ivHex, authTagHex, dataHex] = storedValue.slice(ENC_PREFIX.length).split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
  } catch (err) {
    console.error('[GlobalConfig] Erreur déchiffrement mot de passe SMTP:', err.message)
    return ''
  }
}

// Modèles pré-remplis (RGPD) : les sections factuelles reflètent le fonctionnement réel de
// l'application ; les champs entre crochets identifient le responsable de traitement et doivent
// être complétés par le Super Administrateur avant toute ouverture à d'autres foyers.
export const DEFAULT_LEGAL_NOTICE = `MENTIONS LÉGALES

Édité par : [Nom, prénom ou raison sociale du responsable de traitement — à compléter]
Adresse postale : [Adresse — à compléter]
Contact : [Adresse email de contact — à compléter]

Hébergement :
Cette application est auto-hébergée par l'éditeur mentionné ci-dessus (ou son hébergeur d'infrastructure, à préciser si différent), sur un serveur/conteneur Docker dédié.

Directeur de la publication : [Nom — à compléter]

⚠️ Ce texte est un modèle. Le Super Administrateur doit compléter les champs entre crochets depuis cette page avant toute mise à disposition d'autres foyers que le sien.`

export const DEFAULT_PRIVACY_POLICY = `POLITIQUE DE CONFIDENTIALITÉ

Dernière mise à jour : [date — à compléter]

1. Responsable du traitement
[Identité et coordonnées du responsable de traitement — voir les Mentions légales]

2. Données collectées
- Données de compte : nom, prénom, email, mot de passe (chiffré), avatar (emoji ou photo importée), couleur de profil, rôle familial, préférences de notification.
- Données d'activité familiale : tâches, événements de calendrier, listes de courses, présences/absences, invités aux repas, points de récompense — rattachées à votre foyer.
- Données techniques : abonnements aux notifications push (navigateur), journal des alertes envoyées (email/push), conservé 90 jours puis supprimé automatiquement.

3. Finalités
Ces données sont utilisées exclusivement pour vous authentifier, faire fonctionner les outils de gestion familiale (tâches, calendrier, courses, présences, repas), et vous envoyer les notifications et le récapitulatif quotidien que vous avez choisi de recevoir.

4. Base légale
Exécution du contrat lié à votre adhésion à un foyer, et consentement explicite pour les notifications (modifiable à tout moment dans votre profil).

5. Destinataires des données
Vos données ne sont visibles que par les membres de votre foyer et, pour l'administration de la plateforme, par le Super Administrateur. Elles ne sont jamais vendues ni transmises à des tiers à des fins commerciales. Un prestataire technique d'envoi d'email (fournisseur SMTP configuré par le Super Administrateur) peut traiter votre adresse email pour cette seule finalité : [nom du fournisseur SMTP utilisé — à compléter].

6. Durée de conservation
- Compte et données familiales : conservées tant que le compte existe.
- Journal des alertes : purgé automatiquement après 90 jours.
- Abonnements push : supprimés automatiquement en cas d'expiration ou de désabonnement.

7. Vos droits
Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation du traitement. Depuis votre profil, vous pouvez à tout moment exporter l'intégralité de vos données personnelles ou supprimer définitivement votre compte. Pour toute autre demande, contactez le responsable de traitement (coordonnées en Mentions légales). Vous disposez aussi du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).

8. Mineurs
Si un membre de votre foyer mineur dispose de son propre compte, il appartient au titulaire de l'autorité parentale de consentir à sa création et à l'usage de l'application.

9. Sécurité
Les mots de passe sont chiffrés (bcrypt) et ne sont jamais stockés ni exportés en clair. Les identifiants d'envoi d'email de la plateforme sont chiffrés au repos. Les données de chaque foyer sont cloisonnées des autres foyers de la plateforme.

⚠️ Ce texte est un modèle généré à partir du fonctionnement réel de l'application. Le Super Administrateur doit compléter les champs entre crochets depuis cette page avant publication.`

const globalConfigSchema = new mongoose.Schema({
  serverUrl: {
    type: String,
    default: 'http://localhost:5173',
    trim: true
  },
  providerPreset: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'resend', 'brevo-smtp', 'brevo-api', 'custom'],
    default: 'gmail'
  },
  host: {
    type: String,
    default: 'smtp.gmail.com'
  },
  port: {
    type: Number,
    default: 587
  },
  secure: {
    type: Boolean,
    default: false
  },
  user: {
    type: String,
    default: ''
  },
  pass: {
    type: String,
    default: '',
    set: encryptSecret,
    get: decryptSecret
  },
  fromEmail: {
    type: String,
    default: ''
  },
  fromName: {
    type: String,
    default: 'FamilyGest Platform'
  },
  isConfigured: {
    type: Boolean,
    default: false
  },
  // Planification du récapitulatif quotidien (heure locale, fuseau applicatif fixe — voir
  // server/digest/). Modifiable par le Super Administrateur sans redémarrage du serveur.
  digestHour: {
    type: Number,
    min: 0,
    max: 23,
    default: 8
  },
  digestMinute: {
    type: Number,
    min: 0,
    max: 59,
    default: 0
  },
  // Garde-fou anti-double-envoi (persisté pour survivre à un redémarrage) : date (YYYY-MM-DD)
  // du dernier récapitulatif déjà envoyé.
  lastDigestRunDate: {
    type: String,
    default: null
  },
  // Contenu légal (RGPD) édité par le Super Administrateur, affiché publiquement sur
  // /mentions-legales et /confidentialite (texte brut, mis en forme via white-space: pre-wrap).
  legalNotice: {
    type: String,
    default: DEFAULT_LEGAL_NOTICE
  },
  privacyPolicy: {
    type: String,
    default: DEFAULT_PRIVACY_POLICY
  }
}, { timestamps: true })

export default mongoose.model('GlobalConfig', globalConfigSchema)
