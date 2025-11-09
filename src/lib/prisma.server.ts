import { env } from '$env/dynamic/private';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({
	datasourceUrl: env.DATABASE_URL
	// datasourceUrl: env.AZURE_SQL_DATABASE_URL
});

export default prisma;