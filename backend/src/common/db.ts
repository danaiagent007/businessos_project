import mongoose from 'mongoose'
import { config } from '../config/index.js'
import { logger } from './logger.js'

let connection: Promise<typeof mongoose> | undefined

export async function connectDB() {
  if (!connection) {
    connection = mongoose
      .connect(config.mongodb.uri, { serverSelectionTimeoutMS: 8000 })
      .then((m) => {
        logger.info('MongoDB connected')
        return m
      })
      .catch((error: unknown) => {
        connection = undefined
        logger.error({ error }, 'MongoDB connection failed')
        throw error
      })
  }
  await connection
}

export { mongoose }
