export default class Expression {
  /**
   *
   * @param value
   */
  constructor (value) {
    this.value = value
  }

  /**
   *
   * @returns {*}
   */
  getValue () {
    return this.value
  }

  /**
   * Get the value of the expression.
   *
   * @return string
   */
  toString() {
    return this.getValue().toString()
  }
}
