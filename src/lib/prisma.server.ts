import { env } from '$env/dynamic/private';
import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({
	datasourceUrl: env.DATABASE_URL
});

export default prisma;