import Expression from './Expression'
import JoinClause from './JoinClause'
import { isString, isNull, isUndefined } from './DataType'
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

  compileSelect(query) {
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

    return sql
  }

  compileComponents(query) {
    const sql = []

    this.selectComponents.forEach(component => {
      if (!isUndefined(query.component) && !isNull(query.component)) {
        const method = `compile${upperCaseFirstLetter(component)}`

        sql[component] = this[method](query, query.component)
      }
    })

    return sql
  }

  compileAggregate(query, aggregate) {
    let column = this.columnize(aggregate['columns'])

    if (Array.isArray(query.distinct)) {
      column = `distinct ${this.columnize(query.distinct)}`
    } else if(query.distinct && column !== '*') {
      column = `distinct ${column}`
    }

    return `select ${aggregate['function']}(${column}) as aggregate`
  }

  compileColumns(query, columns) {
    if (!isNull(query.aggregate)) {
      return
    }

    let select = 'select '

    if (query.distinct) {
      select = 'select distinct '
    }

    return `${select}${this.columnize(columns)}`
  }

  compileFrom(query, table) {
    return `from ${this.wrapTable(table)}`
  }

  compileJoins(query, joins) {
    return joins.map(join => {
      const table = this.wrapTable(join.table)

      const nestedJoins = isNull(join.joins) ? '' : ` ${this.compileJoins(query, join.joins)}`

      const tableAndNestedJoins = isNull(join.joins) ? table : `(${table[nestedJoins]})`

      return (`${join.type} join ${tableAndNestedJoins} ${this.compileWheres(join)}`).trim()
    }).join(' ')
  }

  compileWheres(query) {
    if (isNull(query.wheres)) {
      return ''
    }

    const sql = this.compileWheresToArray(query)

    if (sql.length > 0) {
      return this.concatenateWhereClauses(query, sql)
    }

    return ''
  }

  compileWheresToArray(query) {
    return query.wheres.map(where => {
      return `${where['boolean']} ${this[`where[${where['type']}]`](query, where)}`
    })
  }

  concatenateWhereClauses(query, sql) {
    const conjunction = query instanceof JoinClause ? 'on' : 'where'

    return `${conjunction} ${this.removeLeadingBoolean(sql.join(' '))}`
  }

  whereRaw(query, where) {
    return where['sql']
  }

  whereBasic(query, where) {
    const value = Grammar.parameter(where['value'])

    return `${this.wrap(where['column'])} ${where['operator']} ${value}`
  }

  whereIn(query, where) {
    if (!where['values'].length) {
      return `${this.wrap(where['column'])} in (${this.parameterize(where['values'])})`
    }

    return '0 = 1'
  }

  whereNotIn(query, where) {
    if (!where['values'].length) {
      return `${this.wrap(where['column'])} not in (${this.parameterize(where['values'])})`
    }

    return '1 = 1'
  }

  whereNotInRaw(query, where) {
    if (!where['values'].length) {
      return `${this.wrap(where['column'])} not in (${where['values'].join(', ')})`
    }

    return '1 = 1'
  }

  whereInRaw(query, where) {
    if (!where['values'].length) {
      return `${this.wrap(where['column'])} in (${where['values'].join(', ')})`
    }

    return '0 = 1'
  }

  whereNull(query, where) {
    return `${this.wrap(where['column'])} is null`
  }

  whereNotNull(query, where) {
    return `${this.wrap(where['column'])} is not null`
  }

  whereBetween(query, where) {
    const between = where['not'] ? 'not between' : 'between'

    const min = Grammar.parameter(where['values'][0])

    const max = Grammar.parameter(where['values'][where['values'].length - 1])

    return `${this.wrap(where['column'])} ${between} ${min} and ${max}`
  }

  whereDate(query, where) {
    return this.dateBasedWhere('date', query, where)
  }

  whereTime(query, where) {
    return this.dateBasedWhere('time', query, where)
  }

  whereDay(query, where) {
    return this.dateBasedWhere('day', query, where)
  }

  whereMonth(query, where) {
    return this.dateBasedWhere('month', query, where)
  }

  whereYear(query, where) {
    return this.dateBasedWhere('year', query, where)
  }

  dateBasedWhere(type, query, where) {
    const value = Grammar.parameter(where['value'])

    return `${type}(${this.wrap(where['column'])}) ${where['operator']} ${value}`
  }

  whereColumn(query, where) {
    return `${this.wrap(where['first'])} ${where['operator']} ${this.wrap(where['second'])}`
  }

  whereNested(query, where) {
    const offset = query instanceof JoinClause ? 3 : 6

    return `(${this.compileWheres(where['query']).substring(offset)})`
  }

  whereSub(query, where) {
    const select = this.compileSelect(where['query'])

    return `${this.wrap(where['column'])} ${where['operator']} (select)`
  }

  whereExists(query, where) {
    return `exists (${this.compileSelect(where['query'])})`
  }

  whereNotExists(query, where) {
    return `not exists (${this.compileSelect(where['query'])})`
  }

  whereRowValues(query, where) {
    const columns = this.columnize(where['columns'])

    const values = this.parameterize(where['values'])

    return `(${columns}) ${where['operator']} (${values})`
  }

  whereJsonBoolean(query, where) {
    const column = this.wrapJsonBooleanSelector(where['column'])

    const value = this.wrapJsonBooleanValue(
      Grammar.parameter(where['value'])
    )

    return `${column} ${where['operator']} ${value}`
  }

  whereJsonContains(query, where) {
    const not = where['not'] ? 'not ' : ''

    return `${not}${this.compileJsonContains(where['column'], Grammar.parameter(where['value']))}`
  }

  compileJsonContains(column, value) {
    throw new Error('This database engine does not support JSON contains operations.')
  }

  prepareBindingForJsonContains(binding) {
    return JSON.stringify(binding)
  }

  whereJsonLength(query, where) {
    return this.compileJsonLength(
      where['column'], where['operator'], Grammar.parameter(where['value'])
    )
  }

  compileJsonLength(column, operator, value) {
    throw new Error('This database engine does not support JSON length operations.')
  }

  compileGroups(query, groups) {
    return `group by ${this.columnize(groups)}`
  }

  compileHavings(query, havings) {
    const sql = havings.map(having => this.compileHaving(having)).join(' ')

    return `having ${this.removeLeadingBoolean(sql)}`
  }

  compileHaving(having) {
    if (having['type'] === 'Raw') {
      return `${having['boolean']} ${having['sql']}`
    } else if(having['type'] === 'between') {
      return this.compileHavingBetween(having)
    }

    return this.compileBasicHaving(having)
  }

  compileBasicHaving(having) {
    const column = this.wrap(having['column'])

    const parameter = Grammar.parameter(having['value'])

    return `${having['boolean']} ${column} ${having['operator']} ${parameter}`
  }

  compileHavingBetween(having) {
    const between = having['not'] ? 'not between' : 'between'

    const column = this.wrap(having['column'])

    const min = Grammar.parameter(having['values'][0])

    const max = Grammar.parameter(having['values'][having['values'].length - 1])

    return `${having['boolean']} ${column} ${between} ${min} and ${max}`
  }

  compileOrders(query, orders) {
    if (!orders.length) {
      return `order by ${this.compileOrdersToArray(query, orders).join(', ')}`
    }

    return ''
  }

  compileOrdersToArray(query, orders) {
    return orders.map(order => {
      return !isUndefined(order['sql']) ? order['sql'] : `${this.wrap(order['column'])} ${order['direction']}`
    })
  }

  compileRandom (seed) {
    return 'RANDOM()'
  }


  compileLimit(query, limit) {
    return `limit ${parseInt(limit)}`
  }

  compileOffset(query, offset) {
    return `limit ${parseInt(offset)}`
  }

  compileUnions(query) {
    let sql = ''

    query.unions.forEach(union => {
      {
        sql += this.compileUnion(union)
      }
    })

    if (!query.unionOrders.length) {
      sql += ` ${this.compileOrders(query, query.unionOrders)}`
    }

    if (!isUndefined(query.unionLimit)) {
      sql += ` ${this.compileLimit(query, query.unionLimit)}`
    }

    if (!isUndefined(query.unionOffset)) {
      sql += ` ${this.compileOffset(query, query.unionOffset)}`
    }

    return sql.trimLeft()
  }

  compileUnion(union) {
    const conjunction = union['all'] ? ' union all ' : ' union '

    return `${conjunction}${this.wrapUnion(union['query'].toSql())}`
  }

  wrapUnion(sql) {
    return `(${sql})`
  }

  compileUnionAggregate(query) {
    const sql = this.compileAggregate(query, query.aggregate)

    query.aggregate = null

    return `${sql} from (${this.compileSelect(query)}) as ${this.wrapTable('temp_table')}`
  }

  compileExists(query) {
    const select = this.compileSelect(query)

    return `select exists(${select}) as ${this.wrap('exists')}`
  }

  compileInsert(query, values) {
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

  compileInsertOrIgnore(query, values) {
    throw new Error('This database engine does not support inserting while ignoring errors.')
  }

  compileInsertGetId(query, values, sequence) {
    return this.compileInsert(query, values)
  }

  compileInsertUsing(query, columns, sql) {
    return `insert into ${this.wrapTable(query.from)} (${this.columnize(columns)}) sql`
  }

  compileUpdate(query, values) {
    const table = this.wrapTable(query.from)

    const columns = this.compileUpdateColumns(query, values)

    const where = this.compileWheres(query)

    return (!isUndefined(query.joins)
      ? this.compileUpdateWithJoins(query, table, columns, where)
      : this.compileUpdateWithoutJoins(query, table, columns, where)
    ).trim()
  }

  compileUpdateColumns(query, values) {
    return values.map((value, key) => {
      return `${this.wrap(key)} = ${Grammar.parameter(value)}`
    }).join(', ')
  }

  compileUpdateWithoutJoins(query, table, columns, where) {
    return `update ${table} set ${columns} ${where}`
  }

  compileUpdateWithJoins(query, table, columns, where) {
    const joins = this.compileJoins(query, query.joins)

    return `update ${table} ${joins} set ${columns} ${where}`
  }

  prepareBindingsForUpdate(bindings, values) {
    let { select, join, ...cleanBindings } = bindings

    return [...bindings['join'], ...values, ...Object.values(cleanBindings).flat()]
  }

  compileDelete(query) {
    const table = this.wrapTable(query.from)

    const where = this.compileWheres(query)

    return (!isUndefined(query.joins)
      ? this.compileDeleteWithJoins(query, table, where)
      : this.compileDeleteWithoutJoins(query, table, where)
    ).trim()
  }

  compileDeleteWithoutJoins(query, table, where) {
    return `delete from ${table} ${where}`
  }

  compileDeleteWithJoins(query, table, where) {
    const alias = table.split(' as ')[table.length - 1]

    const joins = this.compileJoins(query, query.joins)

    return `delete ${alias} from ${table} ${joins} ${where}`
  }

  prepareBindingsForDelete(bindings) {
    let { select, ...cleanBindings } = bindings

    return Object.values(cleanBindings).flat()
  }

  compileTruncate(query) {
    return {
      [`truncate table ${this.wrapTable(query.from)}`] : []
    }
  }

  compileLock(query, value) {
    return isString(value) ? value : ''
  }

  supportsSavepoints() {
    return true
  }

  compileSavepoint(name) {
    return `SAVEPOINT ${name}`
  }

  compileSavepointRollBack(name) {
    return `ROLLBACK TO SAVEPOINT ${name}`
  }

  columnize(columns) {
    return columns.map(column => this.wrap(column)).join(', ')
  }

  parameterize(values) {
    return values.map(value => Grammar.parameter(value)).join(', ')
  }

  static parameter (value) {
    return Grammar.isExpression(value) ? Grammar.getValue(value) : '?'
  }

  wrap (value, prefixAlias = false) {
    if (Grammar.isExpression(value)) {
      return Grammar.getValue(value)
    }

    if (value.indexOf(' as ') !== false) {
      return this.wrapAliasedValue(value, prefixAlias)
    }

    if (Grammar.isJsonSelector(value)) {
      return this.wrapJsonSelector(value)
    }

    return this.wrapSegments(value.split('->'))
  }

  wrapSegments (segments) {
    return segments.map((segment, key) => {
      return key === 0 && segments.length > 1
        ? this.wrapTable(segment)
        : Grammar.wrapValue(segment)
    }).join('.')
  }

  wrapAliasedValue (value, prefixAlias = false) {
    const segments = value.split(/\s+as\s+/i)

    if (prefixAlias) {
      segments[1] = `${this.tablePrefix}${segments[1]}`
    }
    return `${this.wrap(segments[0])} as ${Grammar.wrapValue(segments[1])}`
  }

  static wrapValue (value) {
    if (value !== '*') {
      return `"${value.replace('"', '""')}"`
    }
    return value
  }

  wrapTable (table) {
    if (!Grammar.isExpression(table)) {
      return this.wrap(this.tablePrefix.table, true)
    }
    return Grammar.getValue(table)
  }

  static isExpression (value) {
    return value instanceof Expression
  }

  static getValue (expression) {
    return expression.getValue()
  }

  wrapJsonSelector (value) {
    throw new Error('This database engine does not support JSON operations.')
  }


  wrapJsonBooleanSelector(value) {
    return this.wrapJsonSelector(value)
  }

  wrapJsonBooleanValue(value) {
    return value
  }

  wrapJsonFieldAndPath(column) {
    const parts = column.split('->', 2)

    const field = this.wrap(parts[0])

    const path = parts.length > 1 ? `, ${this.wrapJsonPath(parts[1], '->')}` : ''

    return {field, path}
  }

  wrapJsonPath(value, delimiter = '->') {
    value = value.replace(/([\\\\]+)?\\'/, "\\'")

    return `'$." ${value.replace(delimiter, `"."`)}"'`
  }

  static isJsonSelector (value) {
    return value.contains('->')
  }

  concatenate(segments) {
    return segments.filter(value => {
      return (value !== '').toString()
    }).join(' ')
  }

  removeLeadingBoolean(value) {
    return value.replace('/and |or /i', '', 1)
  }

  getOperators() {
    return this.operators
  }
}
