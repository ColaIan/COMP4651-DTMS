import { AZURE_SQL_DATABASE_URL } from "$env/static/private";
import {connect} from 'mssql';

export const getConnection = async () => {
    return await connect(AZURE_SQL_DATABASE_URL);
}
export const queryDatabase = async (query: string) => {
    const pool = await getConnection();
    const result = await pool.request().query(query);
    return result.recordset;
}