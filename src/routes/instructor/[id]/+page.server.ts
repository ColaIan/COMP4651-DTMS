import prisma from '$lib/prisma.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(307, '/login');
	if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
	const instructor = await prisma.user.findUnique({
		where: { id: params.id },
		include: {
			instructor: {
				include: {
					instructorAvailabilities: {
						where: { endTime: { gt: new Date() } },
						orderBy: { startTime: 'asc' }
					}
				}
			}
		},
		omit: {
			email: true,
			role: true,
			createdAt: true,
			updatedAt: true
		}
	});
	await prisma.$disconnect();
	return {
		instructor
	};
};

export const actions = {
	requestTraining: async ({ request, locals, params }) => {
		if (!locals.user) throw redirect(307, '/login');
		if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
		const data = await request.formData();
		const startTime = new Date(data.get('startTime') as string);
		const endTime = new Date(data.get('endTime') as string);
		try {
			if (startTime >= endTime) {
				throw new Error('End time must be after start time');
			}
			await prisma.$transaction(async (prisma) => {
				// check if start time >= now + leading time in minutes
				const leadingTime = await prisma.instructor.findUnique({
					where: { userId: params.id },
					select: { bookingLeadingTime: true }
				});
				if (!leadingTime) {
					throw new Error('Instructor not found');
				}
				const now = new Date();
				now.setMinutes(now.getMinutes() + leadingTime.bookingLeadingTime);
				if (startTime < now) {
					throw new Error(
						`Start time must be at least ${leadingTime.bookingLeadingTime} minutes from now`
					);
				}

				// check if the requested time is within the instructor's availability
				const availability = await prisma.instructorAvailability.findFirst({
					where: {
						instructorId: params.id,
						startTime: { lte: startTime },
						endTime: { gte: endTime }
					}
				});
				if (!availability) {
					throw new Error('Requested time is outside of instructor availability');
				}
				// check if the instructor has any conflicting trainings
				const conflictingTraining = await prisma.training.findFirst({
					where: {
						instructorId: params.id,
						startTime: { lt: endTime },
						endTime: { gt: startTime }
					}
				});
				if (conflictingTraining) {
					throw new Error('Instructor has a conflicting training at the requested time');
				}
				// check if the learner has any conflicting trainings
				const learnerConflictingTraining = await prisma.training.findFirst({
					where: {
						learnerId: locals.user.id,
						startTime: { lt: endTime },
						endTime: { gt: startTime }
					}
				});
				if (learnerConflictingTraining) {
					throw new Error('You have a conflicting training at the requested time');
				}
				// create the training
				await prisma.training.create({
					data: {
						instructorId: params.id,
						learnerId: locals.user.id,
						startTime,
						endTime
					}
				});
			});
			await prisma.$disconnect();
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
		return { success: true };
	}
};
