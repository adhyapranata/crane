import Grammar from './Grammar'
import { isNull, isUndefined } from './DataType'
import { last, except, replaceFirst } from './Utilities'

export default class SQLiteGrammar extends Grammar {
  constructor () {
    super()
    this.operators = [
      '=', '<', '>', '<=', '>=', '<>', '!=',
      'like', 'not like', 'ilike',
      '&', '|', '<<', '>>'
    ]
  }

  /**
   *
   * @param sql
   * @returns {string}
   */
  wrapUnion (sql) {
    return `select * from (${sql})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereDate (query, where) {
    return this.dateBasedWhere('%Y-%m-%d', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereDay (query, where) {
    return this.dateBasedWhere('%d', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereMonth (query, where) {
    return this.dateBasedWhere('%m', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereYear (query, where) {
    return this.dateBasedWhere('%Y', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereTime (query, where) {
    return this.dateBasedWhere('%H:%M:%S', query, where)
  }

  /**
   *
   * @param type
   * @param query
   * @param where
   * @returns {string}
   */
  dateBasedWhere (type, query, where) {
    const value = SQLiteGrammar.parameter(where.value)
    return `strftime('${type}', ${this.wrap(where.column)}) ${where.operator} cast(${value} as text)`
  }

  /**
   *
   * @param column
   * @param operator
   * @param value
   * @returns {string}
   */
  compileJsonLength (column, operator, value) {
    const { field, path } = this.wrapJsonFieldAndPath(column)
    return `json_array_length(${field}${path}) ${operator} ${value}`
  }

  /**
   *
   * @param query
   * @param values
   * @returns {string|*}
   */
  compileUpdate (query, values) {
    if (
      (Object.prototype.hasOwnProperty.call(query, 'joins') && query.joins.length) ||
      (Object.prototype.hasOwnProperty.call(query, 'limit') && !isNull(query.limit))
    ) {
      return this.compileUpdateWithJoinsOrLimit(query, values).replace(/"/g, '')
    }
    return super.compileUpdate(query, values).replace(/"/g, '')
  }

  /**
   *
   * @param query
   * @param values
   */
  compileInsertOrIgnore (query, values) {
    return replaceFirst('insert', 'insert or ignore', this.compileInsert(query, values))
  }

  /**
   *
   * @param query
   * @param values
   * @returns {*|SourceNode|string}
   */
  compileUpdateColumns (query, values) {
    return Object.keys(values).map(key => {
      const column = last(key.split('.'))
      return `${this.wrap(column)} = ${SQLiteGrammar.parameter(values[key])}`
    }).join(', ')
  }

  /**
   *
   * @param query
   * @param values
   * @returns {string}
   */
  compileUpdateWithJoinsOrLimit (query, values) {
    const table = this.wrapTable(query.from)
    const columns = this.compileUpdateColumns(query, values)
    const alias = last(query.from.split(/\s+as\s+/i))
    const selectSql = this.compileSelect(query.select(`${alias}.rowid`))

    return `update ${table} set ${columns} where ${this.wrap('rowid')} in (${selectSql})`
  }

  /**
   *
   * @param bindings
   * @param values
   * @returns {*[]}
   */
  prepareBindingsForUpdate (bindings, values) {
    const cleanBindings = except(bindings, ['select'])
    return [...Object.values(values), ...Object.values(cleanBindings).flat()]
  }

  /**
   *
   * @param query
   * @returns {string|*}
   */
  compileDelete (query) {
    if (isUndefined(query.joins) || isUndefined(query.limit)) {
      return this.compileDeleteWithJoinsOrLimit(query)
    }
    return super.compileDelete(query)
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileDeleteWithJoinsOrLimit (query) {
    const table = this.wrapTable(query.from)
    const alias = last(query.from.split(/s+ass+/i))
    const selectSql = this.compileSelect(query.select(`${alias}.rowid`))

    return `delete from ${table} where ${this.wrap('rowid')} in (${selectSql})`
  }

  /**
   *
   * @param query
   * @returns {*[]}
   */
  compileTruncate (query) {
    return [
      { 'delete from sqlite_sequence where name = ?': [query.from] },
      { [`delete from ${this.wrapTable(query.from)}`]: [] }
    ]
  }

  /**
   *
   * @param value
   * @returns {string}
   */
  wrapJsonSelector (value) {
    const { field, path } = this.wrapJsonFieldAndPath(value)
    return `json_extract(${field}${path}})`
  }
}
