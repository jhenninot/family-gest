import User from './models/User.js'

export const DEFAULT_USERS = [
  {
    id: 1,
    firstName: 'Admin',
    lastName: 'FamilyGest',
    email: 'admin@family-gest.org',
    password: 'Admin1234!',
    isAdmin: true,
    isSuperAdmin: true,
    role: 'Administrateur',
    avatar: '👨‍💼',
    color: '#6366f1',
    points: 200
  }
]

export const seedDatabaseIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments()
    // Si la base de données contient déjà un ou plusieurs utilisateurs, ne rien toucher !
    if (userCount > 0) {
      return
    }

    console.log('🌱 Base de données vide : création du compte super-administrateur initial...')
    const defaultAdmin = DEFAULT_USERS[0]
    const newUser = new User(defaultAdmin)
    await newUser.save()
    console.log(`✅ Compte Super-Administrateur initial créé : ${defaultAdmin.email}`)
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données', error)
  }
}

