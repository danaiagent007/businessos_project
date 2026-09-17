/**
 * Seed script — populates MongoDB with realistic demo leads + customers
 * for a given organization.
 *
 * Usage:
 *   pnpm --filter backend tsx src/scripts/seed.ts <orgId>
 *
 * Get your orgId from the Clerk dashboard or from the browser's network tab
 * (look for "org_..." in any API request).
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { LeadModel } from '../modules/leads/leads.model.js'
import { CustomerModel } from '../modules/customers/customers.model.js'

const ORG_ID  = process.argv[2]
const USER_ID = process.argv[3] || 'seed_user'
if (!ORG_ID) {
  console.error('Usage: tsx src/scripts/seed.ts <orgId>')
  console.error('Your orgId looks like: org_3JRWqUdUPQPnD1sydU7GyG1EEPP')
  process.exit(1)
}

const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || ''
if (!MONGO_URI) throw new Error('MONGODB_URI not set in .env')

// ── Demo leads ─────────────────────────────────────────────────────────────
const LEADS = [
  { name: 'Arjun Mehta',       email: 'arjun@techstartup.in',  company: 'TechStartup India',      source: 'website',   status: 'new',       estimatedValue: 85000,  notes: 'Looking for CRM solution for 50-person team.' },
  { name: 'Priya Sharma',      email: 'priya@retailco.com',    company: 'Retail Co.',             source: 'manual',    status: 'contacted', estimatedValue: 42000,  notes: 'Needs inventory + customer management integration.' },
  { name: 'Rahul Verma',       email: 'rahul@fintech.io',      company: 'FinServe Solutions',     source: 'manual',    status: 'qualified', estimatedValue: 150000, notes: 'Enterprise deal — multiple departments.' },
  { name: 'Sneha Kapoor',      email: 'sneha@healthco.in',     company: 'HealthCare Plus',        source: 'manual',    status: 'new',       estimatedValue: 30000,  notes: 'Interested in patient management module.' },
  { name: 'Vikram Singh',      email: 'vikram@logistics.co',   company: 'Logistics Pro',          source: 'website',   status: 'won',       estimatedValue: 95000,  notes: 'Signed 1-year contract. Onboarding in progress.' },
  { name: 'Anjali Nair',       email: 'anjali@edtech.com',     company: 'EduTech Academy',        source: 'manual',    status: 'qualified', estimatedValue: 55000,  notes: 'Follow up after product demo on Tuesday.' },
  { name: 'Mohammed Farooq',   email: 'mfarooq@realtech.in',   company: 'RealTech Properties',    source: 'manual',    status: 'contacted', estimatedValue: 200000, notes: 'High-value prospect. VP of Operations introduced us.' },
  { name: 'Kavita Reddy',      email: 'kavita@foodchain.com',  company: 'FoodChain India',        source: 'website',   status: 'lost',      estimatedValue: 65000,  notes: 'Went with competitor. Budget concerns.' },
  { name: 'Suresh Babu',       email: 'suresh@mfg.co.in',      company: 'Precision Manufacturing',source: 'manual',    status: 'new',       estimatedValue: 120000, notes: 'Production tracking and lead management needed.' },
  { name: 'Deepika Patel',     email: 'deepika@fashion.in',    company: 'StyleCraft Fashion',     source: 'instagram', status: 'qualified', estimatedValue: 38000,  notes: 'D2C brand scaling ops. Very responsive.' },
  { name: 'Karan Malhotra',    email: 'karan@consult.io',      company: 'StratEdge Consulting',   source: 'manual',    status: 'won',       estimatedValue: 75000,  notes: 'Second deal with this client. Great relationship.' },
  { name: 'Ritu Bhatt',        email: 'ritu@ngo.org',          company: 'Green Earth NGO',        source: 'whatsapp',  status: 'contacted', estimatedValue: 15000,  notes: 'Non-profit pricing requested. Decision pending.' },
  { name: 'Nikhil Joshi',      email: 'nikhil@saasco.com',     company: 'SaaSCo',                 source: 'website',   status: 'new',       estimatedValue: 48000,  notes: 'Evaluating 3 vendors including us.' },
  { name: 'Pooja Krishnan',    email: 'pooja@agritech.in',     company: 'AgriTech Ventures',      source: 'manual',    status: 'contacted', estimatedValue: 32000,  notes: 'Met at AgriSummit 2026. Send proposal by Friday.' },
  { name: 'Rohan Desai',       email: 'rohan@insure.co',       company: 'InsurePlus',             source: 'manual',    status: 'qualified', estimatedValue: 88000,  notes: 'Compliance module is a must. Demo scheduled.' },
  { name: 'Tanya Ahuja',       email: 'tanya@media.in',        company: 'BrightMedia Agency',     source: 'instagram', status: 'won',       estimatedValue: 62000,  notes: 'Content team of 30. Expanding to 3 cities.' },
  { name: 'Aditya Kumar',      email: 'aditya@ecom.co',        company: 'QuickCart Ecommerce',    source: 'whatsapp',  status: 'new',       estimatedValue: 45000,  notes: 'Scaling from 100 to 500 orders/day.' },
  { name: 'Meera Nambiar',     email: 'meera@hospitality.in',  company: 'Horizon Hotels',         source: 'website',   status: 'lost',      estimatedValue: 110000, notes: 'Lost to price. Revisit in Q1 2027.' },
  { name: 'Siddharth Rao',     email: 'sid@autotech.in',       company: 'AutoTech Garage Chain',  source: 'whatsapp',  status: 'contacted', estimatedValue: 72000,  notes: 'Chain of 12 garages. Fleet management interest.' },
  { name: 'Ananya Chatterjee', email: 'ananya@pharma.co.in',   company: 'Pharma Insights',        source: 'manual',    status: 'qualified', estimatedValue: 180000, notes: 'Regulatory + CRM integration. Very interested.' },
]

// ── Demo customers ─────────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Vikram Singh',      email: 'vikram@logistics.co',   company: 'Logistics Pro',          industry: 'Logistics',    totalSpend: 95000,  status: 'active',   notes: 'On annual plan. Champion user.' },
  { name: 'Karan Malhotra',    email: 'karan@consult.io',      company: 'StratEdge Consulting',   industry: 'Consulting',   totalSpend: 150000, status: 'active',   notes: 'Renewed twice. Expanding team.' },
  { name: 'Tanya Ahuja',       email: 'tanya@media.in',        company: 'BrightMedia Agency',     industry: 'Media',        totalSpend: 62000,  status: 'active',   notes: '30 seats. Growing.' },
  { name: 'Priya Sharma',      email: 'priya@retailco.com',    company: 'Retail Co.',             industry: 'Retail',       totalSpend: 42000,  status: 'active',   notes: 'Upgraded to Pro plan last month.' },
  { name: 'Ananya Chatterjee', email: 'ananya@pharma.co.in',   company: 'Pharma Insights',        industry: 'Healthcare',   totalSpend: 180000, status: 'active',   notes: 'Enterprise. QBR every quarter.' },
  { name: 'Deepika Patel',     email: 'deepika@fashion.in',    company: 'StyleCraft Fashion',     industry: 'Fashion',      totalSpend: 38000,  status: 'inactive', notes: 'Paused subscription. Following up.' },
  { name: 'Rohan Desai',       email: 'rohan@insure.co',       company: 'InsurePlus',             industry: 'Insurance',    totalSpend: 88000,  status: 'active',   notes: 'Compliance module heavily used.' },
  { name: 'Kavita Reddy',      email: 'kavita@foodchain.com',  company: 'FoodChain India',        industry: 'Food & Bev',   totalSpend: 24000,  status: 'churned',  notes: 'Churned Q3 2026. Price sensitivity.' },
]

async function seed() {
  console.log(`\n🌱 Seeding for org: ${ORG_ID}\n`)

  await mongoose.connect(MONGO_URI)
  console.log('✅ MongoDB connected')

  // Scores to assign (pre-computed so we don't need API calls)
  const scores = [72, 61, 88, 45, 95, 79, 92, 20, 55, 83, 96, 38, 67, 58, 85, 91, 62, 15, 70, 88]
  const intents = ['high','medium','high','low','converted','high','high','low','medium','high','converted','low','medium','medium','high','high','medium','lost','high','high']

  // Remove existing seed data for this org (idempotent)
  await LeadModel.deleteMany({ organizationId: ORG_ID, notes: { $regex: /seed/i } })

  const now = new Date()
  const leadsToInsert = LEADS.map((l, i) => ({
    ...l,
    organizationId: ORG_ID,
    createdBy: USER_ID,
    score: scores[i] ?? 50,
    intent: intents[i] ?? 'medium',
    nextFollowupAt: l.status === 'new' || l.status === 'contacted'
      ? new Date(now.getTime() + (i + 1) * 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : undefined,
    createdAt: new Date(now.getTime() - (20 - i) * 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }))

  await LeadModel.insertMany(leadsToInsert)
  console.log(`✅ Inserted ${leadsToInsert.length} leads`)

  const customersToInsert = CUSTOMERS.map((c, i) => ({
    ...c,
    organizationId: ORG_ID,
    createdBy: USER_ID,
    phone: `+91 98765 ${String(43210 + i).padStart(5, '0')}`,
    createdAt: new Date(now.getTime() - (8 - i) * 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  }))

  await CustomerModel.insertMany(customersToInsert)
  console.log(`✅ Inserted ${customersToInsert.length} customers`)

  const totalRevenue = customersToInsert.reduce((s, c) => s + c.totalSpend, 0)
  console.log(`\n🎉 Seed complete!`)
  console.log(`   Leads:     ${leadsToInsert.length} (across all pipeline stages)`)
  console.log(`   Customers: ${customersToInsert.length}`)
  console.log(`   Revenue:   ₹${totalRevenue.toLocaleString('en-IN')}`)
  console.log(`\n   Refresh http://localhost:3000 to see your data!\n`)

  await mongoose.disconnect()
}

seed().catch(err => { console.error(err); process.exit(1) })
