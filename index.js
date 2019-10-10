import Builder from './src/Builder'
import DB from './src/Database'
let QueryBuilder = 'Database is not yet configured'

export const initializeBuilder = function () {
  QueryBuilder = new Builder()
}

export const Database = DB
export default QueryBuilder
