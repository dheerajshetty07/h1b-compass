require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

console.log('DATABASE_URL:', process.env.DATABASE_URL)
console.log('Testing Prisma Client loading with datasources...')
try {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL || 'file:./prisma/dev.db'
            }
        }
    })
    console.log('Prisma Client instantiated.')

    prisma.$connect()
        .then(() => {
            console.log('Connected to DB.')
            return prisma.policyDocument.count()
        })
        .then((count) => {
            console.log('Policy count:', count)
            return prisma.$disconnect()
        })
        .catch((e) => {
            console.error('Connection failed:', e)
            process.exit(1)
        })
} catch (e) {
    console.error('Instantiation failed:', e)
}
