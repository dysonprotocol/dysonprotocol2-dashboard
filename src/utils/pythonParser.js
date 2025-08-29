/**
 * Python script parsing utilities
 */

const FUNCTION_REGEX = /def\s+(\w+)\s*\((.*?)\)\s*:(?:\s*"""(.*?)""")?/gs

export class ScriptParseError extends Error {
  constructor(message, line = null) {
    super(message)
    this.name = 'ScriptParseError'
    this.line = line
  }
}

export function parseScriptFunctions(source) {
  if (!source?.trim()) return []

  const functions = []
  const lines = source.split('\n')
  let match

  // Reset regex lastIndex for multiple uses
  FUNCTION_REGEX.lastIndex = 0

  while ((match = FUNCTION_REGEX.exec(source))) {
    const [, name, params, docstring] = match

    // Skip private functions
    if (name.startsWith('_')) continue
    if (name === 'wsgi') continue

    try {
      const startLine = source.substring(0, match.index).split('\n').length
      const endLine = findFunctionEnd(lines, startLine - 1)

      const parameters = parseParameters(params)
      const sigParams = parameters
        .map((p) => (p.required ? p.name : `${p.name}=${String(p.default)}`))
        .join(', ')
      const signature = `${name}(${sigParams})`
      functions.push({
        function_name: name,
        docstring: docstring?.trim() || '',
        parameters,
        kwargs: buildKwargSkeleton(parameters),
        signature,
        start_line: startLine,
        end_line: endLine,
      })
    } catch (error) {
      console.warn(`Failed to parse function ${name}:`, error)
    }
  }

  return functions
}

export function extractDocstring(source) {
  if (!source) return ''
  const match = source.match(/^\s*"""(.*?)"""/s)
  return match?.[1]?.trim() || ''
}

function findFunctionEnd(lines, startIndex) {
  const baseLine = lines[startIndex]
  if (!baseLine) return startIndex + 1

  const baseIndent = baseLine.match(/^(\s*)/)[1].length

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    const indent = line.match(/^(\s*)/)[1].length

    // Function ends when we find a line at same or lower indentation
    // that starts a new definition or statement
    if (
      indent <= baseIndent &&
      (trimmed.startsWith('def ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('@') ||
        (!trimmed.startsWith('"""') && !trimmed.startsWith("'''")))
    ) {
      return i
    }
  }

  return lines.length
}

function parseParameters(paramString) {
  if (!paramString?.trim()) {
    return []
  }

  // Split parameters more carefully to handle nested structures
  const params = splitParameters(paramString)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('*')) // Skip *args and **kwargs

  return params.map((param) => {
    const { name, defaultValue, annotation } = parseParameter(param)

    const paramInfo = {
      name,
      required: defaultValue === null,
    }

    if (defaultValue !== null) {
      paramInfo.default = defaultValue
    }

    if (annotation) {
      paramInfo.annotation = annotation
    }

    return paramInfo
  })
}

export function buildKwargSkeleton(parameters) {
  if (!parameters || parameters.length === 0) {
    return null // no parameters
  }

  const required = parameters.filter((p) => p.required)
  if (required.length === 0) {
    return {} // all parameters are optional
  }

  return Object.fromEntries(required.map((p) => [p.name, null]))
}

export function buildFormDefaults(parameters) {
  if (!parameters || parameters.length === 0) {
    return null // no parameters
  }

  const formData = {}
  for (const param of parameters) {
    if (param.required) {
      formData[param.name] = null
    } else {
      formData[param.name] = param.default
    }
  }

  return formData
}

function splitParameters(paramString) {
  const params = []
  let current = ''
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < paramString.length; i++) {
    const char = paramString[i]
    const prevChar = i > 0 ? paramString[i - 1] : ''

    if (!inString && (char === '"' || char === "'")) {
      inString = true
      stringChar = char
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false
      stringChar = ''
    } else if (!inString) {
      if (char === '(' || char === '[' || char === '{') {
        depth++
      } else if (char === ')' || char === ']' || char === '}') {
        depth--
      } else if (char === ',' && depth === 0) {
        params.push(current.trim())
        current = ''
        continue
      }
    }

    current += char
  }

  if (current.trim()) {
    params.push(current.trim())
  }

  return params
}

function parseParameter(param) {
  // Handle type annotations: name: type = value or name: type
  let name = param
  let defaultValue = null
  let annotation = null

  // Check for default value first
  const equalIndex = findTopLevelChar(param, '=')
  if (equalIndex !== -1) {
    defaultValue = parseValue(param.substring(equalIndex + 1).trim())
    name = param.substring(0, equalIndex).trim()
  }

  // Extract type annotation if present
  const colonIndex = findTopLevelChar(name, ':')
  if (colonIndex !== -1) {
    annotation = name.substring(colonIndex + 1).trim()
    name = name.substring(0, colonIndex).trim()
  }

  return { name, defaultValue, annotation }
}

function findTopLevelChar(str, char) {
  let depth = 0
  let inString = false
  let stringChar = ''

  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    const prevChar = i > 0 ? str[i - 1] : ''

    if (!inString && (c === '"' || c === "'")) {
      inString = true
      stringChar = c
    } else if (inString && c === stringChar && prevChar !== '\\') {
      inString = false
      stringChar = ''
    } else if (!inString) {
      if (c === '(' || c === '[' || c === '{') {
        depth++
      } else if (c === ')' || c === ']' || c === '}') {
        depth--
      } else if (c === char && depth === 0) {
        return i
      }
    }
  }

  return -1
}

function parseValue(value) {
  if (value === 'None') return null
  if (value === 'True') return true
  if (value === 'False') return false
  if (/^\d+$/.test(value)) return parseInt(value, 10)
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value)
  if (/^["'].*["']$/.test(value)) return value.slice(1, -1)

  // Handle empty containers
  if (value === '[]' || value === '{}' || value === '()') return value

  // For complex expressions, return as string
  return value
}
