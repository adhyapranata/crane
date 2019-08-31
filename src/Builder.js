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
    this.distinct = false
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
    this.from = name

    return this
  }

  select () {
    if (Builder._areValidArguments(arguments)) return false

    this.columns = [...this.columns, ...arguments]

    return this
  }

  distinct () {
    this.distinct = true
  }

  where () {
    if (Builder._areValidArguments(arguments, { min: 2 })) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      Builder._formatWhere(arguments)
    ]

    return this
  }

  orWhere () {
    if (Builder._areValidArguments(arguments, { min: 2 })) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      Builder._formatWhere(arguments, { or: true })
    ]

    return this
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
    const sql = this._getSql()
    const params = this._getParams()

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

  _getSql () {
    const select = this._stringifySelect()
    const from = this._stringifyFrom()
    const where = this._stringifyWhere()

    return `${select} ${from} ${where}`
  }

  _getParams () {
    let params = []
    Object.values(this.bindings).forEach(binding => {
      if (binding.length) {
        params = [...params, ...binding]
      }
    })

    return params
  }

  _stringifySelect () {
    const prefix = !this.distinct ? 'SELECT' : 'SELECT DISTINCT'

    return !this.columns.length
      ? `${prefix} *`
      : `${prefix} ${this.columns.join(',')}`
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

  static _formatWhere (args, options = { or: false }) {
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

  static _areValidArguments (args, options = { min: 1 }) {
    return args.length < options.min
  }

  static _isObject (value) {
    return typeof value === 'object'
  }

  static _hasKey (target, key) {
    return Builder._isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }
}
