import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
// If your Prisma file is located elsewhere, you can change the path
import { getRequestEvent } from '$app/server';
import { authPlugin } from '$lib/auth-plugin';
import prisma from '$lib/prisma.server';
import { sveltekitCookies } from 'better-auth/svelte-kit';
export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: 'postgresql'
	}),
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: true
            }
        }
    },
	databaseHooks: {
		user: {
			create: {
				before: async (user, ctx) => {
					const { role, licenseNumber, licenseExpiry } = ctx!.body;
					if (role !== 'INSTRUCTOR' && role !== 'LEARNER') throw new Error('Invalid role');
					if (role === 'LEARNER') {
						if (typeof licenseNumber !== 'string' || typeof licenseExpiry !== 'string')
							throw new Error('Learner must provide license number and expiry date');
						if (new Date(licenseExpiry) < new Date())
							throw new Error('Learner license has expired');
					}
				},
				after: async (user, ctx) => {
					if (user.role === 'INSTRUCTOR') {
						await prisma.instructor.upsert({
							where: { userId: user.id },
							update: {},
							create: {
								userId: user.id
							}
						});
					} else {
						const { licenseNumber, licenseExpiry } = ctx!.body;
						await prisma.learner.upsert({
							where: { userId: user.id },
							update: {
								licenseNumber,
								licenseExpiry: new Date(licenseExpiry)
							},
							create: {
								userId: user.id,
								licenseNumber,
								licenseExpiry: new Date(licenseExpiry)
							}
						});
					}
				}
			}
		}
	},
	emailAndPassword: {
		enabled: true
	},
	plugins: [authPlugin(), sveltekitCookies(getRequestEvent)]
});
