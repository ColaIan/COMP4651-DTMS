import {getDb} from '$lib/db.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) throw redirect(307, '/login');
	if (locals.user.role !== 'LEARNER') throw redirect(307, '/training');
	
	const instructorData = await getDb()
		.selectFrom('user')
		.leftJoin('instructor', 'instructor.user_id', 'user.id')
		.select([
			'user.id',
			'user.name',
			'user.image',
			'user.emailVerified',
			'instructor.user_id as instructor.user_id',
			'instructor.booking_leading_time as instructor.booking_leading_time'
		])
		.where('user.id', '=', params.id)
		.executeTakeFirst();
	
	if (!instructorData) {
		throw redirect(307, '/instructor');
	}
	
	const availabilities = instructorData['instructor.user_id']
		? await getDb()
				.selectFrom('instructor_availability')
				.select(['id', 'instructor_id', 'start_time', 'end_time'])
				.where('instructor_id', '=', params.id)
				.where('end_time', '>', new Date())
				.orderBy('start_time', 'asc')
				.execute()
		: [];
	
	const instructor = {
		id: instructorData.id,
		name: instructorData.name,
		image: instructorData.image,
		emailVerified: instructorData.emailVerified,
		instructor: instructorData['instructor.user_id']
			? {
					userId: instructorData['instructor.user_id'],
					bookingLeadingTime: instructorData['instructor.booking_leading_time'],
					instructorAvailabilities: availabilities.map((a) => ({
						id: a.id,
						instructorId: a.instructor_id,
						startTime: a.start_time,
						endTime: a.end_time
					}))
				}
			: null
	};
	
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
			
			await getDb().transaction().execute(async (trx) => {
				// check if start time >= now + leading time in minutes
				const leadingTime = await trx
					.selectFrom('instructor')
					.select('booking_leading_time')
					.where('user_id', '=', params.id)
					.executeTakeFirst();
				
				if (!leadingTime) {
					throw new Error('Instructor not found');
				}
				const now = new Date();
				now.setMinutes(now.getMinutes() + leadingTime.booking_leading_time);
				if (startTime < now) {
					throw new Error(
						`Start time must be at least ${leadingTime.booking_leading_time} minutes from now`
					);
				}

				// check if the requested time is within the instructor's availability
				const availability = await trx
					.selectFrom('instructor_availability')
					.selectAll()
					.where('instructor_id', '=', params.id)
					.where('start_time', '<=', startTime)
					.where('end_time', '>=', endTime)
					.executeTakeFirst();
				
				if (!availability) {
					throw new Error('Requested time is outside of instructor availability');
				}
				
				// check if the instructor has any conflicting trainings
				const conflictingTraining = await trx
					.selectFrom('training')
					.selectAll()
					.where('instructor_id', '=', params.id)
					.where('start_time', '<', endTime)
					.where('end_time', '>', startTime)
					.executeTakeFirst();
				
				if (conflictingTraining) {
					throw new Error('Instructor has a conflicting training at the requested time');
				}
				
				// check if the learner has any conflicting trainings
				const learnerConflictingTraining = await trx
					.selectFrom('training')
					.selectAll()
					.where('learner_id', '=', locals.user.id)
					.where('start_time', '<', endTime)
					.where('end_time', '>', startTime)
					.executeTakeFirst();
				
				if (learnerConflictingTraining) {
					throw new Error('You have a conflicting training at the requested time');
				}
				
				// create the training
				await trx
					.insertInto('training')
					.values({
						id: crypto.randomUUID(),
						instructor_id: params.id,
						learner_id: locals.user.id,
						start_time: startTime,
						end_time: endTime,
						updated_at: new Date()
					})
					.execute();
			});
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
		return { success: true };
	}
};
