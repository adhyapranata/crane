import SQLiteConnection from './SQLiteConnection'
import Expression from './Expression'
import Grammar from './SQLiteGrammar'
import {
  isString,
  isBoolean,
  isObject,
  isFunction,
  isNull
} from './DataType'
import {
  objectKey,
  objectVal
} from './Utilities'

const operators = [
  '=', '<', '>', '<=', '>=', '<>', '!=', '<=>',
  'like', 'like binary', 'not like', 'ilike',
  '&', '|', '^', '<<', '>>',
  'rlike', 'regexp', 'not regexp',
  '~', '~*', '!~', '!~*', 'similar to',
  'not similar to', 'not ilike',
  '~~*', '!~~*'
]

export default class Builder {
  constructor() {
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
    this.grammar = new Grammar()
  }

  table(table, as = null) {
    this.from = as ? `${table} as ${as}` : table

    return this
  }

  select(columns = ['*']) {
    const checkedColumns = Array.isArray(columns) ? columns : [...arguments]
    let as = null

    checkedColumns.forEach(column => {
      as = objectKey(column)
      if (isString(as) && (
        column instanceof Builder || isFunction(column))
      ) {
        this.selectSub(column, as)
      } else {
        this.columns = [...this.columns, column]
      }
    })

    return this
  }

  selectRaw(expression, bindings = []) {
    this.addSelect((new Expression(expression)).getValue())
    if (bindings) {
      this.addBinding(bindings, 'select')
    }

    return this
  }

  addSelect(column) {
    const columns = Array.isArray(column) ? column : arguments
    let as = null

    columns.forEach(column => {
      as = objectKey(column)
      if (isString(as) && (column instanceof Builder || isFunction(column))) {
        if (isNull(this.columns)) {
          this.select(`${this.from}.*`)
        }
        this.selectSub(column, as)
      } else {
        this.columns = [...this.columns, column]
      }
    })

    return this
  }

  get() {
    return this.executeSql(
      res => res[0].rows,
      errors => {
        throw errors
      })
  }

  first() {
    return this.executeSql(
      res => res[0].rows[0],
      errors => {
        throw errors
      })
  }

  distinct() {
    this.isDistinct = true

    return this
  }

  where(column, operator = null, value = null, boolean = 'and') {
    if (Array.isArray(column)) {
      return this.addArrayOfWheres(column, boolean)
    }

    let {checkedValue, checkedOperator} = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (isFunction(column)) {
      return this.whereNested(column, boolean)
    }

    if (Builder.invalidOperator(checkedOperator)) {
      checkedValue = checkedOperator
      checkedOperator = '='
    }

    if (isFunction(checkedValue)) {
      return this.whereSub(column, checkedOperator, checkedValue, boolean)
    }

    if (isNull(checkedValue)) {
      return this.whereNull(column, boolean, checkedOperator !== '=')
    }

    let type = 'Basic'
    let expression = null

    if (column.contains('->') && isBoolean(value)) {
      expression = new Expression(value ? 'true' : 'false')
      checkedValue = expression.getValue()
      if (isString(column)) {
        type = 'JsonBoolean'
      }
    }

    this.wheres = [
      ...this.wheres,
      {
        type, column, operator: checkedOperator, value: checkedValue, boolean
      }
    ]

    if (!isNull(expression)) {
      this.addBinding(checkedValue, 'where')
    }

    return this
  }

  orWhere(column, operator = null, value = null) {
    const {checkedValue, checkedOperator} = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.where(column, checkedOperator, checkedValue, 'or')
  }

  whereNull(columns, boolean = 'and', not = false) {
    const type = not ? 'NotNull' : 'Null'
    Builder.wrap(columns).forEach(column => {
      this.wheres = [...this.wheres, {type, column, boolean}]
    })

    return this
  }

  orWhereNull(column) {
    return this.whereNull(column, 'or')
  }

  static raw(value) {
    return new Expression(value)
  }

  selectSub(query, as) {
    const {query, bindings} = Builder.createSub(query)
    return this.selectRaw(
      `(${query}) as ${this.grammar.wrap(as)}`, bindings
    )
  }

  whereSub(column, operator, callback, boolean) {
    const type = 'Sub'
    const query = Builder.forSubQuery()

    callback(query)
    this.wheres = [...this.wheres, {type, column, operator, query, boolean}]
    this.addBinding(query.getBindings(), 'where')

    return this
  }

  static createSub(query) {
    if (isFunction(query)) {
      const callback = query
      callback(query = Builder.forSubQuery())
    }

    return Builder.parseSub(query)
  }

  static parseSub(query) {
    if (query instanceof Builder) {
      return [query.toSql(), query.getBindings()]
    } else if (isString(query)) {
      return [query, []]
    } else {
      throw new Error('Invalid argument')
    }
  }

  addBinding(value, type = 'where') {
    if (!Builder.hasKey(this.bindings, type)) {
      throw new Error('Invalid binding type: {type}.')
    }

    if (Array.isArray(value)) {
      this.bindings[type] = [...this.bindings[type], ...value]
    } else {
      this.bindings[type] = [...this.bindings[type], value]
    }

    return this
  }

  getBindings() {
    return this.bindings.flat()
  }

  static prepareValueAndOperator(value, operator, useDefault = false) {
    if (useDefault) {
      return [operator, '=']
    } else if (Builder.invalidOperatorAndValue(operator, value)) {
      throw new Error('Illegal operator and value combination.')
    }
    return [value, operator]
  }

  static invalidOperatorAndValue(operator, value) {
    return isNull(value)
      && operators.find(op => op === operator)
      && !['=', '<>', '!='].find(op => op === operator)
  }

  static invalidOperator(target) {
    return !operators.find(operator => operator === target)
  }

  addArrayOfWheres(column, boolean, method = 'where') {
    return this.whereNested(query => {
      column.forEach(value => {
        if (Array.isArray(value)) {
          query[method](...value)
        } else {
          query[method](objectKey(value), '=', objectVal(value))
        }
      })
    }, boolean)
  }

  whereNested(callback, boolean = 'and') {
    const query = this.forNestedWhere()
    callback(query)
    return this.addNestedWhereQuery(query, boolean)
  }

  forNestedWhere() {
    return Builder.newQuery().table(this.from)
  }

  static forSubQuery() {
    return Builder.newQuery()
  }

  static newQuery() {
    return new Builder()
  }

  addNestedWhereQuery(query, boolean = 'and') {
    if (query.wheres.length) {
      const type = 'Nested'
      this.wheres = [...this.wheres, {type, query, boolean}]
      this.addBinding(query.getRawBindings()['where'], 'where')
    }

    return this
  }

  getRawBindings() {
    return this.bindings
  }

  static wrap(value) {
    return !Array.isArray(value) ? [value] : value
  }

  static hasKey(target, key) {
    return isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }

  executeSql(resolve, reject) {
    const sql = this.assembleSql()
    const params = this.assembleParams()

    console.tron.log('sql', sql)
    console.tron.log('params', params)

    return this.executeBulkSql([sql], [params])
      .then(res => resolve(res))
      .catch(errors => reject(errors))
  }

  executeBulkSql(sqls, params = []) {
    return new Promise((txResolve, txReject) => {
      SQLiteConnection.database.transaction(tx => {
        Promise.all(sqls.map((sql, index) => {
          return new Promise((sqlResolve, sqlReject) => {
            tx.executeSql(
              sql,
              params[index],
              (_, {rows, insertId}) => {
                sqlResolve({rows: rows.raw(), insertId})
              },
              sqlReject
            )
          })
        })).then(txResolve).catch(txReject)
      })
    })
  }

  toSql() {
    // return this.grammar.compileSelect(this)
    return this.compileSelect(this)
  }

  assembleSql() {
    const select = this.compileSelect()
    const from = this.compileFrom()
    const where = this.compileWhere()

    return `${select} ${from} ${where}`
  }

  assembleParams() {
    let params = []
    Object.values(this.bindings).forEach(binding => {
      if (binding.length) {
        params = [...params, ...binding]
      }
    })

    return params
  }

  compileSelect() {
    const prefix = !this.isDistinct ? 'select' : 'select distinct'

    return !this.columns.length
      ? `${prefix} *`
      : `${prefix} ${this.columns.join(', ')}`
  }

  compileFrom() {
    const prefix = 'from'

    return `${prefix} ${this.from}`
  }

  compileWhere() {
    let prefix = 'where'

    return !this.wheres.length
      ? ''
      : this.wheres.map((where, index) => {
        prefix = index ? ` ${where.boolean.toUpperCase()}` : prefix

        return `${prefix} ${where.column} ${where.operator} ?`
      }).join('')
  }
}
