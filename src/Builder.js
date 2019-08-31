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

  table(name) {
    this.from = name

    return this
  }

  select() {
    if (Builder._areValidArguments(arguments)) return false

    this.columns = [...this.columns, ...arguments]

    return this
  }

  where() {
    if (Builder._areValidArguments(arguments, {min: 2})) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      this._formatWhere(arguments)
    ]

    return this
  }

  orWhere() {
    if (Builder._areValidArguments(arguments, {min: 2})) return false

    this.bindings.where = [...this.bindings.where, Builder._getValue(arguments)]
    this.wheres = [
      ...this.wheres,
      Builder._formatWhere(arguments, {or: true})
    ]

    return this
  }

  static _formatWhere(args, options = {or: false}) {
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

  static _isValidOperator(target) {
    return operators.find(operator => operator === target)
  }

  static _getOperator(args) {
    return Builder._hasOperator(args) && Builder._isValidOperator(args[1])
      ? args[1]
      : '='
  }

  static _getValue(args) {
    return Builder._hasOperator(args)
      ? args[2]
      : args[1]
  }

  static _areValidArguments(args, options = {min: 1}) {
    return args.length < options.min
  }

  static _hasKey(target, key) {
    return Builder._isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }

  static _hasOperator(args) {
    return args.length > 2
  }

  static _isObject(value) {
    return typeof value === 'object'
  }
}
