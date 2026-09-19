/**
 * Strips single-line (//), multi-line (/* ... *\/), and hash (#) comments from JSON strings,
 * while safely preserving string literals (e.g. URLs with https://).
 * Also cleans trailing commas resulting from commented-out fields before closing brackets.
 */
export function stripJsonComments(jsonStr: string): string {
  if (!jsonStr) return ''

  let result = ''
  let inString = false
  let isEscaped = false
  let stringChar = '"'
  let i = 0
  const len = jsonStr.length

  while (i < len) {
    const char = jsonStr[i]
    const nextChar = i + 1 < len ? jsonStr[i + 1] : ''

    if (inString) {
      result += char
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === stringChar) {
        inString = false
      }
      i++
      continue
    }

    // Check for string start (double quote or single quote)
    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      isEscaped = false
      result += char
      i++
      continue
    }

    // Check for single-line comment: //
    if (char === '/' && nextChar === '/') {
      i += 2
      while (i < len && jsonStr[i] !== '\n' && jsonStr[i] !== '\r') {
        i++
      }
      continue
    }

    // Check for multi-line comment: /* ... */
    if (char === '/' && nextChar === '*') {
      i += 2
      while (i + 1 < len && !(jsonStr[i] === '*' && jsonStr[i + 1] === '/')) {
        i++
      }
      i += 2
      continue
    }

    // Check for hash comment: #
    if (char === '#') {
      i++
      while (i < len && jsonStr[i] !== '\n' && jsonStr[i] !== '\r') {
        i++
      }
      continue
    }

    result += char
    i++
  }

  // Remove trailing commas before } or ] and collapse excess blank lines from removed comments
  return collapseExcessBlankLines(removeTrailingCommas(result))
}

function collapseExcessBlankLines(jsonStr: string): string {
  let result = ''
  let inString = false
  let isEscaped = false
  let stringChar = '"'
  let consecutiveNewlines = 0

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (inString) {
      result += char
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === stringChar) {
        inString = false
      }
      consecutiveNewlines = 0
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      isEscaped = false
      result += char
      consecutiveNewlines = 0
      continue
    }

    if (char === '\r') {
      continue
    }

    if (char === '\n') {
      consecutiveNewlines++
      // Allow at most 1 consecutive newline outside strings
      if (consecutiveNewlines <= 1) {
        result += '\n'
      }
      continue
    }

    if (!/\s/.test(char)) {
      consecutiveNewlines = 0
    }

    result += char
  }

  return result
}

function removeTrailingCommas(jsonStr: string): string {
  let result = ''
  let inString = false
  let isEscaped = false
  let stringChar = '"'
  let lastCommaIndex = -1

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (inString) {
      result += char
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === stringChar) {
        inString = false
      }
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      isEscaped = false
      result += char
      lastCommaIndex = -1
      continue
    }

    if (char === ',') {
      lastCommaIndex = result.length
      result += char
      continue
    }

    if (char === '}' || char === ']') {
      if (lastCommaIndex !== -1) {
        const between = result.slice(lastCommaIndex + 1)
        if (/^\s*$/.test(between)) {
          result = result.slice(0, lastCommaIndex) + between
        }
      }
      lastCommaIndex = -1
      result += char
      continue
    }

    if (!/\s/.test(char)) {
      lastCommaIndex = -1
    }

    result += char
  }

  return result
}

export interface CommentRange {
  from: number
  to: number
}

/**
 * Accurately finds all comment ranges (//, /* ... *\/, and #) in a JSON string,
 * ignoring comment symbols within string literals.
 */
export function findCommentRanges(text: string): CommentRange[] {
  const ranges: CommentRange[] = []
  let inString = false
  let isEscaped = false
  let stringChar = '"'
  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]
    const nextChar = i + 1 < len ? text[i + 1] : ''

    if (inString) {
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if (char === stringChar) {
        inString = false
      }
      i++
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      isEscaped = false
      i++
      continue
    }

    // Single-line comment: //
    if (char === '/' && nextChar === '/') {
      const from = i
      i += 2
      while (i < len && text[i] !== '\n' && text[i] !== '\r') {
        i++
      }
      ranges.push({ from, to: i })
      continue
    }

    // Multi-line comment: /* ... */
    if (char === '/' && nextChar === '*') {
      const from = i
      i += 2
      while (i + 1 < len && !(text[i] === '*' && text[i + 1] === '/')) {
        i++
      }
      if (i + 1 < len) {
        i += 2
      } else {
        i = len
      }
      ranges.push({ from, to: i })
      continue
    }

    // Hash comment: #
    if (char === '#') {
      const from = i
      i++
      while (i < len && text[i] !== '\n' && text[i] !== '\r') {
        i++
      }
      ranges.push({ from, to: i })
      continue
    }

    i++
  }

  return ranges
}

