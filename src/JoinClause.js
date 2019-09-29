import Builder from './Builder'
import { isFunction } from './DataType'

export default class JoinClause extends Builder {
  type
  table
  parentClass

  constructor (parentQuery, type, table) {
    super()
    this.type = type
    this.table = table
    this.parentClass = parentQuery.constructor.name
  }

  on (first, operator = null, second = null, boolean = 'and') {
    if (isFunction(first)) {
      return this.whereNested(first, boolean)
    }

    return this.whereColumn(first, operator, second, boolean)
  }

  orOn (first, operator = null, second = null) {
    return this.on(first, operator, second, 'or')
  }

  newQuery () {
    return new JoinClause(this.newParentQuery(), this.type, this.table)
  }

  forSubQuery () {
    return this.newParentQuery().newQuery()
  }

  newParentQuery () {
    const c = this.parentClass

    return new c()
  }
}
