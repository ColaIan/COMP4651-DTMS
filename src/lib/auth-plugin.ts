import type { BetterAuthPlugin } from 'better-auth';

export const authPlugin = () =>
	({
		id: 'authPlugin',
		schema: {
			// learner: {
			// 	fields: {
			// 		licenseNumber: {
			// 			type: 'string',
			// 			required: false
			// 		},
			// 		licenseExpiry: {
			// 			type: 'date',
			// 			required: false
			// 		},
			// 		licenseFile: {
			// 			type: 'string',
			// 			required: false
			// 		}
			// 	}
			// }
		}
	}) satisfies BetterAuthPlugin;
