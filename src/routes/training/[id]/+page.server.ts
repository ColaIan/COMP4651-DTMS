import { getBlobSasUri } from '$lib/azure/blob';
import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(307, '/login');
	}
	const training = await prisma.training.findUnique({
		where: { id: params.id },
		include: {
			learner: { include: { user: { select: { name: true } } } },
			instructor: { include: { user: { select: { name: true } } } },
			scoreSheets: true
		}
	});
	// Only allow access if the user is the learner or instructor of the training
	if (
		!training ||
		(locals.user.role === 'LEARNER' && training.learner.userId !== locals.user.id) ||
		(locals.user.role === 'INSTRUCTOR' && training.instructor.userId !== locals.user.id)
	) {
		throw redirect(307, '/training');
	}
	(training.learner as unknown as { licenseUrl: string }).licenseUrl = getBlobSasUri(
		'licenses',
		training.learner.userId,
		'r'
	);
	return {
		training
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
				data
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
