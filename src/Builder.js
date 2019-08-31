// import SQLiteConnection from './SQLiteConnection'

// const database = SQLiteConnection.database
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
    this.columns = null
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
    if (Builder._areValidArguments(arguments)) {
      return false
    }

    this.columns = [...this.columns, arguments]
    return this
  }

  where () {
    if (Builder._areValidArguments(arguments, { min: 2 })) {
      return false
    }

    const lastArgument = arguments[arguments.length - 1]

    this.wheres = [...this.wheres, {
      type: 'Basic',
      column: arguments[0],
      operator: Builder._hasOperator() && this._isValidOperator(arguments[1])
        ? arguments[1]
        : '=',
      value: Builder._hasOperator()
        ? arguments[2]
        : arguments[1],
      boolean: Builder._hasBoolean(lastArgument)
        ? lastArgument.boolean
        : 'and'
    }]

    return this
  }

  orWhere () {
    return this.where([...arguments, { boolean: 'or' }])
  }

  _isValidOperator (target) {
    return operators.find(operator => operator === target)
  }

  static _hasBoolean (lastArgument) {
    return Builder._isKeyExists(lastArgument, 'boolean')
  }

  static _areValidArguments () {
    const options = arguments[arguments.length - 1]
    const min = Builder._isKeyExists(options, 'min')
      ? options.min
      : 1

    return arguments.length < min
  }

  static _isKeyExists (target, key) {
    return Builder._isObject(target) && Object.prototype.hasOwnProperty.call(target, key)
  }

  static _hasOperator () {
    return arguments.length > 2
  }

  static _isObject (value) {
    return typeof value === 'object'
  }
}
