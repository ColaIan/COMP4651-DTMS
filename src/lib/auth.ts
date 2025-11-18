import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { authPlugin } from '$lib/auth-plugin';
import { getDb, getDialect } from '$lib/server/azure/db';
import { getBlobExists, getBlobServiceClient } from '$lib/server/azure/blob';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';

export const auth = betterAuth({
	basePath: '/auth',
	database: { dialect: getDialect(), type: 'mssql' },
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
						if (
							typeof licenseFile !== 'string' ||
							typeof licenseNumber !== 'string' ||
							typeof licenseExpiry !== 'string'
						)
							throw new Error('Learner must provide license file, number and expiry date');
						if (new Date(licenseExpiry) < new Date())
							throw new Error('Learner license has expired');
					}
				},
				after: async (user, ctx) => {
					try {
						if (user.role === 'INSTRUCTOR') {
							// Insert instructor row if it doesn't already exist.
							await getDb()
								.insertInto('instructor')
								.values({ user_id: user.id, booking_leading_time: 0 })
								// .onConflict((oc) => oc.column('user_id').doNothing())
								.execute();
						} else {
							const { licenseFile, licenseNumber, licenseExpiry } = ctx!.body;
							await getBlobServiceClient()
								.getContainerClient('licenses')
								.getBlockBlobClient(user.id)
								.uploadData(
									Buffer.from(licenseFile.substring(licenseFile.indexOf(',') + 1), 'base64'),
									{
										blobHTTPHeaders: { blobContentType: 'image/png' }
									}
								);
							await getDb()
								.insertInto('learner')
								.values({ user_id: user.id, license_number: licenseNumber, license_expiry: new Date(licenseExpiry) })
								// .onConflict((oc) =>
								// 	oc.column('user_id').doUpdateSet({ license_number: licenseNumber, license_expiry: new Date(licenseExpiry) })
								// )
								.execute();
						}
					} catch (e) {
						console.error('Error creating user related data, reverting user creation', e);
						if (user.role === 'LEARNER' && (await getBlobExists('licenses', user.id))) {
							const blobClient = getBlobServiceClient()
								.getContainerClient('licenses')
								.getBlockBlobClient(user.id);
							await blobClient.delete();
						}
						await getDb().deleteFrom('user').where('id', '=', user.id).execute();
						throw new Error('Error creating user related data, reverting user creation');
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
			clientId: env.AZURE_ENTRA_ID_CLIENT_ID,
			clientSecret: env.AZURE_ENTRA_ID_CLIENT_SECRET,
			tenantId: 'common',
			authority: 'https://login.microsoftonline.com', // Authentication authority URL
			prompt: 'select_account' // Forces account selection
		}
	},
	plugins: [authPlugin(), sveltekitCookies(getRequestEvent)]
});
