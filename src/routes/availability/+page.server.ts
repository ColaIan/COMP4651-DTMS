import { getDb } from '$lib/server/azure/db';
import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(307, '/login');
	if (locals.user.role !== 'INSTRUCTOR') redirect(307, '/instructor');
	const rows = await getDb()
		.selectFrom('instructor_availability')
		.selectAll()
		.where('instructor_id', '=', locals.user.id)
		.orderBy('start_time', 'asc')
		.execute();

	// Map snake_case DB columns to camelCase shape expected by the UI
	const availabilities = rows.map((r) => ({
		id: r.id,
		startTime: r.start_time,
		endTime: r.end_time
	}));

	return {
		availabilities
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(307, '/login');
		if (locals.user.role !== 'INSTRUCTOR') redirect(307, '/instructor');
		const data = await request.formData();
		const startTime = new Date(data.get('startTime') as string);
		const endTime = new Date(data.get('endTime') as string);
		if (startTime >= endTime) {
			throw new Error('End time must be after start time');
		}
		await getDb()
			.insertInto('instructor_availability')
			.values({
				id: randomUUID(),
				instructor_id: locals.user.id,
				start_time: startTime,
				end_time: endTime
			})
			.execute();
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) redirect(307, '/login');
		if (locals.user.role !== 'INSTRUCTOR') redirect(307, '/instructor');
		const data = await request.formData();
		const id = data.get('id') as string;
 		await getDb()
 			.deleteFrom('instructor_availability')
 			.where('id', '=', id)
 			.where('instructor_id', '=', locals.user.id)
 			.execute();
	}
};
