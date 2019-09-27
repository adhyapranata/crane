export default class SQLiteConnection {
  static addConnection (database) {
    this.database = database
  }

  get ({ sql, params }) {
    return this.executeSql(
      sql, params,
      res => res[0].rows,
      errors => {
        throw errors
      })
  }

  first ({ sql, params }) {
    return this.executeSql(
      sql, params,
      res => res[0].rows[0],
      errors => {
        throw errors
      })
  }

  executeSql (sql, params, resolve, reject) {
    return this.executeBulkSql([sql], [params])
      .then(res => resolve(res))
      .catch(errors => reject(errors))
  }

  executeBulkSql (sqls, params = []) {
    return new Promise((resolve, reject) => {
      SQLiteConnection.database.transaction(tx => {
        Promise.all(sqls.map((sql, index) => {
          return new Promise((resolve, reject) => {
            tx.executeSql(
              sql,
              params[index],
              (_, { rows, insertId }) => {
                resolve({ rows: rows.raw(), insertId })
              },
              reject
            )
          })
        })).then(resolve).catch(reject)
      })
    })
  }
}
