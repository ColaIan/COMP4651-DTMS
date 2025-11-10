import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(307, '/login');
	const trainings =
		locals.user.role === 'INSTRUCTOR'
			? await prisma.training.findMany({
					where: { instructorId: locals.user.id },
					orderBy: { startTime: 'desc' },
					include: {
						learner: { include: { user: true } },
						instructor: { include: { user: { select: { name: true } } } }
					}
				})
			: await prisma.training.findMany({
					where: { learnerId: locals.user.id },
					orderBy: { startTime: 'desc' },
					include: {
						learner: { include: { user: true } },
						instructor: { include: { user: { select: { name: true } } } }
					}
				});
	await prisma.$disconnect();
	return { trainings };
};
