import { getRequestEvent } from '$app/server';
import { AZURE_ENTRA_ID_CLIENT_ID, AZURE_ENTRA_ID_CLIENT_SECRET } from '$env/static/private';
import { authPlugin } from '$lib/auth-plugin';
import { blobServiceClient } from '$lib/azure/blob';
import prisma from '$lib/prisma.server';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
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
					const { role, licenseFile, licenseNumber, licenseExpiry } = ctx!.body;
					if (role !== 'INSTRUCTOR' && role !== 'LEARNER') throw new Error('Invalid role');
					if (role === 'LEARNER') {
						if (typeof licenseFile !== 'string' || typeof licenseNumber !== 'string' || typeof licenseExpiry !== 'string')
							throw new Error('Learner must provide license file, number and expiry date');
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
						const { licenseFile, licenseNumber, licenseExpiry } = ctx!.body;
						await blobServiceClient.getContainerClient('licenses').getBlockBlobClient(user.id).uploadData(Buffer.from(licenseFile.substring(licenseFile.indexOf(',') + 1), 'base64'), {
							blobHTTPHeaders: { blobContentType: 'image/png' }
						});
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
    socialProviders: {
        microsoft: { 
            clientId: AZURE_ENTRA_ID_CLIENT_ID, 
            clientSecret: AZURE_ENTRA_ID_CLIENT_SECRET, 
            tenantId: 'common', 
            authority: "https://login.microsoftonline.com", // Authentication authority URL
            prompt: "select_account", // Forces account selection
        }, 
    },
	plugins: [authPlugin(), sveltekitCookies(getRequestEvent)]
});
