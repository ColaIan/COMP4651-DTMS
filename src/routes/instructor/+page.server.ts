import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(307, '/login');
	if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
	const instructors = await prisma.user.findMany({
		where: { role: 'INSTRUCTOR' },
		select: {
			id: true,
			name: true
		}
	});
	await prisma.$disconnect();
	return {
		instructors
	};
};
