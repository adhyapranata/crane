import Expression from './Expression'
import { isString, isNull, isUndefined, isObject } from './DataType'
import { upperCaseFirstLetter } from './Utilities'

export default class Grammar {
  constructor () {
    this.tablePrefix = ''
    this.operators = []
    this.selectComponents = [
      'aggregate',
      'columns',
      'from',
      'joins',
      'wheres',
      'groups',
      'havings',
      'orders',
      'limit',
      'offset',
      'lock'
    ]
  }

  /**
   *
   * @param query
   * @returns {string|*|string}
   */
  compileSelect (query) {
    if (query.unions && query.aggregate) {
      return this.compileUnionAggregate(query)
    }

    const original = query.columns

    if (isNull(query.columns)) {
      query.columns = ['*']
    }

    let sql = this.concatenate(
      this.compileComponents(query)).trim()

    if (query.unions) {
      sql = `${this.wrapUnion(sql)} ${this.compileUnions(query)}`
    }

    query.columns = original

    sql = sql.replace(/"/g, '')

    return sql
  }

  /**
   *
   * @param query
   * @returns {[]}
   */
  compileComponents (query) {
    let sql = []

    this.selectComponents.forEach(component => {
      if (!isUndefined(query[component]) && !isNull(query[component])) {
        const method = `compile${upperCaseFirstLetter(component)}`

        sql = [...sql, this[method](query, query[component])]
      }
    })

    return sql
  }

  /**
   *
   * @param query
   * @param aggregate
   * @returns {string}
   */
  compileAggregate (query, aggregate) {
    let column = this.columnize(aggregate.columns)

    if (Array.isArray(query.distinct)) {
      column = `distinct ${this.columnize(query.distinct)}`
    } else if (query.distinct && column !== '*') {
      column = `distinct ${column}`
    }

    return `select ${aggregate.function}(${column}) as aggregate`
  }

  /**
   *
   * @param query
   * @param columns
   * @returns {* | string}
   */
  compileColumns (query, columns) {
    if (!isNull(query.aggregate)) {
      return
    }

    let select = 'select '

    if (query.distinct) {
      select = 'select distinct '
    }

    return `${select}${this.columnize(columns)}`
  }

  /**
   *
   * @param query
   * @param table
   * @returns {string}
   */
  compileFrom (query, table) {
    return `from ${this.wrapTable(table)}`
  }

  /**
   *
   * @param query
   * @param joins
   * @returns {SourceNode | * | string}
   */
  compileJoins (query, joins) {
    return joins.map(join => {
      const table = this.wrapTable(join.table)

      const nestedJoins = isNull(join.joins) ? '' : ` ${this.compileJoins(query, join.joins)}`

      const tableAndNestedJoins = isNull(join.joins) ? table : `(${table[nestedJoins]})`

      return (`${join.type} join ${tableAndNestedJoins} ${this.compileWheres(join)}`).trim()
    }).join(' ')
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileWheres (query) {
    if (isNull(query.wheres)) {
      return ''
    }

    const sql = this.compileWheresToArray(query)

    if (sql.length > 0) {
      return this.concatenateWhereClauses(query, sql)
    }

    return ''
  }

  /**
   *
   * @param query
   * @returns {string[]}
   */
  compileWheresToArray (query) {
    return query.wheres.map(where => {
      return `${where.boolean} ${this[`where${where.type}`](query, where)}`
    })
  }

  /**
   *
   * @param query
   * @param sql
   * @returns {string}
   */
  concatenateWhereClauses (query, sql) {
    const conjunction = query.hasOwnProperty('clause') && query.clause === 'join' ? 'on' : 'where'

    return `${conjunction} ${this.removeLeadingBoolean(sql.join(' '))}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {*}
   */
  whereRaw (query, where) {
    return where.sql
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereBasic (query, where) {
    const value = Grammar.parameter(where.value)

    return `${this.wrap(where.column)} ${where.operator} ${value}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereIn (query, where) {
    if (!where.values.length) {
      return `${this.wrap(where.column)} in (${this.parameterize(where.values)})`
    }

    return '0 = 1'
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNotIn (query, where) {
    if (!where.values.length) {
      return `${this.wrap(where.column)} not in (${this.parameterize(where.values)})`
    }

    return '1 = 1'
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNotInRaw (query, where) {
    if (!where.values.length) {
      return `${this.wrap(where.column)} not in (${where.values.join(', ')})`
    }

    return '1 = 1'
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereInRaw (query, where) {
    if (!where.values.length) {
      return `${this.wrap(where.column)} in (${where.values.join(', ')})`
    }

    return '0 = 1'
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNull (query, where) {
    return `${this.wrap(where.column)} is null`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNotNull (query, where) {
    return `${this.wrap(where.column)} is not null`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereBetween (query, where) {
    const between = where.not ? 'not between' : 'between'

    const min = Grammar.parameter(where.values[0])

    const max = Grammar.parameter(where.values[where.values.length - 1])

    return `${this.wrap(where.column)} ${between} ${min} and ${max}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereDate (query, where) {
    return this.dateBasedWhere('date', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereTime (query, where) {
    return this.dateBasedWhere('time', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereDay (query, where) {
    return this.dateBasedWhere('day', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereMonth (query, where) {
    return this.dateBasedWhere('month', query, where)
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereYear (query, where) {
    return this.dateBasedWhere('year', query, where)
  }

  /**
   *
   * @param type
   * @param query
   * @param where
   * @returns {string}
   */
  dateBasedWhere (type, query, where) {
    const value = Grammar.parameter(where.value)

    return `${type}(${this.wrap(where.column)}) ${where.operator} ${value}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereColumn (query, where) {
    return `${this.wrap(where.first)} ${where.operator} ${this.wrap(where.second)}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNested (query, where) {
    const offset = query.hasOwnProperty('clause') && query.clause === 'join' ? 3 : 6

    return `(${this.compileWheres(where.query).substring(offset)})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereSub (query, where) {
    const select = this.compileSelect(where.query)

    return `${this.wrap(where.column)} ${where.operator} (${select})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereExists (query, where) {
    return `exists (${this.compileSelect(where.query)})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereNotExists (query, where) {
    return `not exists (${this.compileSelect(where.query)})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereRowValues (query, where) {
    const columns = this.columnize(where.columns)

    const values = this.parameterize(where.values)

    return `(${columns}) ${where.operator} (${values})`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereJsonBoolean (query, where) {
    const column = this.wrapJsonBooleanSelector(where.column)

    const value = this.wrapJsonBooleanValue(
      Grammar.parameter(where.value)
    )

    return `${column} ${where.operator} ${value}`
  }

  /**
   *
   * @param query
   * @param where
   * @returns {string}
   */
  whereJsonContains (query, where) {
    const not = where.not ? 'not ' : ''

    return `${not}${this.compileJsonContains(where.column, Grammar.parameter(where.value))}`
  }

  /**
   *
   * @param column
   * @param value
   */
  compileJsonContains (column, value) {
    throw new Error('This database engine does not support JSON contains operations.')
  }

  /**
   *
   * @param binding
   * @returns {string}
   */
  prepareBindingForJsonContains (binding) {
    return JSON.stringify(binding)
  }

  /**
   *
   * @param query
   * @param where
   */
  whereJsonLength (query, where) {
    return this.compileJsonLength(
      where.column, where.operator, Grammar.parameter(where.value)
    )
  }

  /**
   *
   * @param column
   * @param operator
   * @param value
   */
  compileJsonLength (column, operator, value) {
    throw new Error('This database engine does not support JSON length operations.')
  }

  /**
   *
   * @param query
   * @param groups
   * @returns {string}
   */
  compileGroups (query, groups) {
    return `group by ${this.columnize(groups)}`
  }

  /**
   *
   * @param query
   * @param havings
   * @returns {string}
   */
  compileHavings (query, havings) {
    const sql = havings.map(having => this.compileHaving(having)).join(' ')

    return `having ${this.removeLeadingBoolean(sql)}`
  }

  /**
   *
   * @param having
   * @returns {string}
   */
  compileHaving (having) {
    if (having.type === 'Raw') {
      return `${having.boolean} ${having.sql}`
    } else if (having.type === 'between') {
      return this.compileHavingBetween(having)
    }

    return this.compileBasicHaving(having)
  }

  /**
   *
   * @param having
   * @returns {string}
   */
  compileBasicHaving (having) {
    const column = this.wrap(having.column)

    const parameter = Grammar.parameter(having.value)

    return `${having.boolean} ${column} ${having.operator} ${parameter}`
  }

  /**
   *
   * @param having
   * @returns {string}
   */
  compileHavingBetween (having) {
    const between = having.not ? 'not between' : 'between'

    const column = this.wrap(having.column)

    const min = Grammar.parameter(having.values[0])

    const max = Grammar.parameter(having.values[having.values.length - 1])

    return `${having.boolean} ${column} ${between} ${min} and ${max}`
  }

  /**
   *
   * @param query
   * @param orders
   * @returns {string}
   */
  compileOrders (query, orders) {
    if (!orders.length) {
      return `order by ${this.compileOrdersToArray(query, orders).join(', ')}`
    }

    return ''
  }

  /**
   *
   * @param query
   * @param orders
   * @returns {*}
   */
  compileOrdersToArray (query, orders) {
    return orders.map(order => {
      return !isUndefined(order.sql) ? order.sql : `${this.wrap(order.column)} ${order.direction}`
    })
  }

  /**
   *
   * @param seed
   * @returns {string}
   */
  compileRandom (seed) {
    return 'RANDOM()'
  }

  /**
   *
   * @param query
   * @param limit
   * @returns {string}
   */
  compileLimit (query, limit) {
    return `limit ${parseInt(limit)}`
  }

  /**
   *
   * @param query
   * @param offset
   * @returns {string}
   */
  compileOffset (query, offset) {
    return `limit ${parseInt(offset)}`
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileUnions (query) {
    let sql = ''

    query.unions.forEach(union => {
      sql += this.compileUnion(union)
    })

    if (!isNull(query.unionOrders)) {
      sql += ` ${this.compileOrders(query, query.unionOrders)}`
    }

    if (!isUndefined(query.unionLimit) && !isNull(query.unionLimit)) {
      sql += ` ${this.compileLimit(query, query.unionLimit)}`
    }

    if (!isUndefined(query.unionOffset) && !isNull(query.unionOffset)) {
      sql += ` ${this.compileOffset(query, query.unionOffset)}`
    }

    return sql.trimLeft()
  }

  /**
   *
   * @param union
   * @returns {string}
   */
  compileUnion (union) {
    const conjunction = union.all ? ' union all ' : ' union '

    return `${conjunction}${this.wrapUnion(union.query.toSql())}`
  }

  /**
   *
   * @param sql
   * @returns {string}
   */
  wrapUnion (sql) {
    return `(${sql})`
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileUnionAggregate (query) {
    const sql = this.compileAggregate(query, query.aggregate)

    query.aggregate = null

    return `${sql} from (${this.compileSelect(query)}) as ${this.wrapTable('temp_table')}`
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileExists (query) {
    const select = this.compileSelect(query)

    return `select exists(${select}) as ${this.wrap('exists')}`
  }

  /**
   *
   * @param query
   * @param values
   * @returns {string}
   */
  compileInsert (query, values) {
    const table = this.wrapTable(query.from)

    if (!Array.isArray(values.length) && !Object.values(values).length) {
      return `insert into ${table} default values`
    }

    if (!Array.isArray(values)) {
      values = [values]
    }

    const columns = this.columnize(Object.keys(values[0]))

    const parameters = values.map(record => {
      return `(${this.parameterize(record)})`
    }).join(', ')

    return `insert into ${table} (${columns}) values ${parameters}`
  }

  /**
   *
   * @param query
   * @param values
   */
  compileInsertOrIgnore (query, values) {
    throw new Error('This database engine does not support inserting while ignoring errors.')
  }

  /**
   *
   * @param query
   * @param values
   * @param sequence
   * @returns {string}
   */
  compileInsertGetId (query, values, sequence) {
    return this.compileInsert(query, values)
  }

  /**
   *
   * @param query
   * @param columns
   * @param sql
   * @returns {string}
   */
  compileInsertUsing (query, columns, sql) {
    return `insert into ${this.wrapTable(query.from)} (${this.columnize(columns)}) sql`
  }

  /**
   *
   * @param query
   * @param values
   * @returns {string}
   */
  compileUpdate (query, values) {
    const table = this.wrapTable(query.from)

    const columns = this.compileUpdateColumns(query, values)

    const where = this.compileWheres(query)

    return (!isUndefined(query.joins)
        ? this.compileUpdateWithJoins(query, table, columns, where)
        : this.compileUpdateWithoutJoins(query, table, columns, where)
    ).trim()
  }

  /**
   *
   * @param query
   * @param values
   * @returns {SourceNode | * | string}
   */
  compileUpdateColumns (query, values) {
    return values.map((value, key) => {
      return `${this.wrap(key)} = ${Grammar.parameter(value)}`
    }).join(', ')
  }

  /**
   *
   * @param query
   * @param table
   * @param columns
   * @param where
   * @returns {string}
   */
  compileUpdateWithoutJoins (query, table, columns, where) {
    return `update ${table} set ${columns} ${where}`
  }

  /**
   *
   * @param query
   * @param table
   * @param columns
   * @param where
   * @returns {string}
   */
  compileUpdateWithJoins (query, table, columns, where) {
    const joins = this.compileJoins(query, query.joins)

    return `update ${table} ${joins} set ${columns} ${where}`
  }

  /**
   *
   * @param bindings
   * @param values
   * @returns {*[]}
   */
  prepareBindingsForUpdate (bindings, values) {
    const { select, join, ...cleanBindings } = bindings

    return [...bindings.join, ...values, ...Object.values(cleanBindings).flat()]
  }

  /**
   *
   * @param query
   * @returns {string}
   */
  compileDelete (query) {
    const table = this.wrapTable(query.from)

    const where = this.compileWheres(query)

    return (!isUndefined(query.joins)
        ? this.compileDeleteWithJoins(query, table, where)
        : this.compileDeleteWithoutJoins(query, table, where)
    ).trim()
  }

  /**
   *
   * @param query
   * @param table
   * @param where
   * @returns {string}
   */
  compileDeleteWithoutJoins (query, table, where) {
    return `delete from ${table} ${where}`
  }

  /**
   *
   * @param query
   * @param table
   * @param where
   * @returns {string}
   */
  compileDeleteWithJoins (query, table, where) {
    const alias = table.split(' as ')[table.length - 1]

    const joins = this.compileJoins(query, query.joins)

    return `delete ${alias} from ${table} ${joins} ${where}`
  }

  /**
   *
   * @param bindings
   * @returns {any[]}
   */
  prepareBindingsForDelete (bindings) {
    const { select, ...cleanBindings } = bindings

    return Object.values(cleanBindings).flat()
  }

  /**
   *
   * @param query
   * @returns {*}
   */
  compileTruncate (query) {
    return {
      [`truncate table ${this.wrapTable(query.from)}`]: []
    }
  }

  /**
   *
   * @param query
   * @param value
   * @returns {string}
   */
  compileLock (query, value) {
    return isString(value) ? value : ''
  }

  /**
   *
   * @returns {boolean}
   */
  supportsSavepoints () {
    return true
  }

  /**
   *
   * @param name
   * @returns {string}
   */
  compileSavepoint (name) {
    return `SAVEPOINT ${name}`
  }

  /**
   *
   * @param name
   * @returns {string}
   */
  compileSavepointRollBack (name) {
    return `ROLLBACK TO SAVEPOINT ${name}`
  }

  /**
   *
   * @param columns
   * @returns {SourceNode | * | string}
   */
  columnize (columns) {
    return columns.map(column => this.wrap(column)).join(', ')
  }

  /**
   *
   * @param values
   * @returns {SourceNode | * | string}
   */
  parameterize (values) {
    return values.map(value => Grammar.parameter(value)).join(', ')
  }

  /**
   *
   * @param value
   * @returns {string}
   */
  static parameter (value) {
    return Grammar.isExpression(value) ? Grammar.getValue(value) : '?'
  }

  /**
   *
   * @param value
   * @param prefixAlias
   * @returns {string|void}
   */
  wrap (value, prefixAlias = false) {
    if (Grammar.isExpression(value)) {
      return Grammar.getValue(value)
    }

    if (value.includes(' as ') !== false) {
      return this.wrapAliasedValue(value, prefixAlias)
    }

    if (Grammar.isJsonSelector(value)) {
      return this.wrapJsonSelector(value)
    }

    return this.wrapSegments(value.split('->'))
  }

  /**
   *
   * @param segments
   * @returns {SourceNode | * | string}
   */
  wrapSegments (segments) {
    return segments.map((segment, key) => {
      return key === 0 && segments.length > 1
        ? this.wrapTable(segment)
        : Grammar.wrapValue(segment)
    }).join('.')
  }

  /**
   *
   * @param value
   * @param prefixAlias
   * @returns {string}
   */
  wrapAliasedValue (value, prefixAlias = false) {
    const segments = value.split(/\s+as\s+/i)

    if (prefixAlias) {
      segments[1] = `${this.tablePrefix}${segments[1]}`
    }
    return `${this.wrap(segments[0])} as ${Grammar.wrapValue(segments[1])}`
  }

  /**
   *
   * @param value
   * @returns {string|*}
   */
  static wrapValue (value) {
    if (value !== '*') {
      return `"${value.replace('"', '""')}"`
    }
    return value
  }

  /**
   *
   * @param table
   * @returns {string|void}
   */
  wrapTable (table) {
    if (!Grammar.isExpression(table)) {
      return this.wrap(`${this.tablePrefix}${table}`, true)
    }
    return Grammar.getValue(table)
  }

  /**
   *
   * @param value
   * @returns {boolean}
   */
  static isExpression (value) {
    return value instanceof Expression
  }

  /**
   *
   * @param expression
   * @returns {*|string}
   */
  static getValue (expression) {
    return expression.getValue()
  }

  /**
   *
   * @param value
   */
  wrapJsonSelector (value) {
    throw new Error('This database engine does not support JSON operations.')
  }

  /**
   *
   * @param value
   */
  wrapJsonBooleanSelector (value) {
    return this.wrapJsonSelector(value)
  }

  /**
   *
   * @param value
   * @returns {*}
   */
  wrapJsonBooleanValue (value) {
    return value
  }

  /**
   *
   * @param column
   * @returns {{path: *, field: *}}
   */
  wrapJsonFieldAndPath (column) {
    const parts = column.split('->', 2)

    const field = this.wrap(parts[0])

    const path = parts.length > 1 ? `, ${this.wrapJsonPath(parts[1], '->')}` : ''

    return { field, path }
  }

  /**
   *
   * @param value
   * @param delimiter
   * @returns {string}
   */
  wrapJsonPath (value, delimiter = '->') {
    value = value.replace(/([\\\\]+)?\\'/, "\\'")

    return `'$." ${value.replace(delimiter, '"."')}"'`
  }

  /**
   *
   * @param value
   * @returns {boolean}
   */
  static isJsonSelector (value) {
    return value.includes('->')
  }

  /**
   *
   * @param segments
   * @returns {SourceNode | * | string}
   */
  concatenate (segments) {
    return segments.filter(value => {
      return (value !== '').toString()
    }).join(' ')
  }

  /**
   *
   * @param value
   * @returns {*|void|string}
   */
  removeLeadingBoolean (value) {
    return value.replace(/and |or /i, '')
  }

  /**
   *
   * @returns {[]|Array}
   */
  getOperators () {
    return this.operators
  }
}
