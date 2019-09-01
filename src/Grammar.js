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

  // compileSelect(query) {
  //   if (query.unions && query.aggregate) {
  //     return this.compileUnionAggregate(query)
  //   }
  //
  //   const original = query.columns
  //
  //   if (is_null(query.columns)) {
  //     query.columns = ['*']
  //   }
  //
  //   let sql = trim(this.concatenate(
  //     this.compileComponents(query))
  //   )
  //
  //   if (query.unions) {
  //     sql = `${this.wrapUnion(sql)} ${this.compileUnions(query)}`
  //   }
  //
  //   query.columns = original
  //
  //   return sql
  // }
  //
  // compileComponents(query) {
  //   const sql = []
  //
  //   foreach(this.selectComponents as component)
  //   {
  //     if (isset(query.component) && !is_null(query.component)) {
  //       const method = 'compile'.ucfirst(component)
  //
  //       sql[component] = this.method(query, query.component)
  //     }
  //   }
  //
  //   return sql
  // }
  //
  // compileAggregate(query, aggregate) {
  //   column = this.columnize(aggregate['columns'])
  //
  //   if (is_array(query.distinct)) {
  //     column = 'distinct '.this.columnize(query.distinct)
  //   }
  //   elseif(query.distinct && column !== '*')
  //   {
  //     column = 'distinct '.column
  //   }
  //
  //   return 'select '.aggregate['function'].
  //   '('.column.
  //   ') as aggregate'
  // }
  //
  // compileColumns(query, columns) {
  //   if (!is_null(query.aggregate)) {
  //     return
  //   }
  //
  //   if (query.distinct) {
  //     select = 'select distinct '
  //   } else {
  //     select = 'select '
  //   }
  //
  //   return select.this.columnize(columns)
  // }
  //
  // compileFrom(query, table) {
  //   return 'from '.this.wrapTable(table)
  // }
  //
  // compileJoins(query, joins) {
  //   return collect(joins).map(function (join)
  //   use(query)
  //   {
  //     table = this.wrapTable(join.table)
  //
  //     nestedJoins = is_null(join.joins) ? '' : ' '.this.compileJoins(query, join.joins)
  //
  //     tableAndNestedJoins = is_null(join.joins) ? table : '('.table.nestedJoins.
  //     ')'
  //
  //     return trim('{join.type} join {tableAndNestedJoins} {this.compileWheres(join)}')
  //   }
  // ).
  //   implode(' ')
  // }
  //
  // compileWheres(query) {
  //   if (is_null(query.wheres)) {
  //     return ''
  //   }
  //
  //   if (count(sql = this.compileWheresToArray(query)) > 0) {
  //     return this.concatenateWhereClauses(query, sql)
  //   }
  //
  //   return ''
  // }
  //
  // compileWheresToArray(query) {
  //   return collect(query.wheres).map(function (where)
  //   use(query)
  //   {
  //     return where['boolean'].
  //     ' '.this.
  //     {
  //       'where{where[\'type\']}'
  //     }
  //     (query, where)
  //   }
  // ).
  //   all()
  // }
  //
  // concatenateWhereClauses(query, sql) {
  //   conjunction = query instanceof JoinClause ? 'on' : 'where'
  //
  //   return conjunction.
  //   ' '.this.removeLeadingBoolean(implode(' ', sql))
  // }
  //
  // whereRaw(query, where) {
  //   return where['sql']
  // }
  //
  // whereBasic(query, where) {
  //   value = Grammar.parameter(where['value'])
  //
  //   return this.wrap(where['column']).
  //   ' '.where['operator'].
  //   ' '.value
  // }
  //
  // whereIn(query, where) {
  //   if (!empty(where['values'])) {
  //     return this.wrap(where['column']).
  //     ' in ('.this.parameterize(where['values']).
  //     ')'
  //   }
  //
  //   return '0 = 1'
  // }
  //
  // whereNotIn(query, where) {
  //   if (!empty(where['values'])) {
  //     return this.wrap(where['column']).
  //     ' not in ('.this.parameterize(where['values']).
  //     ')'
  //   }
  //
  //   return '1 = 1'
  // }
  //
  // whereNotInRaw(query, where) {
  //   if (!empty(where['values'])) {
  //     return this.wrap(where['column']).
  //     ' not in ('.implode(', ', where['values']).
  //     ')'
  //   }
  //
  //   return '1 = 1'
  // }
  //
  // whereInRaw(query, where) {
  //   if (!empty(where['values'])) {
  //     return this.wrap(where['column']).
  //     ' in ('.implode(', ', where['values']).
  //     ')'
  //   }
  //
  //   return '0 = 1'
  // }
  //
  // whereNull(query, where) {
  //   return this.wrap(where['column']).
  //   ' is null'
  // }
  //
  // whereNotNull(query, where) {
  //   return this.wrap(where['column']).
  //   ' is not null'
  // }
  //
  // whereBetween(query, where) {
  //   between = where['not'] ? 'not between' : 'between'
  //
  //   min = Grammar.parameter(reset(where['values']))
  //
  //   max = Grammar.parameter(end(where['values']))
  //
  //   return this.wrap(where['column']).
  //   ' '.between.
  //   ' '.min.
  //   ' and '.max
  // }
  //
  // whereDate(query, where) {
  //   return this.dateBasedWhere('date', query, where)
  // }
  //
  // whereTime(query, where) {
  //   return this.dateBasedWhere('time', query, where)
  // }
  //
  // whereDay(query, where) {
  //   return this.dateBasedWhere('day', query, where)
  // }
  //
  // whereMonth(query, where) {
  //   return this.dateBasedWhere('month', query, where)
  // }
  //
  // whereYear(query, where) {
  //   return this.dateBasedWhere('year', query, where)
  // }
  //
  // dateBasedWhere(type, query, where) {
  //   value = Grammar.parameter(where['value'])
  //
  //   return type.
  //   '('.this.wrap(where['column']).
  //   ') '.where['operator'].
  //   ' '.value
  // }
  //
  // whereColumn(query, where) {
  //   return this.wrap(where['first']).
  //   ' '.where['operator'].
  //   ' '.this.wrap(where['second'])
  // }
  //
  // whereNested(query, where) {
  //   offset = query instanceof JoinClause ? 3 : 6
  //
  //   return '('.substr(this.compileWheres(where['query']), offset).
  //   ')'
  // }
  //
  // whereSub(query, where) {
  //   select = this.compileSelect(where['query'])
  //
  //   return this.wrap(where['column']).
  //   ' '.where['operator'].
  //   ' (select)'
  // }
  //
  // whereExists(query, where) {
  //   return 'exists ('.this.compileSelect(where['query']).
  //   ')'
  // }
  //
  // whereNotExists(query, where) {
  //   return 'not exists ('.this.compileSelect(where['query']).
  //   ')'
  // }
  //
  // whereRowValues(query, where) {
  //   columns = this.columnize(where['columns'])
  //
  //   values = this.parameterize(where['values'])
  //
  //   return '('.columns.
  //   ') '.where['operator'].
  //   ' ('.values.
  //   ')'
  // }
  //
  // whereJsonBoolean(query, where) {
  //   column = this.wrapJsonBooleanSelector(where['column'])
  //
  //   value = this.wrapJsonBooleanValue(
  //     Grammar.parameter(where['value'])
  //   )
  //
  //   return column.
  //   ' '.where['operator'].
  //   ' '.value
  // }
  //
  // whereJsonContains(query, where) {
  //   not = where['not'] ? 'not ' : ''
  //
  //   return not.this.compileJsonContains(
  //     where['column'], Grammar.parameter(where['value'])
  //   )
  // }
  //
  // compileJsonContains(column, value) {
  //   throw new RuntimeException('This database engine does not support JSON contains operations.')
  // }
  //
  // prepareBindingForJsonContains(binding) {
  //   return json_encode(binding)
  // }
  //
  // whereJsonLength(query, where) {
  //   return this.compileJsonLength(
  //     where['column'], where['operator'], Grammar.parameter(where['value'])
  //   )
  // }
  //
  // compileJsonLength(column, operator, value) {
  //   throw new RuntimeException('This database engine does not support JSON length operations.')
  // }
  //
  // compileGroups(query, groups) {
  //   return 'group by '.this.columnize(groups)
  // }
  //
  // compileHavings(query, havings) {
  //   sql = implode(' ', array_map([this, 'compileHaving'], havings))
  //
  //   return 'having '.this.removeLeadingBoolean(sql)
  // }
  //
  // compileHaving(having) {
  //   if (having['type'] === 'Raw') {
  //     return having['boolean'].
  //     ' '.having['sql']
  //   }
  //   elseif(having['type'] === 'between')
  //   {
  //     return this.compileHavingBetween(having)
  //   }
  //
  //   return this.compileBasicHaving(having)
  // }
  //
  // compileBasicHaving(having) {
  //   column = this.wrap(having['column'])
  //
  //   parameter = Grammar.parameter(having['value'])
  //
  //   return having['boolean'].
  //   ' '.column.
  //   ' '.having['operator'].
  //   ' '.parameter
  // }
  //
  // compileHavingBetween(having) {
  //   between = having['not'] ? 'not between' : 'between'
  //
  //   column = this.wrap(having['column'])
  //
  //   min = Grammar.parameter(head(having['values']))
  //
  //   max = Grammar.parameter(last(having['values']))
  //
  //   return having['boolean'].
  //   ' '.column.
  //   ' '.between.
  //   ' '.min.
  //   ' and '.max
  // }
  //
  // compileOrders(query, orders) {
  //   if (!empty(orders)) {
  //     return 'order by '.implode(', ', this.compileOrdersToArray(query, orders))
  //   }
  //
  //   return ''
  // }
  //
  // compileOrdersToArray(query, orders) {
  //   return array_map(function (order) {
  //     return order['sql'] ?? this.wrap(order['column']).
  //     ' '.order['direction']
  //   }, orders)
  // }
  //
  // compileRandom(seed) {
  //   return 'RANDOM()'
  // }
  //
  // compileLimit(query, limit) {
  //   return 'limit '.(int)
  //   limit
  // }
  //
  // compileOffset(query, offset) {
  //   return 'offset '.(int)
  //   offset
  // }
  //
  // compileUnions(query) {
  //   sql = ''
  //
  //   foreach(query.unions as union)
  //   {
  //     sql. = this.compileUnion(union)
  //   }
  //
  //   if (!empty(query.unionOrders)) {
  //     sql. = ' '.this.compileOrders(query, query.unionOrders)
  //   }
  //
  //   if (isset(query.unionLimit)) {
  //     sql. = ' '.this.compileLimit(query, query.unionLimit)
  //   }
  //
  //   if (isset(query.unionOffset)) {
  //     sql. = ' '.this.compileOffset(query, query.unionOffset)
  //   }
  //
  //   return ltrim(sql)
  // }
  //
  // compileUnion(union) {
  //   conjunction = union['all'] ? ' union all ' : ' union '
  //
  //   return conjunction.this.wrapUnion(union['query'].toSql())
  // }
  //
  // wrapUnion(sql) {
  //   return '('.sql.
  //   ')'
  // }
  //
  // compileUnionAggregate(query) {
  //   sql = this.compileAggregate(query, query.aggregate)
  //
  //   query.aggregate = null
  //
  //   return sql.
  //   ' from ('.this.compileSelect(query).
  //   ') as '.this.wrapTable('temp_table')
  // }
  //
  // compileExists(query) {
  //   select = this.compileSelect(query)
  //
  //   return 'select exists({select}) as {this.wrap(\'exists\')}'
  // }
  //
  // compileInsert(query, values) {
  //   table = this.wrapTable(query.from)
  //
  //   if (empty(values)) {
  //     return 'insert into {table} default values'
  //   }
  //
  //   if (!is_array(reset(values))) {
  //     values = [values]
  //   }
  //
  //   columns = this.columnize(array_keys(reset(values)))
  //
  //   parameters = collect(values).map(function (record) {
  //     return '('.this.parameterize(record).
  //     ')'
  //   }).implode(', ')
  //
  //   return 'insert into table (columns) values parameters'
  // }
  //
  // compileInsertOrIgnore(query, values) {
  //   throw new RuntimeException('This database engine does not support inserting while ignoring errors.')
  // }
  //
  // compileInsertGetId(query, values, sequence) {
  //   return this.compileInsert(query, values)
  // }
  //
  // compileInsertUsing(query, columns, sql) {
  //   return 'insert into {this.wrapTable(query.from)} ({this.columnize(columns)}) sql'
  // }
  //
  // compileUpdate(query, values) {
  //   table = this.wrapTable(query.from)
  //
  //   columns = this.compileUpdateColumns(query, values)
  //
  //   where = this.compileWheres(query)
  //
  //   return trim(
  //     isset(query.joins)
  //       ? this.compileUpdateWithJoins(query, table, columns, where)
  //       : this.compileUpdateWithoutJoins(query, table, columns, where)
  //   )
  // }
  //
  // compileUpdateColumns(query, values) {
  //   return collect(values).map(function (value, key) {
  //     return this.wrap(key).
  //     ' = '.Grammar.parameter(value)
  //   }).implode(', ')
  // }
  //
  // compileUpdateWithoutJoins(query, table, columns, where) {
  //   return 'update {table} set {columns} {where}'
  // }
  //
  // compileUpdateWithJoins(query, table, columns, where) {
  //   joins = this.compileJoins(query, query.joins)
  //
  //   return 'update {table} {joins} set {columns} {where}'
  // }
  //
  // prepareBindingsForUpdate(bindings, values) {
  //   cleanBindings = Arr::except(bindings, ['select', 'join'])
  //
  //   return array_values(
  //     array_merge(bindings['join'], values, Arr::flatten(cleanBindings))
  //   )
  // }
  //
  // compileDelete(query) {
  //   table = this.wrapTable(query.from)
  //
  //   where = this.compileWheres(query)
  //
  //   return trim(
  //     isset(query.joins)
  //       ? this.compileDeleteWithJoins(query, table, where)
  //       : this.compileDeleteWithoutJoins(query, table, where)
  //   )
  // }
  //
  // compileDeleteWithoutJoins(query, table, where) {
  //   return 'delete from {table} {where}'
  // }
  //
  // compileDeleteWithJoins(query, table, where) {
  //   alias = last(explode(' as ', table))
  //
  //   joins = this.compileJoins(query, query.joins)
  //
  //   return 'delete {alias} from {table} {joins} {where}'
  // }
  //
  // prepareBindingsForDelete(bindings) {
  //   return Arr::flatten(
  //     Arr::except(bindings, 'select')
  //   )
  // }
  //
  // compileTruncate(query) {
  //   return ['truncate table '.this.wrapTable(query.from)
  // =>
  //   []
  // ]
  // }
  //
  // compileLock(query, value) {
  //   return is_string(value) ? value : ''
  // }
  //
  // supportsSavepoints() {
  //   return true
  // }
  //
  // compileSavepoint(name) {
  //   return 'SAVEPOINT '.name
  // }
  //
  // compileSavepointRollBack(name) {
  //   return 'ROLLBACK TO SAVEPOINT '.name
  // }
  //
  static parameter(value) {
    return Grammar.isExpression(value) ? Grammar.getValue(value) : '?';
  }

  wrap(value, prefixAlias = false) {
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

  wrapSegments(segments)
  {
    return segments.map((segment, key) => {
      return key === 0 && segments.length > 1
        ? this.wrapTable(segment)
        : Grammar.wrapValue(segment)
    }).join('.')
  }

  wrapAliasedValue(value, prefixAlias = false) {
    const segments = value.split(/\s+as\s+/i)

    if (prefixAlias) {
      segments[1] = `${this.tablePrefix}${segments[1]}`;
    }
    return `${this.wrap(segments[0])} as ${Grammar.wrapValue(segments[1])}`
  }

  static wrapValue(value) {
    if (value !== '*') {
      return `"${value.replace('"', '""')}"`;
    }
    return value;
  }


  wrapTable(table)
  {
    if (!Grammar.isExpression(table)) {
      return this.wrap(this.tablePrefix.table, true)
    }
    return Grammar.getValue(table)
  }

  static isExpression(value)
  {
    return value instanceof Expression
  }

  static getValue(expression)
  {
    return expression.getValue()
  }

  wrapJsonSelector(value) {
    throw new Error('This database engine does not support JSON operations.')
  }
  //
  // wrapJsonBooleanSelector(value) {
  //   return this.wrapJsonSelector(value)
  // }
  //
  // wrapJsonBooleanValue(value) {
  //   return value
  // }
  //
  // wrapJsonFieldAndPath(column) {
  //   parts = explode('->', column, 2)
  //
  //   field = this.wrap(parts[0])
  //
  //   path = count(parts) > 1 ? ', '.this.wrapJsonPath(parts[1], '->') : ''
  //
  //   return [field, path]
  // }
  //
  // wrapJsonPath(value, delimiter = '->') {
  //   value = preg_replace('/([\\\\]+)?\\\'/', '\\\'', value)
  //
  //   return '\'."'.str_replace(delimiter, '"."', value).
  //   '"\''
  // }
  //
  static isJsonSelector(value) {
    return value.contains('->')
  }

  // concatenate(segments) {
  //   return implode(' ', array_filter(segments, function (value) {
  //     return (string)
  //     value !== ''
  //   }))
  // }
  //
  // removeLeadingBoolean(value) {
  //   return preg_replace('/and |or /i', '', value, 1)
  // }
  //
  // getOperators() {
  //   return this.operators
  // }
}
