import RNSQLiteConnection from './RNSQLiteConnection'
import SQLiteGrammar from './SQLiteGrammar'
import ExpoSQLiteConnection from "./ExpoSQLiteConnection"

/**
 * Connections connections registry
 *
 * @type {{'rn-sqlite': *}}
 */
const connections = {
  'rn-sqlite': RNSQLiteConnection,
  'expo': ExpoSQLiteConnection
}

const grammars = {
  'rn-sqlite': SQLiteGrammar,
  'expo': SQLiteGrammar
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
    this.Grammar = grammars[config.type]
    this.database = this.Connection.connect(config)
  }
}
