import User from './models/User.js'
import Task from './models/Task.js'
import Event from './models/Event.js'
import Expense from './models/Expense.js'
import ShoppingItem from './models/ShoppingItem.js'

export const seedDatabaseIfEmpty = async () => {
  try {
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      console.log('🌱 Création de l\'utilisateur Administrateur par défaut (admin@family-gest.org)...')

      // Create Admin User
      const adminUser = new User({
        id: 1,
        firstName: 'Admin',
        lastName: 'FamilyGest',
        email: 'admin@family-gest.org',
        password: 'Admin123!',
        isAdmin: true,
        role: 'Administrateur',
        avatar: '👨‍💼',
        color: '#6366f1',
        points: 200
      })
      await adminUser.save()

      // Create Initial Family Users
      const userSophie = new User({
        id: 2,
        firstName: 'Sophie',
        lastName: 'Martin',
        email: 'sophie@family-gest.org',
        password: 'Family123!',
        isAdmin: false,
        role: 'Maman',
        avatar: '👩‍⚕️',
        color: '#ec4899',
        points: 145
      })
      await userSophie.save()

      const userLucas = new User({
        id: 3,
        firstName: 'Lucas',
        lastName: 'Martin',
        email: 'lucas@family-gest.org',
        password: 'Family123!',
        isAdmin: false,
        role: 'Fils (12 ans)',
        avatar: '👦',
        color: '#10b981',
        points: 75
      })
      await userLucas.save()

      const userEmma = new User({
        id: 4,
        firstName: 'Emma',
        lastName: 'Martin',
        email: 'emma@family-gest.org',
        password: 'Family123!',
        isAdmin: false,
        role: 'Fille (8 ans)',
        avatar: '👧',
        color: '#f59e0b',
        points: 90
      })
      await userEmma.save()

      // Seed Tasks
      await Task.insertMany([
        { id: 101, title: 'Sortir les poubelles (Tri & Ordures)', category: 'Maison', assignedTo: 3, priority: 'Haute', points: 15, completed: false, dueDate: '2026-09-09' },
        { id: 102, title: 'Vider et ranger le lave-vaisselle', category: 'Cuisine', assignedTo: 4, priority: 'Moyenne', points: 10, completed: true, dueDate: '2026-09-08' },
        { id: 103, title: 'Préparer les repas de la semaine (Batch Cooking)', category: 'Cuisine', assignedTo: 2, priority: 'Haute', points: 30, completed: false, dueDate: '2026-09-10' },
        { id: 104, title: 'Tondre le gazon et arrosage du jardin', category: 'Jardin', assignedTo: 1, priority: 'Basse', points: 25, completed: false, dueDate: '2026-09-12' },
        { id: 105, title: 'Ranger la chambre et faire le lit', category: 'Chambre', assignedTo: 3, priority: 'Moyenne', points: 15, completed: true, dueDate: '2026-09-08' }
      ])

      // Seed Events
      await Event.insertMany([
        { id: 201, title: 'Anniversaire de Lucas 🎉', date: '2026-09-15', time: '15:00', category: 'Fête', location: 'Maison', color: '#8b5cf6', assignedTo: 3 },
        { id: 202, title: 'Rendez-vous Dentiste Emma', date: '2026-09-18', time: '10:30', category: 'Santé', location: 'Cabinet Dr. Martin', color: '#06b6d4', assignedTo: 4 },
        { id: 203, title: 'Dîner chez les grands-parents', date: '2026-09-20', time: '19:30', category: 'Famille', location: 'Bordeaux', color: '#ec4899', assignedTo: 1 },
        { id: 204, title: 'Réunion de rentrée scolaire', date: '2026-09-22', time: '18:00', category: 'Scolaire', location: 'Collège St-Exupéry', color: '#f59e0b', assignedTo: 2 }
      ])

      // Seed Expenses
      await Expense.insertMany([
        { id: 301, title: 'Courses Hebdomadaires Carrefour', amount: 142.80, payerId: 2, category: 'Alimentation', date: '2026-09-06' },
        { id: 302, title: 'Facture Électricité EDF', amount: 118.50, payerId: 1, category: 'Logement & Énergie', date: '2026-09-04' },
        { id: 303, title: 'Cotisation Judo Lucas', amount: 85.00, payerId: 1, category: 'Activités & Sports', date: '2026-09-02' },
        { id: 304, title: 'Abonnement Netflix + Disney+', amount: 23.98, payerId: 2, category: 'Loisirs', date: '2026-09-01' }
      ])

      // Seed Shopping
      await ShoppingItem.insertMany([
        { id: 401, name: 'Lait demi-écrémé (6x1L)', category: 'Frais', quantity: 1, urgent: false, checked: false },
        { id: 402, name: 'Pain de mie complet', category: 'Boulangerie', quantity: 2, urgent: true, checked: false },
        { id: 403, name: 'Pommes Bio Gala', category: 'Fruits & Légumes', quantity: 1.5, urgent: false, checked: true },
        { id: 404, name: 'Café Arabica en grains', category: 'Épicerie', quantity: 1, urgent: true, checked: false },
        { id: 405, name: 'Lessive écologique', category: 'Maison', quantity: 1, urgent: false, checked: false }
      ])

      console.log('✅ Administrateur (admin@family-gest.org) et base de données initialisés avec succès.')
    }
  } catch (error) {
    console.error('Erreur lors du pré-remplissage de la base de données', error)
  }
}
