import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer = null

export const connectDB = async () => {
  const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/familygest'

  try {
    // Attempt local MongoDB connection first (1.5s timeout)
    const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 1500 })
    console.log(`✅ MongoDB connecté (Serveur Local/Atlas) : ${conn.connection.host}`)
    return conn
  } catch (err) {
    console.log('⚠️ Aucun serveur MongoDB local détecté. Lancement d\'une instance MongoDB embarquée...')
    try {
      mongoServer = await MongoMemoryServer.create({
        instance: { dbName: 'familygest' }
      })
      const memoryUri = mongoServer.getUri()
      const conn = await mongoose.connect(memoryUri)
      console.log(`✅ MongoDB embarqué connecté avec succès : ${conn.connection.host}`)
      return conn
    } catch (memErr) {
      console.error(`❌ Erreur d'initialisation MongoDB : ${memErr.message}`)
      process.exit(1)
    }
  }
}
