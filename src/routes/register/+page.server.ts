import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(307, locals.user.role === 'INSTRUCTOR' ? '/training' : '/instructor');
	}
};