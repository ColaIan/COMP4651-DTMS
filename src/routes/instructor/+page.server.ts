import db from '$lib/db.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(307, '/login');
	if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
	const instructors = await db
		.selectFrom('user')
		.select(['id', 'name'])
		.where('role', '=', 'INSTRUCTOR')
		.execute();
	return {
		instructors
	};
};
