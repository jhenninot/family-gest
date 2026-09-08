import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongoServer = null

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI

    if (!mongoUri) {
      console.log('📦 Lancement d\'une instance MongoDB intégrée (In-Memory / Local)...')
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'familygest'
        }
      })
      mongoUri = mongoServer.getUri()
    }

    const conn = await mongoose.connect(mongoUri)
    console.log(`✅ MongoDB connecté avec succès : ${conn.connection.host}`)
    return conn
  } catch (error) {
    console.error(`❌ Erreur de connexion MongoDB : ${error.message}`)
    process.exit(1)
  }
}
