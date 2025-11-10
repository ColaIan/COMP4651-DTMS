import { AZURE_SQL_DATABASE_URL } from '$env/static/private';
import { MSSQL_SCHEMA, parse } from '@tediousjs/connection-string';
import { Kysely, MssqlDialect } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import type { DB } from '../generated/kysely/types';

const password = parse(AZURE_SQL_DATABASE_URL).toSchema(MSSQL_SCHEMA).password;
export const dialect = new MssqlDialect({
	tarn: {
		...Tarn,
		options: {
			min: 0,
			max: 10
		}
	},
	tedious: {
		...Tedious,
		connectionFactory: () =>
			new Tedious.Connection({
				authentication: {
					options: {
						userName: 'comp4651dtms',
						password: password
					},
					type: 'default'
				},
				options: {
					database: 'comp4651dtms',
					port: 1433,
					trustServerCertificate: true
				},
				server: 'comp4651dtms.database.windows.net'
			})
	}
});

export const db = new Kysely<DB>({
	dialect
});

export default db;
