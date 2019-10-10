import Builder from './Builder'
import { isFunction } from './DataType'

export default class JoinClause {
  /**
   *
   * @param parentQuery
   * @param type
   * @param table
   */
  constructor (parentQuery, type, table) {
    // super()
    this.type = type
    this.table = table
    this.parentClass = parentQuery.constructor.name
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
   *
   * @returns {JoinClause}
   */
  newQuery () {
    return new JoinClause(this.newParentQuery(), this.type, this.table)
  }

  /**
   *
   * @returns {JoinClause|Builder}
   */
  forSubQuery () {
    return this.newParentQuery().newQuery()
  }

  /**
   *
   * @returns {*}
   */
  newParentQuery () {
    const ParentQuery = this.parentClass

    return new ParentQuery()
  }
}
