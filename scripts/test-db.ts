
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

console.log('DATABASE_URL:', process.env.DATABASE_URL)

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
})

async function main() {
    console.log('Connecting to Prisma...')
    await prisma.$connect()
    console.log('Connected successfully!')
    const count = await prisma.policyDocument.count()
    console.log('Policy Document Count:', count)
}

main()
    .catch((e) => {
        console.error('Error:', e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
