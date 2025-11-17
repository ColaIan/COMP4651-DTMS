import { getDb } from '$lib/server/azure/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(307, '/login');
	if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
	const instructors = await getDb()
		.selectFrom('user')
		.select(['id', 'name'])
		.where('role', '=', 'INSTRUCTOR')
		.execute();
	return {
		instructors
	};
};
