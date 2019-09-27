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
    this.grammar = new Grammar()
    this.connection = new SQLiteConnection()
  }

  table (table, as = null) {
    this.from = as ? `${table} as ${as}` : table

    return this
  }

  select (columns = ['*']) {
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

  selectRaw (expression, bindings = []) {
    this.addSelect((new Expression(expression)).getValue())
    if (bindings) {
      this.addBinding(bindings, 'select')
    }

    return this
  }

  addSelect (column) {
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

  distinct () {
    this.isDistinct = true

    return this
  }

  where (column, operator = null, value = null, boolean = 'and') {
    if (Array.isArray(column)) {
      return this.addArrayOfWheres(column, boolean)
    }

    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
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

    if (column.includes('->') && isBoolean(value)) {
      checkedValue = (new Expression(value ? 'true' : 'false')).getValue()
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

    if (!(checkedValue instanceof Expression)) {
      this.addBinding(checkedValue, 'where')
    }

    return this
  }

  orWhere (column, operator = null, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.where(column, checkedOperator, checkedValue, 'or')
  }

  whereBetween (column, values, boolean = 'and', not = false) {
    const type = not ? 'NotBetween' : 'Between'

    this.wheres = [...this.wheres, { type, column, values, boolean, not }]

    this.addBinding(this.cleanBindings(values), 'where')

    return this
  }

  orWhereBetween (column, values) {
    return this.whereBetween(column, values, 'or')
  }

  whereNotBetween (column, values, boolean = 'and') {
    return this.whereBetween(column, values, boolean, true)
  }

  orWhereNotBetween (column, values) {
    return this.whereNotBetween(column, values, 'or')
  }

  whereNull (columns, boolean = 'and', not = false) {
    const type = not ? 'NotNull' : 'Null'
    Builder.wrap(columns).forEach(column => {
      this.wheres = [...this.wheres, { type, column, boolean }]
    })

    return this
  }

  orWhereNull (column) {
    return this.whereNull(column, 'or')
  }

  whereNotNull (column, boolean = 'and') {
    return this.whereNull(column, boolean, true)
  }

  orWhereNotNull (column) {
    return this.whereNotNull(column, 'or')
  }

  whereIn (column, values, boolean = 'and', not = false) {
    const type = not ? 'NotIn' : 'In'

    this.wheres = [...this.wheres, {type, column, values, boolean}]

    this.addBinding(this.cleanBindings(values), 'where')

    return this
  }

  orWhereIn (column, values) {
    return this.whereIn(column, values, 'or')
  }

  whereNotIn (column, values, boolean = 'and') {
    return this.whereIn(column, values, boolean, true)
  }

  orWhereNotIn (column, values) {
    return this.whereNotIn(column, values, 'or')
  }

  static raw (value) {
    return (new Expression(value)).getValue()
  }

  cleanBindings (bindings) {
    return bindings.filter(binding => !(binding instanceof Expression))
  }

  selectSub (query, as) {
    const { checkedQuery, bindings } = Builder.createSub(query)
    return this.selectRaw(
      `(${checkedQuery}) as ${this.grammar.wrap(as)}`, bindings
    )
  }

  whereSub (column, operator, callback, boolean) {
    const type = 'Sub'
    const query = Builder.forSubQuery()

    callback(query)
    this.wheres = [...this.wheres, { type, column, operator, query, boolean }]
    this.addBinding(query.getBindings(), 'where')

    return this
  }

  static createSub (query) {
    if (isFunction(query)) {
      const callback = query
      callback(query = Builder.forSubQuery())
    }

    return Builder.parseSub(query)
  }

  static parseSub (query) {
    if (query instanceof Builder) {
      return [query.toSql(), query.getBindings()]
    } else if (isString(query)) {
      return [query, []]
    } else {
      throw new Error('Invalid argument')
    }
  }

  addBinding (value, type = 'where') {
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

  getBindings () {
    return this.bindings.flat()
  }

  static prepareValueAndOperator (value, operator, useDefault = false) {
    if (useDefault) {
      return { checkedValue: operator, checkedOperator: '=' }
    } else if (Builder.invalidOperatorAndValue(operator, value)) {
      throw new Error('Illegal operator and value combination.')
    }
    return { checkedValue: value, checkedOperator: operator }
  }

  static invalidOperatorAndValue (operator, value) {
    return isNull(value) &&
      operators.find(op => op === operator) &&
      !['=', '<>', '!='].find(op => op === operator)
  }

  static invalidOperator (target) {
    return !operators.find(operator => operator === target)
  }

  addArrayOfWheres (column, boolean, method = 'where') {
    return this.whereNested(query => {
      column.forEach(value => {
        if (Array.isArray(value)) {
          query[method](...value)
        } else {
          query[method](objectKey(value), '=', objectVal(value))
        }
      })

      return query
    }, boolean)
  }

  whereNested (callback, boolean = 'and') {
    const query = callback(this.forNestedWhere())
    return this.addNestedWhereQuery(query, boolean)
  }

  forNestedWhere () {
    return Builder.newQuery().table(this.from)
  }

  addNestedWhereQuery (query, boolean = 'and') {
    if (query.wheres.length) {
      const type = 'Nested'
      this.wheres = [...this.wheres, { type, query, boolean }]
      this.addBinding(query.getRawBindings().where, 'where')
    }

    return this
  }

  getRawBindings () {
    return this.bindings
  }

  static forSubQuery () {
    return Builder.newQuery()
  }

  static newQuery () {
    return new Builder()
  }

  static wrap (value) {
    return !Array.isArray(value) ? [value] : value
  }

  static hasKey (target, key) {
    return isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }

  compileSelect () {
    const prefix = !this.isDistinct ? 'select' : 'select distinct'

    return !this.columns.length
      ? `${prefix} *`
      : `${prefix} ${this.columns.join(', ')}`
  }

  compileFrom () {
    const prefix = 'from'

    return `${prefix} ${this.from}`
  }

  compileWhere () {
    let prefix = 'where'
    let placeholder = null

    return !this.wheres.length
      ? ''
      : this.wheres.map((where, index) => {
        prefix = index ? ` ${where.boolean}` : prefix
        placeholder = this.getPlaceholder(where.type, where.values)

        switch (where.type) {
          case 'NotNull': return `${prefix} ${where.column} is not null`
          case 'Null': return `${prefix} ${where.column} is null`
          case 'Nested': return where.query.compileWhere()
          case 'NotBetween': return `${prefix} ${where.column} not between ${placeholder} and ${placeholder}`
          case 'Between': return `${prefix} ${where.column} between ${placeholder} and ${placeholder}`
          case 'NotIn': return `${prefix} ${where.column} not in (${placeholder})`
          case 'In': return `${prefix} ${where.column} in (${placeholder})`

          default: return `${prefix} ${where.column} ${where.operator} ?`
        }
      }).join('')
  }

  getPlaceholder (type, values) {
    if (type === 'NotIn' || type === 'In') {
      return values.map(() => '?').join(', ')
    }

    return '?'
  }

  toSql () {
    // TODO
    // return this.grammar.compileSelect(this)
    return this.compileSelect(this)
  }

  assembleSql () {
    const select = this.compileSelect()
    const from = this.compileFrom()
    const where = this.compileWhere()

    return `${select} ${from} ${where}`
  }

  assembleParams () {
    let params = []
    Object.values(this.bindings).forEach(binding => {
      if (binding.length) {
        params = [...params, ...binding]
      }
    })

    return params
  }

  collect () {
    const sql = this.assembleSql()
    const params = this.assembleParams()

    return { sql, params }
  }

  get () {
    return this.connection.get(this.collect())
  }

  first () {
    return this.connection.first(this.collect())
  }
}
