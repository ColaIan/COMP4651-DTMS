import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(307, '/login');
	}
	return {
		training: await prisma.training.findUnique({
			where: { id: params.id },
			include: {
				learner: { include: { user: { select: { name: true } } } },
				instructor: { include: { user: { select: { name: true } } } },
				scoreSheets: true
			}
		})
	};
};

export const actions = {
	addScoreSheet: async ({ locals, params }) => {
		if (!locals.user) {
			throw redirect(307, '/login');
		}
		if (locals.user.role !== 'INSTRUCTOR') {
			throw redirect(307, '/training/' + params.id);
		}

		await prisma.scoreSheet.create({
			data: {
				trainingId: params.id
			}
		});

		throw redirect(303, '/training/' + params.id);
	},
	updateScoreSheet: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(307, '/login');
		}
		if (locals.user.role !== 'INSTRUCTOR') {
			throw redirect(307, '/training/' + params.id);
		}

		const formData = await request.formData();
		const scoreSheetId = formData.get('scoreSheetId') as string;
		const data = formData.get('data') as string;

		await prisma.scoreSheet.update({
			where: { id: scoreSheetId },
			data: {
				data: JSON.parse(data)
			}
		});

		throw redirect(303, '/training/' + params.id);
	},
	deleteScoreSheet: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(307, '/login');
		}
		if (locals.user.role !== 'INSTRUCTOR') {
			throw redirect(307, '/training/' + params.id);
		}

		const formData = await request.formData();
		const scoreSheetId = formData.get('scoreSheetId') as string;

		await prisma.scoreSheet.delete({
			where: { id: scoreSheetId }
		});

		throw redirect(303, '/training/' + params.id);
	}
};