import SQLiteConnection from './SQLiteConnection'

const operators = [
  '=',
  '<',
  '>',
  '<=',
  '>=',
  '<>',
  '!=',
  '<=>',
  'like',
  'like binary',
  'not like',
  'ilike',
  '&',
  '|',
  '^',
  '<<',
  '>>',
  'rlike',
  'regexp',
  'not regexp',
  '~',
  '~*',
  '!~',
  '!~*',
  'similar to',
  'not similar to',
  'not ilike',
  '~~*',
  '!~~*'
]

export default class Builder {
  constructor () {
    this.bindings = {
      select: [],
      join: [],
      where: [],
      having: [],
      order: [],
      union: []
    }
    this.aggregate = null
    this.columns = []
    this.isDistinct = false
    this.from = null
    this.joins = null
    this.wheres = []
    this.groups = null
    this.havings = null
    this.orders = null
    this.limit = null
    this.offset = null
    this.unions = null
    this.unionLimit = null
    this.unionOffset = null
    this.unionOrders = null
    this.lock = null
  }

  table (name) {
    if (!Builder._isValidArgument(name, () => Builder._isString(name))) return false

    this.from = name

    return this
  }

  select () {
    if (!Builder._areValidArguments(arguments)) return false

    this.columns = [...this.columns, ...arguments]

    return this
  }

  distinct () {
    this.isDistinct = true

    return this
  }

  where () {
    if (!Builder._areValidArguments(arguments, { min: 2 })) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      Builder._assembleWhere(arguments)
    ]

    return this
  }

  orWhere () {
    if (!Builder._areValidArguments(arguments, { min: 2 })) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      Builder._assembleWhere(arguments, { or: true })
    ]

    return this
  }

  static raw (expression) {
    if (!Builder._isValidArgument(expression, () => Builder._isString(expression))) return false

    return expression
  }

  get () {
    return this._executeSql(
      res => res[0].rows,
      errors => {
        throw errors
      })
  }

  first () {
    return this._executeSql(
      res => res[0].rows[0],
      errors => {
        throw errors
      })
  }

  _executeSql (resolve, reject) {
    const sql = this._assembleSql()
    const params = this._assembleParams()

    console.tron.log('sql', sql)
    console.tron.log('params', params)

    return this._executeBulkSql([sql], [params])
      .then(res => resolve(res))
      .catch(errors => reject(errors))
  }

  _executeBulkSql (sqls, params = []) {
    return new Promise((txResolve, txReject) => {
      SQLiteConnection.database.transaction(tx => {
        Promise.all(sqls.map((sql, index) => {
          return new Promise((sqlResolve, sqlReject) => {
            tx.executeSql(
              sql,
              params[index],
              (_, { rows, insertId }) => {
                sqlResolve({ rows: rows.raw(), insertId })
              },
              sqlReject
            )
          })
        })).then(txResolve).catch(txReject)
      })
    })
  }

  _assembleSql () {
    const select = this._stringifySelect()
    const from = this._stringifyFrom()
    const where = this._stringifyWhere()

    return `${select} ${from} ${where}`
  }

  _assembleParams () {
    let params = []
    Object.values(this.bindings).forEach(binding => {
      if (binding.length) {
        params = [...params, ...binding]
      }
    })

    return params
  }

  _stringifySelect () {
    const prefix = !this.isDistinct ? 'SELECT' : 'SELECT DISTINCT'

    return !this.columns.length
      ? `${prefix} *`
      : `${prefix} ${this.columns.join(', ')}`
  }

  _stringifyFrom () {
    const prefix = 'FROM'

    return `${prefix} ${this.from}`
  }

  _stringifyWhere () {
    let prefix = 'WHERE'

    return !this.wheres.length
      ? ''
      : this.wheres.map((where, index) => {
        prefix = index ? ` ${where.boolean.toUpperCase()}` : prefix

        return `${prefix} ${where.column} ${where.operator} ?`
      }).join('')
  }

  static _assembleWhere (args, options = { or: false }) {
    const operator = Builder._getOperator(args)
    const value = Builder._getValue(args)

    return {
      type: 'Basic',
      column: args[0],
      operator,
      value,
      boolean: options.or ? 'or' : 'and'
    }
  }

  static _getOperator (args) {
    return Builder._hasOperator(args) && Builder._isValidOperator(args[1])
      ? args[1]
      : '='
  }

  static _getValue (args) {
    return Builder._hasOperator(args)
      ? args[2]
      : args[1]
  }

  static _hasOperator (args) {
    return args.length > 2
  }

  static _isValidOperator (target) {
    return operators.find(operator => operator === target)
  }

  static _isString (value) {
    return typeof value === 'string' || value instanceof String
  }

  static _isNumber (value) {
    return typeof value === 'number' && isFinite(value)
  }

  static _isFunction (value) {
    return typeof value === 'function'
  }

  static _isObject (value) {
    return value && typeof value === 'object' && value.constructor === Object
  }

  static _isNull (value) {
    return value === null
  }

  static _isUndefined (value) {
    return typeof value === 'undefined'
  }

  static _isBoolean (value) {
    return typeof value === 'boolean'
  }

  static _isRegExp (value) {
    return value && typeof value === 'object' && value.constructor === RegExp
  }

  static _isError (value) {
    return value instanceof Error && typeof value.message !== 'undefined'
  }

  static _isDate (value) {
    return value instanceof Date
  }

  static _isSymbol (value) {
    return typeof value === 'symbol'
  }

  static _isValidArgument (target, callback) {
    return target && callback()
  }

  static _areValidArguments (args, options = { min: 1 }) {
    return args.length >= options.min
  }

  static _hasKey (target, key) {
    return Builder._isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }
}
