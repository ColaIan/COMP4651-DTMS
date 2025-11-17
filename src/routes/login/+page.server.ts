import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { MSSQL_SCHEMA, parse } from '@tediousjs/connection-string';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) {
		redirect(307, locals.user.role === 'INSTRUCTOR' ? '/training' : '/instructor');
	}
	console.log(parse(env.AZURE_SQL_DATABASE_URL).toSchema(MSSQL_SCHEMA).password)
	
};
