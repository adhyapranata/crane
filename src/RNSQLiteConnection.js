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
    const db = driver.openDatabase({ name, location, createFromLocation })

    db.exec([{ sql: 'PRAGMA foreign_keys = ON;', args: [] }], false, () =>
      console.log('Foreign keys turned on')
    )

    return db
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  get (props) {
    const resolve = res => res[0].rows
    return this.run({...props, resolve})
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  insert (props) {
    return this.run(props)
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  processInsertGetId (props) {
    const resolve = res => res[0].insertId
    return this.run({...props, resolve})
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  affectingStatement (props) {
    return this.run(props)
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  update (props) {
    return this.run(props)
  }

  /**
   *
   * @param props
   * @returns {*}
   */
  delete (props) {
    return this.run(props)
  }

  /**
   *
   * @param sqls
   * @param params
   * @returns {Promise<unknown>}
   */
  statement ({sqls, params}) {
    return this.executeBulkSql(sqls, params)
  }

  /**
   *
   * @param sql
   * @param params
   * @param resolve
   * @param reject
   * @returns {*}
   */
  run ({ sql, params, resolve, reject }) {
    return this.executeSql(
      sql, params,
      resolve || (res => res),
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
    return new Promise((txResolve, txReject) => {
      Database.database.transaction(tx => {
        Promise.all(sqls.map((sql, index) => {
          return new Promise((sqlResolve, sqlReject) => {
            tx.executeSql(
              sql,
              params[index],
              (_, { rows, insertId }) => {
                sqlResolve({ rows: rows.raw(), insertId })
              },
              (err, message) => {
                sqlReject({err, message})
              }
            )
          })
        })).then(txResolve).catch(txReject)
      })
    })
  }
}
