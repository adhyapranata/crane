/**
 *
 * @param value
 * @returns {*}
 */
export function last (value) {
  if (Array.isArray(value)) {
    const lastKey = value.length - 1
    return value[lastKey]
  }
}

/**
 *
 * @param obj
 * @param exceptions
 * @returns {*}
 */
export function except (obj, exceptions = []) {
  exceptions.forEach(exception => {
    if (Object.prototype.hasOwnProperty.call(obj, exception)) {
      delete obj[exception]
    }
  })

  return obj
}

/**
 *
 * @param obj
 * @param inclusions
 */
export function only (obj, inclusions = []) {
  const result = {}
  inclusions.forEach(inclusion => {
    if (Object.prototype.hasOwnProperty.call(obj, inclusion)) {
      result[inclusion] = obj[inclusion]
    }
  })

  return result
}

/**
 *
 * @param search
 * @param replace
 * @param subject
 * @returns {*|void|string}
 */
export function replaceFirst (search, replace, subject) {
  if (search === '') {
    return subject
  }
  const position = subject.indexOf(search)
  if (position !== false) {
    return subject.replace(search, replace)
  }
  return subject
}

/**
 *
 * @param obj
 * @returns {string}
 */
export function objectKey (obj) {
  return Object.keys(obj)[0]
}

/**
 *
 * @param obj
 * @returns {unknown}
 */
export function objectVal (obj) {
  return Object.values(obj)[0]
}

export function upperCaseFirstLetter (str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}
