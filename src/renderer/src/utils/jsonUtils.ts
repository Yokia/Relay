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

export interface JsonDiagnostic {
  from: number
  to: number
  severity: 'error' | 'warning' | 'info'
  message: string
  actions?: Array<{
    name: string
    apply: (view: any, from: number, to: number) => void
  }>
}

/**
 * Masks comment characters with spaces so character offsets remain 1:1 with the original string.
 */
export function maskCommentsWithSpaces(text: string): string {
  const ranges = findCommentRanges(text)
  if (ranges.length === 0) return text
  const chars = text.split('')
  for (const r of ranges) {
    for (let i = r.from; i < r.to; i++) {
      if (chars[i] !== '\n' && chars[i] !== '\r') {
        chars[i] = ' '
      }
    }
  }
  return chars.join('')
}

/**
 * Scans a stripped JSON text for any trailing commas before '}' or ']'.
 */
export function findTrailingCommas(stripped: string): Array<{ from: number; to: number }> {
  const commas: Array<{ from: number; to: number }> = []
  let inString = false
  let isEscaped = false
  let stringChar = '"'

  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i]

    if (inString) {
      if (isEscaped) isEscaped = false
      else if (char === '\\') isEscaped = true
      else if (char === stringChar) inString = false
      continue
    }

    if (char === '"' || char === "'") {
      inString = true
      stringChar = char
      isEscaped = false
      continue
    }

    if (char === ',') {
      let nextIdx = i + 1
      while (nextIdx < stripped.length && /\s/.test(stripped[nextIdx])) {
        nextIdx++
      }
      if (nextIdx < stripped.length && (stripped[nextIdx] === '}' || stripped[nextIdx] === ']')) {
        commas.push({ from: i, to: i + 1 })
      }
    }
  }
  return commas
}

function getDiagnosticBounds(pos: number, text: string): { from: number; to: number } {
  const len = text.length
  if (len === 0) return { from: 0, to: 0 }

  let p = Math.max(0, Math.min(pos, len - 1))

  if (/\s/.test(text[p])) {
    let forward = p
    while (forward < len && /\s/.test(text[forward])) forward++
    if (forward < len) {
      p = forward
    } else {
      let backward = p
      while (backward > 0 && /\s/.test(text[backward])) backward--
      p = backward
    }
  }

  let from = p
  let to = p + 1

  const char = text[p]
  if (char === '"' || char === "'") {
    to = p + 1
    while (to < len && text[to] !== char && text[to] !== '\n') {
      if (text[to] === '\\') to++
      to++
    }
    if (to < len && text[to] === char) to++
  } else if (/[a-zA-Z0-9_$-]/.test(char)) {
    while (from > 0 && /[a-zA-Z0-9_$-]/.test(text[from - 1])) from--
    while (to < len && /[a-zA-Z0-9_$-]/.test(text[to])) to++
  }

  return { from, to: Math.max(from + 1, to) }
}

/**
 * Lints JSON text supporting comments and reports precise diagnostics with red wavy underline ranges.
 */
export function lintJsonDoc(
  rawText: string,
  t?: { trailingComma?: string; syntaxError?: string; fixTrailingComma?: string }
): JsonDiagnostic[] {
  if (!rawText || !rawText.trim()) return []

  const stripped = maskCommentsWithSpaces(rawText)
  const diagnostics: JsonDiagnostic[] = []

  // 1. Detect all trailing commas before } or ]
  const trailingCommas = findTrailingCommas(stripped)
  for (const tc of trailingCommas) {
    diagnostics.push({
      from: tc.from,
      to: tc.to,
      severity: 'error',
      message: t?.trailingComma || 'JSON 不允许出现尾随逗号 (Trailing comma)',
      actions: [
        {
          name: t?.fixTrailingComma || '删除尾随逗号 (Remove comma)',
          apply: (view: any, from: number, to: number) => {
            view.dispatch({ changes: { from, to, insert: '' } })
          }
        }
      ]
    })
  }

  // 2. Validate JSON syntax after masking trailing commas
  let forValidation = stripped
  if (trailingCommas.length > 0) {
    const chars = stripped.split('')
    for (const tc of trailingCommas) {
      chars[tc.from] = ' '
    }
    forValidation = chars.join('')
  }

  try {
    JSON.parse(forValidation)
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      const match = err.message.match(/at position (\d+)/i)
      let pos = match ? parseInt(match[1], 10) : 0
      if (isNaN(pos) || pos >= rawText.length) pos = Math.max(0, rawText.length - 1)

      const bounds = getDiagnosticBounds(pos, rawText)
      diagnostics.push({
        from: bounds.from,
        to: bounds.to,
        severity: 'error',
        message: err.message
      })
    }
  }

  return diagnostics
}

export interface JsoncToken {
  type:
    | 'open_brace'
    | 'close_brace'
    | 'open_bracket'
    | 'close_bracket'
    | 'colon'
    | 'comma'
    | 'string'
    | 'literal'
    | 'line_comment'
    | 'block_comment'
  raw: string
  leadingNewlines: number
}

export function tokenizeJsonc(jsonStr: string): JsoncToken[] {
  const tokens: JsoncToken[] = []
  let i = 0
  const len = jsonStr.length
  let leadingNewlines = 0

  while (i < len) {
    const char = jsonStr[i]
    const nextChar = i + 1 < len ? jsonStr[i + 1] : ''

    // 1. Whitespace
    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      if (char === '\n') {
        leadingNewlines++
      }
      i++
      continue
    }

    // 2. Line comment: // or #
    if ((char === '/' && nextChar === '/') || char === '#') {
      const isHash = char === '#'
      let raw = isHash ? '#' : '//'
      i += isHash ? 1 : 2
      while (i < len && jsonStr[i] !== '\n' && jsonStr[i] !== '\r') {
        raw += jsonStr[i]
        i++
      }
      tokens.push({
        type: 'line_comment',
        raw,
        leadingNewlines
      })
      leadingNewlines = 0
      continue
    }

    // 3. Block comment: /* ... */
    if (char === '/' && nextChar === '*') {
      let raw = '/*'
      i += 2
      while (i < len) {
        if (jsonStr[i] === '*' && i + 1 < len && jsonStr[i + 1] === '/') {
          raw += '*/'
          i += 2
          break
        }
        raw += jsonStr[i]
        i++
      }
      tokens.push({
        type: 'block_comment',
        raw,
        leadingNewlines
      })
      leadingNewlines = 0
      continue
    }

    // 4. String literal: "..." or '...'
    if (char === '"' || char === "'") {
      const quote = char
      let raw = quote
      i++
      while (i < len) {
        const c = jsonStr[i]
        raw += c
        if (c === '\\') {
          i++
          if (i < len) {
            raw += jsonStr[i]
          }
        } else if (c === quote) {
          i++
          break
        }
        i++
      }
      tokens.push({
        type: 'string',
        raw,
        leadingNewlines
      })
      leadingNewlines = 0
      continue
    }

    // 5. Punctuations
    if (char === '{') {
      tokens.push({ type: 'open_brace', raw: '{', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }
    if (char === '}') {
      tokens.push({ type: 'close_brace', raw: '}', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }
    if (char === '[') {
      tokens.push({ type: 'open_bracket', raw: '[', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }
    if (char === ']') {
      tokens.push({ type: 'close_bracket', raw: ']', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }
    if (char === ':') {
      tokens.push({ type: 'colon', raw: ':', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }
    if (char === ',') {
      tokens.push({ type: 'comma', raw: ',', leadingNewlines })
      leadingNewlines = 0
      i++
      continue
    }

    // 6. Literals (numbers, boolean, null, unquoted text)
    let raw = ''
    while (i < len) {
      const c = jsonStr[i]
      if (
        c === ' ' ||
        c === '\t' ||
        c === '\r' ||
        c === '\n' ||
        c === '{' ||
        c === '}' ||
        c === '[' ||
        c === ']' ||
        c === ':' ||
        c === ',' ||
        c === '"' ||
        c === "'" ||
        c === '#' ||
        (c === '/' && (i + 1 < len && (jsonStr[i + 1] === '/' || jsonStr[i + 1] === '*')))
      ) {
        break
      }
      raw += c
      i++
    }
    if (raw) {
      tokens.push({ type: 'literal', raw, leadingNewlines })
      leadingNewlines = 0
    }
  }

  return tokens
}

/**
 * Formats a JSON / JSONC string with consistent indentation while safely preserving
 * all single-line comments (//, #) and multi-line comments (/* ... *\/).
 */
export function formatJsonWithComments(jsonStr: string, indentSize: number = 2): string {
  if (!jsonStr || !jsonStr.trim()) return jsonStr

  const tokens = tokenizeJsonc(jsonStr)
  if (tokens.length === 0) return ''

  let depth = 0
  let result = ''
  let atStartOfLine = true

  const write = (str: string) => {
    result += str
    atStartOfLine = false
  }

  const writeIndent = () => {
    result += ' '.repeat(depth * indentSize)
    atStartOfLine = false
  }

  const writeNewline = (count: number = 1) => {
    for (let c = 0; c < count; c++) {
      result += '\n'
    }
    atStartOfLine = true
  }

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx]
    const nextToken = tokens[idx + 1]

    switch (token.type) {
      case 'open_brace':
      case 'open_bracket': {
        const isBrace = token.type === 'open_brace'
        const closeType = isBrace ? 'close_brace' : 'close_bracket'
        const isEmpty = nextToken && nextToken.type === closeType

        if (isEmpty) {
          if (atStartOfLine) {
            if (token.leadingNewlines > 1 && result.length > 0) writeNewline()
            writeIndent()
          }
          write(token.raw + nextToken.raw)
          idx++ // skip closing bracket

          const afterNext = tokens[idx + 1]
          if (afterNext && afterNext.type !== 'comma') {
            const isInlineComment =
              (afterNext.type === 'line_comment' || afterNext.type === 'block_comment') &&
              afterNext.leadingNewlines === 0
            if (!isInlineComment) {
              writeNewline()
            }
          }
        } else {
          if (atStartOfLine) {
            if (token.leadingNewlines > 1 && result.length > 0) writeNewline()
            writeIndent()
          }
          write(token.raw)
          depth++
          writeNewline()
        }
        break
      }

      case 'close_brace':
      case 'close_bracket': {
        depth = Math.max(0, depth - 1)
        if (!atStartOfLine) writeNewline()
        writeIndent()
        write(token.raw)

        if (nextToken && nextToken.type !== 'comma') {
          const isInlineComment =
            (nextToken.type === 'line_comment' || nextToken.type === 'block_comment') &&
            nextToken.leadingNewlines === 0
          if (!isInlineComment) {
            writeNewline()
          }
        }
        break
      }

      case 'colon': {
        write(': ')
        break
      }

      case 'comma': {
        // Drop trailing comma immediately before } or ] if no comments in between
        if (nextToken && (nextToken.type === 'close_brace' || nextToken.type === 'close_bracket')) {
          break
        }
        write(',')
        const isInlineComment =
          nextToken &&
          (nextToken.type === 'line_comment' || nextToken.type === 'block_comment') &&
          nextToken.leadingNewlines === 0
        if (!isInlineComment && nextToken) {
          writeNewline()
        }
        break
      }

      case 'string':
      case 'literal': {
        if (atStartOfLine) {
          if (token.leadingNewlines > 1 && result.length > 0) writeNewline()
          writeIndent()
        }
        write(token.raw)
        break
      }

      case 'line_comment': {
        if (token.leadingNewlines === 0 && !atStartOfLine) {
          // Trailing comment on the same line
          write(' ' + token.raw)
          writeNewline()
        } else {
          // Comment on its own line
          if (!atStartOfLine) writeNewline()
          if (token.leadingNewlines > 1 && result.length > 0) writeNewline()
          writeIndent()
          write(token.raw)
          writeNewline()
        }
        break
      }

      case 'block_comment': {
        if (token.leadingNewlines === 0 && !atStartOfLine) {
          write(' ' + token.raw)
          if (nextToken && nextToken.leadingNewlines > 0) {
            writeNewline()
          }
        } else {
          if (!atStartOfLine) writeNewline()
          if (token.leadingNewlines > 1 && result.length > 0) writeNewline()
          if (token.raw.includes('\n')) {
            const lines = token.raw.split('\n')
            const baseIndent = ' '.repeat(depth * indentSize)
            const formatted = lines
              .map((line, lIdx) => {
                if (lIdx === 0) return line
                const trimmed = line.trimStart()
                if (trimmed.startsWith('*')) {
                  return baseIndent + ' ' + trimmed
                }
                return baseIndent + trimmed
              })
              .join('\n')
            writeIndent()
            write(formatted)
          } else {
            writeIndent()
            write(token.raw)
          }
          if (
            nextToken &&
            (nextToken.leadingNewlines > 0 ||
              nextToken.type === 'close_brace' ||
              nextToken.type === 'close_bracket')
          ) {
            writeNewline()
          }
        }
        break
      }
    }
  }

  return result.trimEnd()
}


