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
      return next()
    } catch (error) {
      console.error('Erreur de vérification JWT', error.message)
      return res.status(401).json({ error: 'Token non valide ou expiré' })
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé, aucun token fourni' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next()
  } else {
    return res.status(403).json({ error: 'Action réservée aux utilisateurs administrateurs' })
  }
}

export const generateToken = (userId, email, isAdmin) => {
  return jwt.sign({ id: userId, email, isAdmin }, JWT_SECRET, { expiresIn: '30d' })
}
