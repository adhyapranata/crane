import RNSQLiteConnection from './RNSQLiteConnection'
import SQLiteGrammar from './SQLiteGrammar'
import { initializeBuilder } from '../index'

/**
 * Connections connections registry
 *
 * @type {{'rn-sqlite': *}}
 */
const connections = {
  'rn-sqlite': RNSQLiteConnection
}

const grammars = {
  'rn-sqlite': SQLiteGrammar
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

    initializeBuilder()
  }
}
