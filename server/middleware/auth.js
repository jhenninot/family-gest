import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'familygest_jwt_secret_key_2026'

export const requireAuth = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, JWT_SECRET)
      
      const user = await User.findOne({ id: decoded.id }).select('-password')
      if (!user) {
        return res.status(401).json({ error: 'Utilisateur non trouvé ou token invalide' })
      }

      req.user = user

      // Renouvellement glissant : à chaque requête avec token valide,
      // on émet un token renouvelé qui repousse l'échéance à 30 jours à partir de cet instant
      const renewedToken = generateToken(user.id, user.email, user.isAdmin, user.isSuperAdmin)
      res.setHeader('X-Renewed-Token', renewedToken)
      res.setHeader('Access-Control-Expose-Headers', 'X-Renewed-Token')

      return next()
    } catch (error) {
      console.error('Erreur de vérification JWT', error.message)
      return res.status(401).json({ error: 'Session expirée (plus de 30 jours d\'inactivité) ou invalide' })
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé, aucun token fourni' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.isAdmin || req.user.isSuperAdmin)) {
    return next()
  } else {
    return res.status(403).json({ error: 'Action réservée aux utilisateurs administrateurs' })
  }
}

export const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.isSuperAdmin) {
    return next()
  } else {
    return res.status(403).json({ error: 'Action réservée au Super Administrateur de la plateforme' })
  }
}

export const generateToken = (userId, email, isAdmin, isSuperAdmin = false) => {
  return jwt.sign({ id: userId, email, isAdmin, isSuperAdmin }, JWT_SECRET, { expiresIn: '30d' })
}
