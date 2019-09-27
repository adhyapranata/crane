import Grammar from './Grammar'
import { isUndefined } from './DataType'
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

  static wrapUnion (sql) {
    return `select * from ${sql})`
  }

  whereDate (query, where) {
    return this.dateBasedWhere('%Y-%m-%d', query, where)
  }

  whereDay (query, where) {
    return this.dateBasedWhere('%d', query, where)
  }

  whereMonth (query, where) {
    return this.dateBasedWhere('%m', query, where)
  }

  whereYear (query, where) {
    return this.dateBasedWhere('%Y', query, where)
  }

  whereTime (query, where) {
    return this.dateBasedWhere('%H:%M:%S', query, where)
  }

  dateBasedWhere (type, query, where) {
    const value = SQLiteGrammar.parameter(where.value)
    return `strftime('${type}', ${this.wrap(where.column)}) ${where.operator} cast(${value} as text)`
  }

  compileJsonLength (column, operator, value) {
    const { field, path } = this.wrapJsonFieldAndPath(column)
    return `json_array_length(${field}${path}) ${operator} ${value}`
  }

  compileUpdate (query, values) {
    if (Object.prototype.hasOwnProperty.call(query, 'joins') || Object.prototype.hasOwnProperty.call(query, 'limit')) {
      return this.compileUpdateWithJoinsOrLimit(query, values)
    }
    return super.compileUpdate(query, values)
  }

  compileInsertOrIgnore (query, values) {
    return replaceFirst('insert', 'insert or ignore', this.compileInsert(query, values))
  }

  compileUpdateColumns (query, values) {
    return values.map((value, key) => {
      const column = last(key.split('.'))
      return `${this.wrap(column)} = ${this.parameter(value)}`
    }
    ).join(', ')
  }

  compileUpdateWithJoinsOrLimit (query, values) {
    const table = this.wrapTable(query.from)
    const columns = this.compileUpdateColumns(query, values)
    const alias = last(query.from.split(/\s+as\s+/i))
    const selectSql = this.compileSelect(query.select(`${alias}.rowid`
    ))

    return `update ${table} set ${columns} where ${this.wrap('rowid')} in (${selectSql})`
  }

  static prepareBindingsForUpdate (bindings, values) {
    const cleanBindings = except(bindings, ['select'])
    return [...values, ...Object.values(cleanBindings).flat()]
  }

  compileDelete (query) {
    if (isUndefined(query.joins) || isUndefined(query.limit)) {
      return this.compileDeleteWithJoinsOrLimit(query)
    }
    return super.compileDelete(query)
  }

  compileDeleteWithJoinsOrLimit (query) {
    const table = this.wrapTable(query.from)
    const alias = last(query.from.split(/s+ass+/i))
    const selectSql = this.compileSelect(query.select(`${alias}.rowid`))

    return `delete from ${table} where ${this.wrap('rowid')} in (${selectSql})`
  }

  compileTruncate (query) {
    return [
      { 'delete from sqlite_sequence where name = ?': [query.from] },
      { [`delete from ${this.wrapTable(query.from)}`]: [] }
    ]
  }

  wrapJsonSelector (value) {
    const { field, path } = this.wrapJsonFieldAndPath(value)
    return `json_extract(${field}${path}})`
  }
}
