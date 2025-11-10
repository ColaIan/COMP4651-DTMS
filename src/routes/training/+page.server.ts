import {getDb} from '$lib/db.server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(307, '/login');
	
	const userId = locals.user.id;
	const isInstructor = locals.user.role === 'INSTRUCTOR';
	
	const trainings = await getDb()
		.selectFrom('training')
		.innerJoin('user as learner_user', 'training.learner_id', 'learner_user.id')
		.innerJoin('learner', 'learner.user_id', 'learner_user.id')
		.innerJoin('user as instructor_user', 'training.instructor_id', 'instructor_user.id')
		.innerJoin('instructor', 'instructor.user_id', 'instructor_user.id')
		.select([
			'training.id',
			'training.instructor_id',
			'training.learner_id',
			'training.start_time',
			'training.end_time',
			'training.status',
			'training.created_at',
			'training.updated_at',
			'learner_user.id as learner.user.id',
			'learner_user.name as learner.user.name',
			'learner_user.email as learner.user.email',
			'learner_user.emailVerified as learner.user.emailVerified',
			'learner_user.image as learner.user.image',
			'learner_user.role as learner.user.role',
			'learner_user.createdAt as learner.user.createdAt',
			'learner_user.updatedAt as learner.user.updatedAt',
			'learner.user_id as learner.user_id',
			'learner.license_number as learner.license_number',
			'learner.license_expiry as learner.license_expiry',
			'instructor_user.name as instructor.user.name',
			'instructor.user_id as instructor.user_id',
			'instructor.booking_leading_time as instructor.booking_leading_time'
		])
		.where(isInstructor ? 'training.instructor_id' : 'training.learner_id', '=', userId)
		.orderBy('training.start_time', 'desc')
		.execute();
	
	// Transform the flat result into nested structure
	const transformedTrainings = trainings.map((t) => ({
		id: t.id,
		instructorId: t.instructor_id,
		learnerId: t.learner_id,
		startTime: t.start_time,
		endTime: t.end_time,
		status: t.status,
		createdAt: t.created_at,
		updatedAt: t.updated_at,
		learner: {
			userId: t['learner.user_id'],
			licenseNumber: t['learner.license_number'],
			licenseExpiry: t['learner.license_expiry'],
			user: {
				id: t['learner.user.id'],
				name: t['learner.user.name'],
				email: t['learner.user.email'],
				emailVerified: t['learner.user.emailVerified'],
				image: t['learner.user.image'],
				role: t['learner.user.role'],
				createdAt: t['learner.user.createdAt'],
				updatedAt: t['learner.user.updatedAt']
			}
		},
		instructor: {
			userId: t['instructor.user_id'],
			bookingLeadingTime: t['instructor.booking_leading_time'],
			user: {
				name: t['instructor.user.name']
			}
		}
	}));
	
	return { trainings: transformedTrainings };
};
