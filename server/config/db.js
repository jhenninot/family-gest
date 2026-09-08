import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mongoServer = null

export const connectDB = async () => {
  const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/familygest'

  try {
    // Attempt local MongoDB connection first (1.5s timeout)
    const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 1500, dbName: 'familygest' })
    console.log(`✅ MongoDB connecté (Serveur Local/Atlas) : ${conn.connection.host}`)
    return conn
  } catch (err) {
    console.log('⚠️ Aucun serveur MongoDB local détecté. Lancement d\'une instance MongoDB embarquée persistance...')
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
