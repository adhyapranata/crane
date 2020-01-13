import Database from './Database'

export default class RNSQLiteConnection {
  /**
   *
   * @param driver
   * @param name
   * @param location
   * @param createFromLocation
   * @returns {Database}
   */
  static connect ({ driver, name, location, createFromLocation }) {
    return driver.openDatabase({ name, location, createFromLocation })
  }

  /**
   *
   * @param sql
   * @param params
   * @param resolve
   * @param reject
   * @returns {*}
   */
  get ({ sql, params, resolve, reject }) {
    return this.executeSql(
      sql, params,
      resolve || (res => res[0].rows),
      reject || (errors => {
        throw errors
      }))
  }

  /**
   *
   * @param sql
   * @param params
   * @returns {*}
   */
  first ({ sql, params }) {
    const resolve = res => res[0].rows[0]
    return this.get({ sql, params, resolve })
  }

  /**
   *
   * @param sql
   * @param params
   * @param resolve
   * @param reject
   * @returns {Promise<unknown>}
   */
  executeSql (sql, params, resolve, reject) {
    console.tron.log('sql, params, resolve, reject', {sql, params, resolve, reject});
    return this.executeBulkSql([sql], [params])
      .then(res => resolve(res))
      .catch(errors => reject(errors))
  }

  /**
   *
   * @param sqls
   * @param params
   * @returns {Promise<unknown>}
   */
  executeBulkSql (sqls, params = []) {
    return new Promise((resolve, reject) => {
      Database.database.transaction(tx => {
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
