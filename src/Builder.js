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

    this.wheres = [...this.wheres, { type, column, values, boolean }]

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

  whereDate (column, operator, value = null, boolean = 'and') {
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = `${checkedValue.getFullYear()}-${checkedValue.getMonth()}-${checkedValue.getDay()}`
    }

    return this.addDateBasedWhere('Date', column, checkedOperator, checkedValue, boolean)
  }

  orWhereDate (column, operator, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereDate(column, checkedOperator, checkedValue, 'or')
  }

  whereTime (column, operator, value = null, boolean = 'and') {
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = `${checkedValue.getHours()}:${checkedValue.getMinutes()}`
    }

    return this.addDateBasedWhere('Time', column, checkedOperator, checkedValue, boolean)
  }

  orWhereTime (column, operator, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereTime(column, checkedOperator, checkedValue, 'or')
  }

  whereDay (column, operator, value = null, boolean = 'and') {
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = checkedValue.getDay()
    }

    if (!(checkedValue instanceof Expression)) {
      checkedValue = checkedValue.padStart(2, '0')
    }

    return this.addDateBasedWhere('Day', column, checkedOperator, checkedValue, boolean)
  }

  orWhereDay (column, operator, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereDay(column, checkedOperator, checkedValue, 'or')
  }

  whereMonth (column, operator, value = null, boolean = 'and') {
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = checkedValue.getMonth()
    }

    if (!(checkedValue instanceof Expression)) {
      checkedValue = checkedValue.padStart(2, '0')
    }

    return this.addDateBasedWhere('Month', column, checkedOperator, value, boolean)
  }

  orWhereMonth (column, operator, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereMonth(column, checkedOperator, checkedValue, 'or')
  }

  whereYear (column, operator, value = null, boolean = 'and') {
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = checkedValue.getFullYear()
    }

    return this.addDateBasedWhere('Year', column, checkedOperator, checkedValue, boolean)
  }

  orWhereYear (column, operator, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereYear(column, checkedOperator, checkedValue, 'or')
  }

  addDateBasedWhere (type, column, operator, value, boolean = 'and') {
    this.wheres = [...this.wheres, { column, type, boolean, operator, value }]

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'where')
    }

    return this
  }

  whereColumn (first, operator = null, second = null, boolean = 'and') {
    // If the column is an array, we will assume it is an array of key-value pairs
    // and can add them each as a where clause. We will maintain the boolean we
    // received when the method was called and pass it into the nested where.
    if (Array.isArray(first)) {
      return this.addArrayOfWheres(first, boolean, 'whereColumn')
    }

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and
    // we will set the operators to '=' and set the values appropriately.
    if (Builder.invalidOperator(operator)) {
      second = operator
      operator = '='
    }

    // Finally, we will add this where clause into this array of clauses that we
    // are building for the query. All of them will be compiled via a grammar
    // once the query is about to be executed and run against the database.
    const type = 'Column'

    this.wheres = [...this.wheres, { type, first, operator, second, boolean }]

    return this
  }

  orWhereColumn (first, operator = null, second = null) {
    return this.whereColumn(first, operator, second, 'or')
  }

  groupBy (...groups) {
    groups.forEach(group => {
      this.groups = [...this.groups, group]
    })

    return this
  }

  having (column, operator = null, value = null, boolean = 'and') {
    const type = 'Basic'

    // Here we will make some assumptions about the operator. If only 2 values are
    // passed to the method, we will assume that the operator is an equals sign
    // and keep going. Otherwise, we'll require the operator to be passed in.
    let { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and
    // we will set the operators to '=' and set the values appropriately.
    if (Builder.invalidOperator(operator)) {
      checkedValue = checkedOperator
      checkedOperator = '='
    }

    this.havings = [...this.havings, { type, column, operator: checkedOperator, value: checkedValue, boolean }]

    if (!(checkedValue instanceof Expression)) {
      this.addBinding(checkedValue, 'having')
    }

    return this
  }

  orHaving (column, operator = null, value = null) {
    const { checkedValue, checkedOperator } = Builder.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.having(column, checkedOperator, checkedValue, 'or')
  }

  havingBetween (column, values, boolean = 'and', not = false) {
    const type = 'between'

    this.havings = [...this.havings, { type, column, values, boolean, not }]

    this.addBinding(this.cleanBindings(values), 'having')

    return this
  }

  havingRaw (sql, bindings = [], boolean = 'and') {
    const type = 'Raw'

    this.havings = [...this.havings, { type, sql, boolean }]

    this.addBinding(bindings, 'having')

    return this
  }

  orHavingRaw (sql, bindings = []) {
    return this.havingRaw(sql, bindings, 'or')
  }

  orderBy (column, direction = 'asc') {
    const orderType = this.unions ? 'unionOrders' : 'orders'

    if (column instanceof Builder ||
      isFunction(column)) {
      const { query, bindings } = Builder.createSub(column)

      column = new Expression(`(${query})`)

      this.addBinding(bindings, orderType)
    }

    direction = direction.toLowerCase()

    if (!(['asc', 'desc']).find(d => d === direction)) {
      throw new Error('Order direction must be "asc" or "desc".')
    }

    this[orderType] = [...this[orderType], { column, direction }]

    return this
  }

  orderByDesc (column) {
    return this.orderBy(column, 'desc')
  }

  latest (column = 'created_at') {
    return this.orderBy(column, 'desc')
  }

  oldest (column = 'created_at') {
    return this.orderBy(column, 'asc')
  }

  inRandomOrder (seed = '') {
    return this.orderByRaw(this.grammar.compileRandom(seed))
  }

  orderByRaw (sql, bindings = []) {
    const type = 'Raw'
    const orderType = this.unions ? 'unionOrders' : 'orders'

    this[orderType] = [...this[orderType], { type, sql }]

    this.addBinding(bindings, orderType)

    return this
  }

  skip (value) {
    const property = this.unions ? 'unionOffset' : 'offset'

    this[property] = Math.max(0, value)

    return this
  }

  take (value) {
    const property = this.unions ? 'unionLimit' : 'limit'

    if (value >= 0) {
      this[property] = value
    }

    return this
  }

  forPage (page, perPage = 15) {
    return this.skip((page - 1) * perPage).take(perPage)
  }

  union (query, all = false) {
    if (isFunction(query)) {
      query(Builder.newQuery())
    }

    this.unions = [...this.unions, { query, all }]

    this.addBinding(query.getBindings(), 'union')

    return this
  }

  unionAll (query) {
    return this.union(query, true)
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
          case 'Date': return this.grammar.whereDate(this, where)
          case 'Day': return this.grammar.whereDay(this, where)
          case 'Month': return this.grammar.whereMonth(this, where)
          case 'Year': return this.grammar.whereYear(this, where)
          case 'Time': return this.grammar.whereTime(this, where)
          case 'Column': return `${prefix} ${where.first} ${where.operator} ${where.second}`

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

  compileGroupBy () {
    if (!this.groups.length) return ''
    const prefix = 'group by'

    return `${prefix} ${this.groups.join(', ')}`
  }

  compileOrderBy () {
    if (!this.orders.length) return ''
    const prefix = 'order by'

    return `${prefix} ${this.orders.map(order => `${order.column} ${order.direction}`).join(', ')}`
  }

  compileHaving () {
    // If the having clause is "raw", we can just return the clause straight away
    // without doing any more processing on it. Otherwise, we will compile the
    // clause into SQL based on the components that make it up from builder.
    return !this.havings.length
      ? ''
      : this.havings.map(having => {
        if (having['type'] === 'Raw') {
          return `${having['boolean']} ${having['sql']}`
        } else if(having['type'] === 'between') {
          return this.compileHavingBetween(having)
        }

        return this.compileBasicHaving(having)
      }).join(' ')
  }

  compileBasicHaving (having) {
    const column = this.grammar.wrap(having['column'])

    const parameter = Grammar.parameter(having['value'])

    return `${having['boolean']} ${column} ${having['operator']} ${parameter}`
  }

  compileHavingBetween (having) {
    const between = having['not'] ? 'not between' : 'between'

    const column = this.grammar.wrap(having['column'])

    const min = Grammar.parameter(having['values'][0])

    const max = Grammar.parameter(having['values'][having['values'].length - 1])

    return `${having['boolean']} ${column} ${between} ${min} and ${max}`
  }

  compileOffset () {
    if (this.offset) return ''
    return `offset ${isString(this.offset) ? parseInt(this.offset) : this.offset}`
  }

  compileLimit () {
    if (this.limit) return ''
    return `limit ${isString(this.limit) ? parseInt(this.limit) : this.limit}`
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
    const groupBy = this.compileGroupBy()
    const orderBy = this.compileOrderBy()
    const having = this.compileHaving()
    const offset = this.compileOffset()
    const limit = this.compileLimit()

    return `${select} ${from} ${where} ${groupBy} ${orderBy} ${having} ${offset} ${limit}`
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
