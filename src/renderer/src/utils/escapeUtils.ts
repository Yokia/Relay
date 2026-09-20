/**
 * Utility functions for String Escape / Unescape
 * Supports JSON string escape/unescape, HTML entities, and Unicode escape/unescape.
 */

/**
 * Unescapes a JSON-encoded string (e.g. removes \" and \\, handles newlines)
 * If the string is wrapped in double quotes, it strips them properly.
 */
export function unescapeJsonString(input: string): string {
  if (!input) return ''
  let text = input.trim()

  // If input is quoted like "\"{\\\"name\\\":\\\"test\\\"}\"", try standard JSON.parse
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed === 'string') {
        return parsed
      }
    } catch {
      // Fallback to manual replacement
    }
  }

  // Handle common escape sequences
  return text
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
}

/**
 * Escapes a raw string so it can be safely embedded in JSON or code
 */
export function escapeJsonString(input: string): string {
  if (!input) return ''
  return JSON.stringify(input).slice(1, -1)
}

/**
 * Decodes HTML entities (e.g. &amp;, &lt;, &gt;, &quot;, &#39;, &#x2F;)
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return ''
  const doc = new DOMParser().parseFromString(input, 'text/html')
  return doc.documentElement.textContent || ''
}

/**
 * Encodes special characters to HTML entities
 */
export function encodeHtmlEntities(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Decodes Unicode escape sequences like \u4e2d\u6587 to characters
 */
export function decodeUnicode(input: string): string {
  if (!input) return ''
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16))
  })
}

/**
 * Encodes non-ASCII characters to \uXXXX format
 */
export function encodeUnicode(input: string): string {
  if (!input) return ''
  let output = ''
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    if (code > 127) {
      output += '\\u' + code.toString(16).padStart(4, '0')
    } else {
      output += input[i]
    }
  }
  return output
}

/**
 * Universal Code & Bracket Indentation Formatter
 * Formats any code (JSON, JS, CSS, fragments, mixed structures) with clean 2-space indentation.
 */
export function formatCodeIndentation(text: string, indentSize: number = 2): string {
  if (!text || !text.trim()) return ''
  const lines = text.split(/\r?\n/)
  const result: string[] = []
  let currentIndent = 0
  let inMultiLineString = false
  let stringQuote = ''

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      result.push('')
      continue
    }

    // Check bracket counts for the line, taking strings and comments into account
    let openCount = 0
    let closeCount = 0
    let leadingCloseCount = 0

    let inStr = inMultiLineString
    let quoteChar = stringQuote
    let isLeading = true

    for (let c = 0; c < trimmed.length; c++) {
      const ch = trimmed[c]
      const prev = c > 0 ? trimmed[c - 1] : ''

      // Skip single-line comment //
      if (!inStr && ch === '/' && trimmed[c + 1] === '/') {
        break
      }

      if (inStr) {
        if (ch === quoteChar && prev !== '\\') {
          inStr = false
          quoteChar = ''
        }
      } else {
        if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
          inStr = true
          quoteChar = ch
          isLeading = false
        } else if (ch === '{' || ch === '[' || ch === '(') {
          openCount++
          isLeading = false
        } else if (ch === '}' || ch === ']' || ch === ')') {
          closeCount++
          if (isLeading) {
            leadingCloseCount++
          }
        } else if (!/\s/.test(ch) && ch !== ',' && ch !== ':') {
          isLeading = false
        }
      }
    }

    // If the line starts with closing brackets, dedent this line first
    if (leadingCloseCount > 0) {
      currentIndent = Math.max(0, currentIndent - leadingCloseCount)
    }

    const lineIndent = currentIndent
    const indentStr = ' '.repeat(lineIndent * indentSize)
    result.push(indentStr + trimmed)

    // Update currentIndent for subsequent lines
    const remainingCloseCount = closeCount - leadingCloseCount
    currentIndent = Math.max(0, currentIndent + openCount - remainingCloseCount)
    inMultiLineString = inStr
    stringQuote = quoteChar
  }

  return result.join('\n')
}

/**
 * Sanitizes raw unescaped physical newlines inside string literals so JSON.parse can succeed
 */
export function sanitizeStringNewlines(text: string): string {
  let inString = false
  let quote = ''
  let result = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const prev = i > 0 ? text[i - 1] : ''

    if (inString) {
      if (ch === quote && prev !== '\\') {
        inString = false
        result += ch
      } else if (ch === '\n') {
        result += '\\n'
      } else if (ch === '\r') {
        // ignore carriage return
      } else {
        result += ch
      }
    } else {
      if ((ch === '"' || ch === "'") && prev !== '\\') {
        inString = true
        quote = ch
      }
      result += ch
    }
  }

  return result
}

/**
 * Strips uniform excessive leading indentations from multi-line text
 */
export function cleanExcessiveIndent(text: string): string {
  if (!text) return ''
  const lines = text.split(/\r?\n/)
  // Find minimum leading whitespace across all non-empty lines
  let minIndent = Infinity
  for (const line of lines) {
    if (!line.trim()) continue
    const match = line.match(/^(\s*)/)
    const indent = match ? match[1].length : 0
    if (indent < minIndent) {
      minIndent = indent
    }
  }

  if (minIndent === Infinity || minIndent === 0) {
    return lines.map((l) => l.trimEnd()).join('\n').trim()
  }

  return lines
    .map((line) => (line.length >= minIndent ? line.slice(minIndent) : line).trimEnd())
    .join('\n')
    .trim()
}

/**
 * Smart formatting for JSON, JSON fragments, or indented code
 * 1. Accurately detects standard JSON or reparable JSON and formats with standard 2-space indentation.
 * 2. If it's other code or fragments, formats cleanly with hierarchical bracket-based indentation.
 */
export function smartFormatText(input: string): string {
  if (!input || !input.trim()) return ''
  const trimmed = input.trim()

  // 1. Direct standard JSON parse
  try {
    const parsed = JSON.parse(trimmed)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // Continue
  }

  // 2. Check if wrapped in outer quotes e.g. "{\"a\": 1}"
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      const unquoted = JSON.parse(trimmed)
      if (typeof unquoted === 'string') {
        const nested = JSON.parse(unquoted)
        return JSON.stringify(nested, null, 2)
      }
    } catch {
      // Continue
    }
  }

  // 3. Try after sanitizing physical newlines inside strings
  const sanitized = sanitizeStringNewlines(trimmed)
  try {
    const parsed = JSON.parse(sanitized)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // Continue
  }

  // 4. Try as JSON object fragment (e.g. `"key": { ... }` or `"a": 1, "b": 2`)
  try {
    const wrappedStr = `{ ${sanitized.replace(/,?\s*$/, '')} }`
    const parsed = JSON.parse(wrappedStr)
    const formatted = JSON.stringify(parsed, null, 2)
    // If input did not have outer braces, strip outer { and } and dedent 2 spaces
    const lines = formatted.split('\n')
    if (lines.length >= 2 && lines[0].trim() === '{' && lines[lines.length - 1].trim() === '}') {
      return lines
        .slice(1, -1)
        .map((l) => (l.startsWith('  ') ? l.slice(2) : l))
        .join('\n')
    }
    return formatted
  } catch {
    // Continue
  }

  // 5. Try as JSON array fragment (e.g. `{"id": 1}, {"id": 2}`)
  try {
    const wrappedArr = `[ ${sanitized.replace(/^,?\s*/, '').replace(/,?\s*$/, '')} ]`
    const parsed = JSON.parse(wrappedArr)
    const formatted = JSON.stringify(parsed, null, 2)
    const lines = formatted.split('\n')
    if (lines.length >= 2 && lines[0].trim() === '[' && lines[lines.length - 1].trim() === ']') {
      return lines
        .slice(1, -1)
        .map((l) => (l.startsWith('  ') ? l.slice(2) : l))
        .join('\n')
    }
    return formatted
  } catch {
    // Continue
  }

  // 6. Try relaxed JS object evaluation (unquoted keys, trailing commas, single quotes)
  try {
    const fn = new Function('return (' + sanitized + ')')
    const result = fn()
    if (result && typeof result === 'object') {
      return JSON.stringify(result, null, 2)
    }
  } catch {
    // Continue
  }

  try {
    const fn = new Function('return ({' + sanitized + '})')
    const result = fn()
    if (result && typeof result === 'object') {
      const formatted = JSON.stringify(result, null, 2)
      const lines = formatted.split('\n')
      if (lines.length >= 2 && lines[0].trim() === '{' && lines[lines.length - 1].trim() === '}') {
        return lines
          .slice(1, -1)
          .map((l) => (l.startsWith('  ') ? l.slice(2) : l))
          .join('\n')
      }
      return formatted
    }
  } catch {
    // Continue
  }

  // 7. Universal Bracket-aware Code Indentation Formatter (for other code, fragments, or malformed structures)
  return formatCodeIndentation(trimmed)
}

/**
 * Comprehensive Smart Unescape:
 * Combines Unicode decode, JSON string unescape, HTML entity decode, and smart formatting
 */
export function smartUnescape(input: string): string {
  if (!input) return ''
  // 1. Decode Unicode escapes \uXXXX
  let res = decodeUnicode(input)
  // 2. Unescape JSON quotes and backslashes
  res = unescapeJsonString(res)
  // 3. Decode HTML entities
  res = decodeHtmlEntities(res)
  // 4. Smart format to clean up excessive spaces and pretty-print JSON/fragments or any other code
  return smartFormatText(res)
}
