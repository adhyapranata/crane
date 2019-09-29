import RNSQLiteConnection from './RNSQLiteConnection'

/**
 * Connections connections registry
 *
 * @type {{'rn-sqlite': *}}
 */
const connections = {
  'rn-sqlite': RNSQLiteConnection
}

export default class Database {
  /**
   *
   * @param config
   */
  static addConnection (config) {
    if (!config.type) {
      throw new Error('Please add the type of database connection you want to use')
    }

    this.Connection = connections[config.type]
    this.database = this.Connection.connect(config)
  }
}
