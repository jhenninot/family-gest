import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mongoServer = null

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI
  const isProduction = process.env.NODE_ENV === 'production'

  // Si une URI explicite est fournie ou en production (ex: conteneur Docker),
  // on utilise une boucle de reconnexion et on ne bascule jamais en mémoire.
  if (mongoUri || isProduction) {
    const targetUri = mongoUri || 'mongodb://127.0.0.1:27017/familygest'
    const maxRetries = 15
    const retryDelay = 2000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Connexion à MongoDB (${targetUri}) [Tentative ${attempt}/${maxRetries}]...`)
        const conn = await mongoose.connect(targetUri, {
          serverSelectionTimeoutMS: 4000,
          dbName: 'familygest'
        })
        console.log(`✅ MongoDB connecté avec succès : ${conn.connection.host}`)
        return conn
      } catch (err) {
        console.warn(`⏳ En attente de MongoDB (${err.message})... nouvelle tentative dans ${retryDelay / 1000}s`)
        if (attempt === maxRetries) {
          console.error(`❌ Impossible de se connecter au serveur MongoDB après ${maxRetries} tentatives. Arrêt du serveur.`)
          process.exit(1)
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  // Mode développement local sans Docker (tentative locale puis fallback MongoMemoryServer)
  const defaultLocalUri = 'mongodb://127.0.0.1:27017/familygest'
  try {
    const conn = await mongoose.connect(defaultLocalUri, { serverSelectionTimeoutMS: 1500, dbName: 'familygest' })
    console.log(`✅ MongoDB connecté (Serveur Local/Atlas) : ${conn.connection.host}`)
    return conn
  } catch (err) {
    console.log('⚠️ Aucun serveur MongoDB local détecté. Lancement d\'une instance MongoDB embarquée persistante (développement)...')
    try {
      const dbDir = path.resolve(__dirname, '../data/db')
      fs.mkdirSync(dbDir, { recursive: true })

      // Clean stale lock file if previous process was killed
      const lockFile = path.join(dbDir, 'mongod.lock')
      if (fs.existsSync(lockFile)) {
        try { fs.unlinkSync(lockFile) } catch (_) {}
      }

      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'familygest',
          dbPath: dbDir,
          storageEngine: 'wiredTiger'
        }
      })
      const memoryUri = mongoServer.getUri()
      const conn = await mongoose.connect(memoryUri, { dbName: 'familygest' })
      console.log(`✅ MongoDB embarqué persistant connecté avec succès (${dbDir}) : ${conn.connection.host}`)
      return conn
    } catch (memErr) {
      console.error(`❌ Erreur d'initialisation MongoDB : ${memErr.message}`)
      process.exit(1)
    }
  }
}
