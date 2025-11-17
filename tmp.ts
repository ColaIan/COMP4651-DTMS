import { MSSQL_SCHEMA, parse } from '@tediousjs/connection-string';
import { config } from 'dotenv';
config();
console.log(parse(process.env.AZURE_SQL_DATABASE_URL).toSchema(MSSQL_SCHEMA).password)