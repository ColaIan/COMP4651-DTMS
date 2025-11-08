import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) 
		redirect(307, '/login');
	if (locals.user.role !== 'INSTRUCTOR')
		redirect(307, '/instructor');
	return {
		availabilities: await prisma.instructorAvailability.findMany({
			where: { instructorId: locals.user.id },
			orderBy: { startTime: 'asc' }
		})
	}
};

export const actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) 
			redirect(307, '/login');
		if (locals.user.role !== 'INSTRUCTOR')
			redirect(307, '/instructor');
		const data = await request.formData();
		const startTime = new Date(data.get('startTime') as string);
		const endTime = new Date(data.get('endTime') as string);
		if (startTime >= endTime) {
			throw new Error('End time must be after start time');
		}
		await prisma.instructorAvailability.create({
			data: {
				instructorId: locals.user.id,
				startTime,
				endTime
			}
		});
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) 
			redirect(307, '/login');
		if (locals.user.role !== 'INSTRUCTOR')
			redirect(307, '/instructor');
		const data = await request.formData();
		const id = data.get('id') as string;
		await prisma.instructorAvailability.deleteMany({
			where: {
				id,
				instructorId: locals.user.id
			}
		});
	}
};