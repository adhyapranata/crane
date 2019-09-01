export function last (value) {
  if (Array.isArray(value)) {
    const lastKey = value.length - 1
    return value[lastKey]
  }
}

export function except (obj, exceptions = []) {
  exceptions.forEach(exception => {
    if (Object.prototype.hasOwnProperty.call(obj, exception)) {
      delete obj[exception]
    }
  })

  return obj
}

export function only (obj, inclusions = []) {
  const result = {}
  inclusions.forEach(inclusion => {
    if (Object.prototype.hasOwnProperty.call(obj, inclusion)) {
      result[inclusion] = obj[inclusion]
    }
  })

  return result
}

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

export function objectKey (obj) {
  return Object.keys(obj)[0]
}

export function objectVal (obj) {
  return Object.values(obj)[0]
}
