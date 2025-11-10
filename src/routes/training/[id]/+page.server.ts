import { getBlobExists, getBlobSasUri } from '$lib/azure/blob';
import { getTrainingGroupUrl, sendTrainingMessage } from '$lib/azure/web-pubsub';
import { getDb } from '$lib/db.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(307, '/login');
	}
	const trainingRow = await getDb()
		.selectFrom('training')
		.selectAll()
		.where('id', '=', params.id)
		.executeTakeFirst();

	// gather related data (learner user, instructor user, score sheets)
	const learner = trainingRow
		? await getDb()
				.selectFrom('learner')
				.select(['license_number', 'license_expiry'])
				.where('user_id', '=', trainingRow.learner_id)
				.executeTakeFirst()
		: null;
	const learnerUser = trainingRow
		? await getDb()
				.selectFrom('user')
				.select(['id', 'name'])
				.where('id', '=', trainingRow.learner_id)
				.executeTakeFirst()
		: null;
	const instructorUser = trainingRow
		? await getDb()
				.selectFrom('user')
				.select(['id', 'name'])
				.where('id', '=', trainingRow.instructor_id)
				.executeTakeFirst()
		: null;
	const scoreSheetsRaw = await getDb()
		.selectFrom('score_sheet')
		.selectAll()
		.where('training_id', '=', params.id)
		.execute();
	// Only allow access if the user is the learner or instructor of the training
	if (!trainingRow) throw redirect(307, '/training');

	const training = {
		id: trainingRow.id,
		instructorId: trainingRow.instructor_id,
		learnerId: trainingRow.learner_id,
		startTime: trainingRow.start_time,
		endTime: trainingRow.end_time,
		status: trainingRow.status,
		createdAt: trainingRow.created_at,
		updatedAt: trainingRow.updated_at,
		learner: {
			userId: trainingRow.learner_id,
			licenseNumber: learner?.license_number,
			licenseExpiry: learner?.license_expiry,
			user: { name: learnerUser?.name }
		},
		instructor: { userId: trainingRow.instructor_id, user: { name: instructorUser?.name } },
		scoreSheets: scoreSheetsRaw.map((x) => ({
			id: x.id,
			trainingId: x.training_id,
			data: JSON.parse(x.data),
			createdAt: x.created_at,
			updatedAt: x.updated_at
		}))
	};

	if (
		(locals.user.role === 'LEARNER' && training.learner.userId !== locals.user.id) ||
		(locals.user.role === 'INSTRUCTOR' && training.instructor.userId !== locals.user.id)
	) {
		throw redirect(307, '/training');
	}

	if (await getBlobExists('licenses', training.learner.userId))
		(training.learner as unknown as { licenseUrl: string }).licenseUrl = getBlobSasUri(
			'licenses',
			training.learner.userId,
			'r'
		);

	return {
		training,
		trainingPubSubUrl: await getTrainingGroupUrl(params.id)
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
		const scoreSheet = {
			id: crypto.randomUUID(),
			training_id: params.id,
			data: '{}',
			updated_at: new Date()
		};
		await getDb().insertInto('score_sheet').values(scoreSheet).execute();
		await sendTrainingMessage(params.id, {
			type: 'addScoreSheet',
			scoreSheetId: scoreSheet.id,
			data: JSON.parse(scoreSheet.data)
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
		await sendTrainingMessage(params.id, {
			type: 'updateScoreSheet',
			scoreSheetId,
			data: JSON.parse(data)
		});
		await getDb().updateTable('score_sheet').set({ data }).where('id', '=', scoreSheetId).execute();
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
		await getDb().deleteFrom('score_sheet').where('id', '=', scoreSheetId).execute();
		await sendTrainingMessage(params.id, { type: 'deleteScoreSheet', scoreSheetId });
		throw redirect(303, '/training/' + params.id);
	}
};
