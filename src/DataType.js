/**
 *
 * @param value
 * @returns {boolean}
 */
export function isString (value) {
  return typeof value === 'string' || value instanceof String
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isNumber (value) {
  return typeof value === 'number' && isFinite(value)
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isFunction (value) {
  return typeof value === 'function'
}

/**
 *
 * @param value
 * @returns {*|boolean}
 */
export function isObject (value) {
  return value && typeof value === 'object' && value.constructor === Object
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isNull (value) {
  return value === null
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isUndefined (value) {
  return typeof value === 'undefined'
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isBoolean (value) {
  return typeof value === 'boolean'
}

/**
 *
 * @param value
 * @returns {*|boolean}
 */
export function isRegExp (value) {
  return value && typeof value === 'object' && value.constructor === RegExp
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isError (value) {
  return value instanceof Error && typeof value.message !== 'undefined'
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isDate (value) {
  return value instanceof Date
}

/**
 *
 * @param value
 * @returns {boolean}
 */
export function isSymbol (value) {
  return typeof value === 'symbol'
}
