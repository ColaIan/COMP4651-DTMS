import { env } from '$env/dynamic/private';
import { MSSQL_SCHEMA, parse } from '@tediousjs/connection-string';
import { Kysely, MssqlDialect } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import type { DB } from '../../../generated/kysely/types';

export const getDialect = ()=> new MssqlDialect({
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
						password: parse(env.AZURE_SQL_DATABASE_URL).toSchema(MSSQL_SCHEMA).password
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

let db: Kysely<DB> | undefined = undefined;
export const getDb = ()=> db ??= new Kysely<DB>({
	dialect: getDialect()
});
