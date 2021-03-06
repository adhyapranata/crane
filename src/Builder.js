import Database from './Database'
import Expression from './Expression'
import {
  isString,
  isBoolean,
  isObject,
  isFunction,
  isNull, isUndefined, isNumber
} from './DataType'
import {
  flattenArrayOfObjects,
  ksort,
  last,
  objectKey,
  objectVal,
  objectToArray,
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
  constructor (connection = null, grammar = null) {
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
    this.joins = []
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
    this.grammar = grammar || new Database.Grammar()
    this.connection = connection || new Database.Connection()
  }

  /**
   * Set the table which the query is targeting.
   *
   * @param table
   * @param as
   * @returns {Builder}
   */
  table (table, as = null) {
    this.from = as ? `${table} as ${as}` : table

    return this
  }

  /**
   * Set the columns to be selected.
   *
   * @param columns
   * @returns {Builder}
   */
  select (columns = ['*']) {
    this.columns = columns instanceof Array ? columns : [...arguments];

    return this
  }

  /**
   * Add a new "raw" select expression to the query.
   *
   * @param expression
   * @param bindings
   * @returns {Builder}
   */
  selectRaw (expression, bindings = []) {
    this.addSelect(new Expression(expression))
    if (bindings) {
      this.addBinding(bindings, 'select')
    }

    return this
  }

  /**
   * Add a raw where clause to the query.
   *
   * @param sql
   * @param bindings
   * @param boolean
   * @return this
   */
  whereRaw (sql, bindings = [], boolean = 'and') {
    this.wheres = [...this.wheres, { type: 'Raw', sql, boolean }]

    this.addBinding(bindings, 'where')

    return this
  }

  /**
   * Add a raw or where clause to the query.
   *
   * @param sql
   * @param bindings
   * @return this
   */
  orWhereRaw (sql, bindings = []) {
    return this.whereRaw(sql, bindings, 'or')
  }

  /**
   * Add a new select column to the query.
   *
   * @param column
   * @returns {Builder}
   */
  addSelect (column) {
    const columns = Array.isArray(column) ? column : [...arguments]

    this.columns = [...this.columns, ...columns]

    return this
  }

  /**
   * Force the query to only return distinct results.
   *
   * @returns {Builder}
   */
  distinct () {
    this.isDistinct = true

    return this
  }

  /**
   * Add a basic where clause to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {Builder|*}
   */
  where (column, operator = null, value = null, boolean = 'and') {
    if (Array.isArray(column)) {
      return this.addArrayOfWheres(column, boolean)
    }

    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
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

    if (!checkedValue) {
      return this.whereNull(column, boolean, checkedOperator !== '=')
    }

    let type = 'Basic'

    if (column.includes && column.includes('->') && isBoolean(value)) {
      checkedValue = new Expression(value ? 'true' : 'false')
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

  /**
   * Add an "or where" clause to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {Builder|*}
   */
  orWhere (column, operator = null, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.where(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a where between statement to the query.
   *
   * @param column
   * @param values
   * @param boolean
   * @param not
   * @returns {Builder}
   */
  whereBetween (column, values, boolean = 'and', not = false) {
    const type = not ? 'NotBetween' : 'Between'

    this.wheres = [...this.wheres, { type, column, values, boolean, not }]

    this.addBinding(this.cleanBindings(values), 'where')

    return this
  }

  /**
   * Add an or where between statement to the query.
   *
   * @param column
   * @param values
   * @returns {Builder}
   */
  orWhereBetween (column, values) {
    return this.whereBetween(column, values, 'or')
  }

  /**
   * Add a where not between statement to the query.
   *
   * @param column
   * @param values
   * @param boolean
   * @returns {Builder}
   */
  whereNotBetween (column, values, boolean = 'and') {
    return this.whereBetween(column, values, boolean, true)
  }

  /**
   * Add an or where not between statement to the query.
   *
   * @param column
   * @param values
   * @returns {Builder}
   */
  orWhereNotBetween (column, values) {
    return this.whereNotBetween(column, values, 'or')
  }

  /**
   * Add a "where null" clause to the query.
   *
   * @param columns
   * @param boolean
   * @param not
   * @returns {Builder}
   */
  whereNull (columns, boolean = 'and', not = false) {
    const type = not ? 'NotNull' : 'Null'
    Builder.wrap(columns).forEach(column => {
      this.wheres = [...this.wheres, { type, column, boolean }]
    })

    return this
  }

  /**
   * Add an "or where null" clause to the query.
   *
   * @param column
   * @returns {Builder}
   */
  orWhereNull (column) {
    return this.whereNull(column, 'or')
  }

  /**
   * Add a "where not null" clause to the query.
   *
   * @param column
   * @param boolean
   * @returns {Builder}
   */
  whereNotNull (column, boolean = 'and') {
    return this.whereNull(column, boolean, true)
  }

  /**
   * Add an "or where not null" clause to the query.
   *
   * @param column
   * @returns {Builder}
   */
  orWhereNotNull (column) {
    return this.whereNotNull(column, 'or')
  }

  /**
   * Add a "where in" clause to the query.
   *
   * @param column
   * @param values
   * @param boolean
   * @param not
   * @returns {Builder}
   */
  whereIn (column, values, boolean = 'and', not = false) {
    const type = not ? 'NotIn' : 'In'

    this.wheres = [...this.wheres, { type, column, values, boolean }]

    this.addBinding(this.cleanBindings(values), 'where')

    return this
  }

  /**
   * Add an "or where in" clause to the query.
   *
   * @param column
   * @param values
   * @returns {Builder}
   */
  orWhereIn (column, values) {
    return this.whereIn(column, values, 'or')
  }

  /**
   * Add a "where not in" clause to the query.
   *
   * @param column
   * @param values
   * @param boolean
   * @returns {Builder}
   */
  whereNotIn (column, values, boolean = 'and') {
    return this.whereIn(column, values, boolean, true)
  }

  /**
   * Add an "or where not in" clause to the query.
   *
   * @param column
   * @param values
   * @returns {Builder}
   */
  orWhereNotIn (column, values) {
    return this.whereNotIn(column, values, 'or')
  }

  /**
   * Add a "where date" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {*}
   */
  whereDate (column, operator, value = null, boolean = 'and') {
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = `${checkedValue.getFullYear()}-${checkedValue.getMonth()}-${checkedValue.getDay()}`
    }

    return this.addDateBasedWhere('Date', column, checkedOperator, checkedValue, boolean)
  }

  /**
   * Add an "or where date" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {*}
   */
  orWhereDate (column, operator, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereDate(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a "where time" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {*}
   */
  whereTime (column, operator, value = null, boolean = 'and') {
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = `${checkedValue.getHours()}:${checkedValue.getMinutes()}`
    }

    return this.addDateBasedWhere('Time', column, checkedOperator, checkedValue, boolean)
  }

  /**
   * Add an "or where time" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {*}
   */
  orWhereTime (column, operator, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereTime(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a "where day" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {*}
   */
  whereDay (column, operator, value = null, boolean = 'and') {
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
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

  /**
   * Add an "or where day" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {*}
   */
  orWhereDay (column, operator, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereDay(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a "where month" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {*}
   */
  whereMonth (column, operator, value = null, boolean = 'and') {
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = checkedValue.getMonth()
    }

    if (!(checkedValue instanceof Expression)) {
      checkedValue = checkedValue.padStart(2, '0')
    }

    return this.addDateBasedWhere('Month', column, checkedOperator, checkedValue, boolean)
  }

  /**
   * Add an "or where month" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {*}
   */
  orWhereMonth (column, operator, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereMonth(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a "where year" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {*}
   */
  whereYear (column, operator, value = null, boolean = 'and') {
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    if (checkedValue instanceof Date) {
      checkedValue = checkedValue.getFullYear()
    }

    return this.addDateBasedWhere('Year', column, checkedOperator, checkedValue, boolean)
  }

  /**
   * Add an "or where year" statement to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {*}
   */
  orWhereYear (column, operator, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.whereYear(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a date based (year, month, day, time) statement to the query.
   *
   * @param type
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {Builder}
   */
  addDateBasedWhere (type, column, operator, value, boolean = 'and') {
    this.wheres = [...this.wheres, { column, type, boolean, operator, value }]

    if (!(value instanceof Expression)) {
      this.addBinding(value, 'where')
    }

    return this
  }

  /**
   * Add a "where" clause comparing two columns to the query.
   *
   * @param first
   * @param operator
   * @param second
   * @param boolean
   * @returns {Builder|*}
   */
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

  /**
   * Add an "or where" clause comparing two columns to the query.
   *
   * @param first
   * @param operator
   * @param second
   * @returns {Builder|*}
   */
  orWhereColumn (first, operator = null, second = null) {
    return this.whereColumn(first, operator, second, 'or')
  }

  /**
   * Add a "group by" clause to the query.
   *
   * @param groups
   * @returns {Builder}
   */
  groupBy (...groups) {
    groups.forEach(group => {
      this.groups = [...(this.groups || []), group]
    })

    return this
  }

  /**
   * Add a "having" clause to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @param boolean
   * @returns {Builder}
   */
  having (column, operator = null, value = null, boolean = 'and') {
    const type = 'Basic'

    // Here we will make some assumptions about the operator. If only 2 values are
    // passed to the method, we will assume that the operator is an equals sign
    // and keep going. Otherwise, we'll require the operator to be passed in.
    let [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    // If the given operator is not found in the list of valid operators we will
    // assume that the developer is just short-cutting the '=' operators and
    // we will set the operators to '=' and set the values appropriately.
    if (Builder.invalidOperator(operator)) {
      checkedValue = checkedOperator
      checkedOperator = '='
    }

    this.havings = [...(this.havings || []), { type, column, operator: checkedOperator, value: checkedValue, boolean }]

    if (!(checkedValue instanceof Expression)) {
      this.addBinding(checkedValue, 'having')
    }

    return this
  }

  /**
   * Add a "or having" clause to the query.
   *
   * @param column
   * @param operator
   * @param value
   * @returns {Builder}
   */
  orHaving (column, operator = null, value = null) {
    const [ checkedValue, checkedOperator ] = this.prepareValueAndOperator(
      value, operator, arguments.length === 2
    )

    return this.having(column, checkedOperator, checkedValue, 'or')
  }

  /**
   * Add a "having between " clause to the query.
   *
   * @param column
   * @param values
   * @param boolean
   * @param not
   * @returns {Builder}
   */
  havingBetween (column, values, boolean = 'and', not = false) {
    const type = 'Between'

    this.havings = [...(this.havings || []), { type, column, values, boolean, not }]

    this.addBinding(this.cleanBindings(values), 'having')

    return this
  }

  /**
   * Add a raw having clause to the query.
   *
   * @param sql
   * @param bindings
   * @param boolean
   * @returns {Builder}
   */
  havingRaw (sql, bindings = [], boolean = 'and') {
    const type = 'Raw'

    this.havings = [...(this.havings || []), { type, sql, boolean }]

    this.addBinding(bindings, 'having')

    return this
  }

  /**
   * Add a raw or having clause to the query.
   *
   * @param sql
   * @param bindings
   * @returns {Builder}
   */
  orHavingRaw (sql, bindings = []) {
    return this.havingRaw(sql, bindings, 'or')
  }

  /**
   * Add an "order by" clause to the query.
   *
   * @param column
   * @param direction
   * @returns {Builder}
   */
  orderBy (column, direction = 'asc') {
    const orderType = this.unions ? 'unionOrders' : 'orders'

    if (column instanceof Builder ||
      isFunction(column)) {
      const { query, bindings } = this.createSub(column)

      column = new Expression(`(${query})`)

      this.addBinding(bindings, orderType)
    }

    direction = direction.toLowerCase()

    if (!(['asc', 'desc']).find(d => d === direction)) {
      throw new Error('Order direction must be "asc" or "desc".')
    }

    this[orderType] = [...(this[orderType] || []), { column, direction }]

    return this
  }

  /**
   * Add a descending "order by" clause to the query.
   *
   * @param column
   * @returns {Builder}
   */
  orderByDesc (column) {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add an "order by" clause for a timestamp to the query.
   *
   * @param column
   * @returns {Builder}
   */
  latest (column = 'created_at') {
    return this.orderBy(column, 'desc')
  }

  /**
   * Add an "order by" clause for a timestamp to the query.
   *
   * @param column
   * @returns {Builder}
   */
  oldest (column = 'created_at') {
    return this.orderBy(column, 'asc')
  }

  /**
   * Put the query's results in random order.
   *
   * @param seed
   * @returns {*}
   */
  inRandomOrder (seed = '') {
    return this.orderByRaw(this.grammar.compileRandom(seed))
  }

  /**
   * Add a raw "order by" clause to the query.
   *
   * @param sql
   * @param bindings
   * @returns {Builder}
   */
  orderByRaw (sql, bindings = []) {
    const type = 'Raw'
    const orderType = this.unions ? 'unionOrders' : 'orders'

    this[orderType] = [...(this[orderType] || []), { type, sql }]

    this.addBinding(bindings, 'order')

    return this
  }

  /**
   * Alias to set the "offset" value of the query.
   *
   * @param value
   * @returns {Builder}
   */
  skip (value) {
    const property = this.unions ? 'unionOffset' : 'offset'

    this[property] = Math.max(0, value)

    return this
  }

  /**
   * Alias to set the "limit" value of the query.
   *
   * @param value
   * @returns {Builder}
   */
  take (value) {
    const property = this.unions ? 'unionLimit' : 'limit'

    if (value >= 0) {
      this[property] = value
    }

    return this
  }

  /**
   * Set the limit and offset for a given page.
   *
   * @param page
   * @param perPage
   * @returns {Builder}
   */
  forPage (page, perPage = 15) {
    return this.skip((page - 1) * perPage).take(perPage)
  }

  /**
   * Add a join clause to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @param  type
   * @param  where
   * @return {Builder}
   */
  join (table, first, operator = null, second = null, type = 'inner', where = false) {
    const join = this.newJoinClause(this, type, table)

    if (isFunction(first)) {
      first(join)

      this.joins = [...this.joins, join]

      this.addBinding(join.getBindings(), 'join')
    } else {
      const method = where ? 'where' : 'on'

      this.joins = [...this.joins, join[method](first, operator, second)]

      this.addBinding(join.getBindings(), 'join');
    }

    return this;
  }

  /**
   * Add a "join where" clause to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @param  type
   * @return {Builder}
   */
  joinWhere (table, first, operator, second, type = 'inner') {
    return this.join(table, first, operator, second, type, true)
  }

  /**
   * Add a subquery join clause to the query.
   *
   * @param  query
   * @param  as
   * @param  first
   * @param  operator
   * @param  second
   * @param  type
   * @param  where
   * @return {Builder}
   */
  joinSub (query, as, first, operator = null, second = null, type = 'inner', where = false) {
    const { checkedQuery, bindings } = this.createSub(query)

    const expression = `(${checkedQuery}) as ${this.grammar.wrapTable(as)}`

    this.addBinding(bindings, 'join')

    return this.join(new Expression(expression), first, operator, second, type, where)
  }

  /**
   * Add a left join to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  leftJoin (table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, 'left')
  }

  /**
   * Add a "join where" clause to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  leftJoinWhere (table, first, operator, second) {
    return this.joinWhere(table, first, operator, second, 'left')
  }

  /**
   * Add a subquery left join to the query.
   *
   * @param  query
   * @param  as
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  leftJoinSub (query, as, first, operator = null, second = null) {
    return this.joinSub(query, as, first, operator, second, 'left')
  }

  /**
   * Add a right join to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  rightJoin (table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, 'right')
  }

  /**
   * Add a "right join where" clause to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  rightJoinWhere (table, first, operator, second) {
    return this.joinWhere(table, first, operator, second, 'right')
  }

  /**
   * Add a subquery right join to the query.
   *
   * @param  query
   * @param  as
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  rightJoinSub (query, as, first, operator = null, second = null) {
    return this.joinSub(query, as, first, operator, second, 'right')
  }

  /**
   * Add a "cross join" clause to the query.
   *
   * @param  table
   * @param  first
   * @param  operator
   * @param  second
   * @return {Builder}
   */
  crossJoin (table, first = null, operator = null, second = null) {
    if (first) {
      return this.join(table, first, operator, second, 'cross')
    }

    this.joins = [...this.joins, this.newJoinClause(this, 'cross', table)]

    return this
  }

  /**
   * Get a new join clause.
   *
   * @param  parentQuery
   * @param  type
   * @param  table
   * @return {Builder}
   */
  newJoinClause (parentQuery, type, table) {
    return this.createJoinClause(parentQuery, type, table)
  }

  /**
   *
   * @param parentQuery
   * @param type
   * @param table
   */
  createJoinClause (parentQuery, type, table) {
    const builder = this.newQuery()
    builder.clause = 'join'
    builder.type = type
    builder.table = table
    builder.parentClass = parentQuery.constructor.name
    return builder
  }

  /**
   *
   * @param first
   * @param operator
   * @param second
   * @param boolean
   * @returns {Builder|*}
   */
  on (first, operator = null, second = null, boolean = 'and') {
    if (isFunction(first)) {
      return this.whereNested(first, boolean)
    }

    return this.whereColumn(first, operator, second, boolean)
  }

  /**
   *
   * @param first
   * @param operator
   * @param second
   * @returns {Builder|*}
   */
  orOn (first, operator = null, second = null) {
    return this.on(first, operator, second, 'or')
  }

  /**
   * Add a union statement to the query.
   *
   * @param query
   * @param all
   * @returns {Builder}
   */
  union (query, all = false) {
    if (isFunction(query)) {
      query(this.newQuery())
    }

    this.unions = isNull(this.unions) ? [] : this.unions

    this.unions = [...this.unions, { query, all }]

    this.addBinding(query.getBindings(), 'union')

    return this
  }

  /**
   * Add a union all statement to the query.
   *
   * @param query
   * @returns {Builder}
   */
  unionAll (query) {
    return this.union(query, true)
  }

  /**
   * Determine if any rows exist for the current query.
   *
   * @return boolean
   */
  async exists () {
    let results = await this.connection.get({
      sql: this.grammar.compileExists(this),
      params: this.getBindings()
    })

    // If the results has rows, we will get the row and see if the exists column is a
    // boolean true. If there is no results for this query we will return false as
    // there are no rows for this query at all and we can return that info here.
    if (!isUndefined(results[0])) {
      results = results[0]
      return !!results['exists']
    }

    return false
  }

  /**
   * Determine if no rows exist for the current query.
   *
   * @return boolean
   */
  async doesntExist () {
    return ! await this.exists()
  }

  /**
   * Execute the given callback if no rows exist for the current query.
   *
   * @param  callback
   * @return mixed
   */
  async existsOr (callback) {
    return await this.exists() ? true : callback()
  }

  /**
   * Execute the given callback if rows exist for the current query.
   *
   * @param callback
   * @return mixed
   */
  async doesntExistOr(callback) {
    return await this.doesntExist() ? true : callback()
  }

  /**
   * Retrieve the "count" result of the query.
   *
   * @param columns
   * @return mixed
   */
  count (columns = '*') {
    return this.startAggregate('count', Builder.wrap(columns))
  }

  /**
   * Retrieve the minimum value of a given column.
   *
   * @param column
   * @return mixed
   */
  min (column) {
    return this.startAggregate('min', [column])
  }

  /**
   * Retrieve the maximum value of a given column.
   *
   * @param column
   * @return mixed
   */
  max (column) {
    return this.startAggregate('max', [column])
  }

  /**
   * Retrieve the sum of the values of a given column.
   *
   * @param column
   * @return mixed
   */
  async sum (column) {
    const result = await this.startAggregate('sum', [column])
    return result ? result : 0
  }

  /**
   * Retrieve the average of the values of a given column.
   *
   * @param column
   * @return mixed
   */
  avg (column) {
    return this.startAggregate('avg', [column])
  }

  /**
   * Alias for the "avg" method.
   *
   * @param column
   * @return mixed
   */

  average (column) {
    return this.avg(column)
  }

  /**
   * Execute an aggregate function on the database.
   *
   * @param functionName
   * @param columns
   * @return mixed
   */
  async startAggregate(functionName, columns = ['*']) {
    let results = this.cloneWithout(this.unions ? [] : ['columns'])
      .cloneWithoutBindings(this.unions ? [] : ['select'])
      .setAggregate(functionName, columns)

    results = await results.get()

    if (!isNull(results)) {
      return results[0]['aggregate']
    }
  }

  /**
   * Set the aggregate property without running the query.
   *
   * @param functionName
   * @param columns
   * @return this
   */
  setAggregate(functionName, columns) {
    this.aggregate = {functionName, columns}

    if (isNull(this.groups)) {
      this.orders = null
      this.bindings['order'] = []
    }

    return this
  }

  /**
   * Clone the query without the given properties.
   *
   * @param properties
   * @return static
   */
  cloneWithout (properties) {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);

    properties.forEach(property => {
      clone[property] = null
    })

    return clone
  }

  /**
   * Clone the query without the given bindings.
   *
   * @param except
   * @return static
   */
  cloneWithoutBindings (except) {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);

    except.forEach(type => {
      clone.bindings[type] = []
    })

    return clone
  }

  /**
   * Get a new instance of the query builder.
   *
   * @returns {Builder}
   */
  newQuery () {
    return new this.constructor(this.connection, this.grammar)
  }

  /**
   * Create a new query instance for a sub-query.
   *
   * @returns {Builder}
   */
  forSubQuery () {
    return this.newQuery();
  }

  /**
   * Create a raw database expression.
   *
   * @param value
   * @returns {*}
   */
  raw (value) {
    return this.connection.raw(value)
  }

  /**
   * Remove all of the expressions from a list of bindings.
   *
   * @param bindings
   * @returns {*}
   */
  cleanBindings (bindings) {
    return bindings.filter(binding => !(binding instanceof Expression))
  }

  /**
   * Get the database connection instance.
   *
   * @return {Connection}
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Add a subselect expression to the query.
   *
   * @param query
   * @param as
   * @returns {Builder}
   */
  selectSub (query, as) {
    const [ checkedQuery, bindings ] = this.createSub(query)
    return this.selectRaw(
      `(${checkedQuery}) as ${this.grammar.wrap(as)}`, bindings
    )
  }

  /**
   * Add a full sub-select to the query.
   *
   * @param column
   * @param operator
   * @param callback
   * @param boolean
   * @returns {Builder}
   */
  whereSub (column, operator, callback, boolean) {
    const type = 'Sub'
    const query = this.forSubQuery()

    callback(query)
    this.wheres = [...this.wheres, { type, column, operator, query, boolean }]
    this.addBinding(query.getBindings(), 'where')

    return this
  }

  /**
   * Add an exists clause to the query.
   *
   * @param  {Function} callback
   * @param  {String}   boolean
   * @param  {Boolean}     not
   * @return this
   */
  whereExists(callback, boolean = 'and', not = false) {
    const query = this.forSubQuery();

    // Similar to the sub-select clause, we will create a new query instance so
    // the developer may cleanly specify the entire exists query and we will
    // compile the whole thing in the grammar and insert it into the SQL.
    callback(query);

    return this.addWhereExistsQuery(query, boolean, not);
  }

  /**
   * Add an or exists clause to the query.
   *
   * @param  {Function} callback
   * @param  {Boolean}     not
   * @return {Builder}
   */
  orWhereExists(callback, not = false)
  {
    return this.whereExists(callback, 'or', not);
  }

  /**
   * Add a where not exists clause to the query.
   *
   * @param  {Function} callback
   * @param  {String}   boolean
   * @return {Builder}
   */
  whereNotExists(callback, boolean = 'and')
  {
    return this.whereExists(callback, boolean, true);
  }

  /**
   * Add a where not exists clause to the query.
   *
   * @param  {Function}  callback
   * @return {Builder}
   */
  orWhereNotExists(callback)
  {
    return this.orWhereExists(callback, true);
  }

  /**
   * Add an exists clause to the query.
   *
   * @param  {Builder} query
   * @param  {String}  boolean
   * @param  {Boolean}  not
   * @return this
   */
  addWhereExistsQuery(query, boolean = 'and', not = false)
  {
    const type = not ? 'NotExists' : 'Exists';

    this.wheres = [...this.wheres, { type, query, boolean }];

    this.addBinding(query.getBindings(), 'where');

    return this;
  }

  /**
   * Creates a subquery and parse it.
   *
   * @param query
   * @returns {[*, *]|[*, []]}
   */
  createSub (query) {
    if (isFunction(query)) {
      const callback = query
      callback(query = this.forSubQuery())
    }

    return this.parseSub(query)
  }

  /**
   * Parse the subquery into SQL and bindings.
   *
   * @param query
   * @returns {*[]}
   */
  parseSub (query) {
    if (query instanceof this.constructor) {
      return [query.toSql(), query.getBindings()]
    } else if (isString(query)) {
      return [query, []]
    } else {
      throw new Error('Invalid argument')
    }
  }

  /**
   * Add a binding to the query.
   *
   * @param value
   * @param type
   * @returns {Builder}
   */
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

  /**
   * Get the current query value bindings in a flattened array.
   *
   * @returns {Array}
   */
  getBindings () {
    return Object.values(this.bindings).flat()
  }

  /**
   * Prepare the value and operator for a where clause.
   *
   * @param  {String}  value
   * @param  {String}  operator
   * @param  {Boolean}  useDefault
   * @return {Array}
   *
   * @throws Error
   */
  prepareValueAndOperator(value, operator, useDefault = false) {
    if (useDefault) {
      return [operator, '='];
    } else if (this.constructor.invalidOperatorAndValue(operator, value)) {
      throw new Error('Illegal operator and value combination.');
    }

    return [value, operator];
  }

  /**
   * Determine if the given operator and value combination is legal.
   *
   * Prevents using Null values with invalid operators.
   *
   * @param operator
   * @param value
   * @returns {*|boolean}
   */
  static invalidOperatorAndValue (operator, value) {
    return isNull(value) &&
      operators.find(op => op === operator) &&
      !['=', '<>', '!='].find(op => op === operator)
  }

  /**
   * Determine if the given operator is supported.
   *
   * @param target
   * @returns {boolean}
   */
  static invalidOperator (target) {
    return !operators.find(operator => operator === target)
  }

  /**
   * Add an array of where clauses to the query.
   *
   * @param column
   * @param boolean
   * @param method
   * @returns {*}
   */
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

  /**
   * Add a nested where statement to the query.
   *
   * @param callback
   * @param boolean
   * @returns {*}
   */
  whereNested (callback, boolean = 'and') {
    const query = callback(this.forNestedWhere())
    return this.addNestedWhereQuery(query, boolean)
  }

  /**
   * Create a new query instance for nested where condition.
   *
   * @returns {Builder}
   */
  forNestedWhere () {
    return this.newQuery().table(this.from)
  }

  /**
   * Add another query builder as a nested where to the query builder.
   *
   * @param query
   * @param boolean
   * @returns {Builder}
   */
  addNestedWhereQuery (query, boolean = 'and') {
    if (query.wheres.length) {
      const type = 'Nested'
      this.wheres = [...this.wheres, { type, query, boolean }]
      this.addBinding(query.getRawBindings().where, 'where')
    }

    return this
  }

  /**
   * Get the raw array of bindings.
   *
   * @returns {{select: [], having: [], where: [], join: [], union: [], order: []}|*}
   */
  getRawBindings () {
    return this.bindings
  }

  /**
   *
   * @param value
   * @returns {*[]}
   */
  static wrap (value) {
    return !Array.isArray(value) ? [value] : value
  }

  /**
   *
   * @param target
   * @param key
   * @returns {*|boolean}
   */
  static hasKey (target, key) {
    return isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }

  /**
   *
   * @returns {string}
   */
  toSql () {
    return this.grammar.compileSelect(this)
    // return this.compileSelect()
  }

  /**
   *
   * @returns {{params: *, sql: *}}
   */
  collect () {
    const sql = this.toSql()
    const params = this.getBindings()

    return { sql, params }
  }

  /**
   *
   * @returns {*}
   */
  get () {
    return this.connection.get(this.collect())
  }

  /**
   *
   * @returns {*}
   */
  first (columns = ['*']) {
    this.select(columns)
    return this.connection.first(this.collect())
  }

  /**
   * Insert a new record into the database.
   *
   * @param values
   * @return boolean
   */
  insert (values) {
    // Since every insert gets treated like a batch insert, we will make sure the
    // bindings are structured in a way that is convenient when building these
    // inserts statements by verifying these elements are actually an array.
    if (isNull(values)) {
      return true
    }

    if (! Array.isArray(values)) {
      values = [values]
    }
    // Here, we will sort the insert keys for every record so that each insert is
    // in the same order for the record. We need to make sure this is the case
    // so there are not any errors or problems when inserting these records.
    else {
      values.forEach((value, key) => {
        ksort(value)
        values[key] = value
      })
    }
    // Finally, we will run this query against the database connection and return
    // the results. We will need to also flatten these bindings before running
    // the query so they are all in one huge, flattened array for execution.
    return this.connection.insert({
      sql: this.grammar.compileInsert(this, values),
      params: this.cleanBindings(flattenArrayOfObjects(values))
    })
  }

  /**
   * Insert a new record into the database while ignoring errors.
   *
   * @param values
   * @return int
   */
  insertOrIgnore (values) {
    if (isNull(values)) {
      return 0
    }

    if (! Array.isArray(values)) {
      values = [values]
    } else {
      values.forEach((value, key) => {
        ksort(value)
        values[key] = value
      })
    }

    return this.connection.affectingStatement({
      sql: this.grammar.compileInsertOrIgnore(this, values),
      params: this.cleanBindings(flattenArrayOfObjects(values))
    });
  }

  /**
   * Insert a new record and get the value of the primary key.
   *
   * @param values
   * @param sequence
   * @return int
   */
  insertGetId (values, sequence = null) {
    const sql = this.grammar.compileInsertGetId(this, values, sequence)
    values = this.cleanBindings(Object.values(values))
    return this.connection.processInsertGetId({sql, params: values, sequence})
  }

  /**
   * Insert new records into the table using a subquery.
   *
   * @param  columns
   * @param  query
   * @return int
   */
  insertUsing (columns, query) {
    const [ sql, bindings ] = this.createSub(query)
    return this.connection.affectingStatement(
      this.grammar.compileInsertUsing(this, columns, sql),
      this.cleanBindings(bindings)
    )
  }

  /**
   * Update a record in the database.
   *
   * @param  values
   * @return int
   */
  update (values) {
    const sql = this.grammar.compileUpdate(this, values)
    return this.connection.update({
      sql,
      params: this.cleanBindings(
        this.grammar.prepareBindingsForUpdate(this.bindings, values)
      )
    })
  }

  /**
   * Insert or update a record matching the attributes, and fill it with values.
   *
   * @param  attributes
   * @param  values
   * @return boolean
   */
  async updateOrInsert (attributes, values = {}) {
    if (! await this.where(...objectToArray(attributes)).exists()) {
      return this.insert({...attributes, ...values})
    }

    if (isNull(values)) {
      return true
    }

    return !! this.take(1).update(values)
  }

  /**
   * Increment a column's value by a given amount.
   *
   * @param  column
   * @param  amount
   * @param  extra
   * @return int
   *
   * @throws \InvalidArgumentException
   */
  increment (column, amount = 1, extra = {}) {
    if (! isNumber(amount)) {
      throw Error('Non-numeric value passed to increment method.')
    }
    const wrapped = this.grammar.wrap(column)
    const columns = {
      [column]: (new Expression(`${wrapped} + ${amount}`)),
      ...extra
    }

    return this.update(columns)
  }

  /**
   * Decrement a column's value by a given amount.
   *
   * @param  column
   * @param  amount
   * @param  extra
   * @return int
   *
   * @throws \InvalidArgumentException
   */
  decrement (column, amount = 1, extra = {}) {
    if (! isNumber(amount)) {
      throw new Error('Non-numeric value passed to decrement method.')
    }

    const wrapped = this.grammar.wrap(column)
    const columns = {
      [column]: (new Expression(`${wrapped} - ${amount}`)),
      ...extra
    }

    return this.update(columns)
  }

  /**
   * Delete a record from the database.
   *
   * @param id
   * @return int
   */
  delete (id = null) {
    // If an ID is passed to the method, we will set the where clause to check the
    // ID to let developers to simply and quickly remove a single row from this
    // database without manually specifying the "where" clauses on the query.
    if (! isNull(id)) {
      this.where(`${this.from}.id`, '=', id)
    }

    return this.connection.delete({
      sql: this.grammar.compileDelete(this),
      params: this.cleanBindings(
        this.grammar.prepareBindingsForDelete(this.bindings)
      )
    })
  }

  /**
   * Run a truncate statement on the table.
   *
   * @return Promise
   */
  truncate () {
    const statements = this.grammar.compileTruncate(this)
    let sqls = [],
      params = [];

    if (Array.isArray(statements)) {
      statements.forEach((statement) => {
        sqls = [...sqls, objectKey(statement)]
        params = [...params, objectVal(statement)]
      })
    } else {
      sqls = [objectKey(statements)]
      params = [objectVal(statements)]
    }

    return this.connection.statement({sqls, params})
  }

  /**
   * Execute a query for a single record by ID.
   *
   * @param id
   * @param columns
   * @return mixed|static
   */
  find (id, columns = ['*']) {
    return this.where('id', '=', id).first(columns)
  }

  /**
   * Get a single column's value from the first result of a query.
   *
   * @param column
   * @return mixed
   */
  async value (column) {
    const result = await this.first([column])
    return result.length > 0 ? result : null
  }

  /**
   * Execute the given callback while selecting the given columns.
   *
   * After running the callback, the columns are reset to the original value.
   *
   * @param columns
   * @param callback
   * @return mixed
   */
  async onceWithColumns (columns, callback) {
    let original = this.columns

    if (isNull(original)) {
      this.columns = columns
    }

    let result = await callback()
    this.columns = original
    return result
  }

  /**
   * Get an array with the values of a given column.
   *
   * @param column
   * @param key
   * @return any
   */
  async pluck (column, key = null) {
    // First, we will need to select the results of the query accounting for the
    // given columns / key. Once we have the results, we will be able to take
    // the results and get the exact data that was requested for the query.
    let queryResult = await this.onceWithColumns(
      isNull(key) ? [column] : [column, key],
      () => this.get()
    )

    if (!isNull(queryResult)) {
      return queryResult
    }

    // If the columns are qualified with a table or have an alias, we cannot use
    // those directly in the "pluck" operations since the results from the DB
    // are only keyed by the column itself. We'll strip the table out here.
    column = this.stripTableForPluck(column)
    key = this.stripTableForPluck(key)

    return this.pluckFromObjectColumn(queryResult, column, key)
  }

  /**
   * Strip off the table name or alias from a column identifier.
   *
   * @param column
   * @return string|null
   */
  stripTableForPluck (column) {
    return isNull(column) ? column : last(column.split(/~\.| ~/));
  }

  /**
   * Retrieve column values from rows represented as objects.
   *
   * @param queryResult
   * @param column
   * @param key
   * @return any
   */
  pluckFromObjectColumn (queryResult, column, key) {
    let results = []

    if (isNull(key)) {
      queryResult.forEach(row => {
        results = [...results, row.column]
      })
    } else {
      queryResult.forEach(row => {
        results[row.key] = row.column
      })
    }

    return results
  }
}
