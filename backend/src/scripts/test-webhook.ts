import mongoose from 'mongoose'
import { config } from '../config/index.js'
import { processIncomingMessage } from '../modules/whatsapp/whatsapp.processor.js'

async function run() {
  await mongoose.connect(config.mongodb.uri)
  console.log('Connected to DB')
  
  await processIncomingMessage(process.env.DEFAULT_ORG_ID as string, {
    waId: '919121721128',
    phone: '+919121721128',
    name: 'Test User',
    content: 'Hi from test script',
    waMessageId: 'wamid.1234567890' + Date.now(),
    timestamp: Math.floor(Date.now() / 1000)
  })
  
  console.log('Done')
  process.exit(0)
}

run().catch(console.error)
