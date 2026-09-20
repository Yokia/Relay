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
