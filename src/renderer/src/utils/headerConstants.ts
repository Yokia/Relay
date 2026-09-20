import { KeyValueItem } from '../types'

/**
 * Default standard HTTP request headers populated for new requests.
 */
export const DEFAULT_HEADERS: KeyValueItem[] = [
  {
    key: 'User-Agent',
    value: 'Relay/1.0.0',
    enabled: true,
    description: '客户端标识 (Client Identifier)'
  },
  {
    key: 'Accept',
    value: '*/*',
    enabled: true,
    description: '接收任意响应格式 (Accept Any Format)'
  },
  {
    key: 'Accept-Encoding',
    value: 'gzip, deflate, br',
    enabled: true,
    description: '启用 HTTP 压缩传输 (Enable Compression)'
  },
  {
    key: 'Connection',
    value: 'keep-alive',
    enabled: true,
    description: '保持 TCP 连接复用 (Keep-Alive)'
  }
]

/**
 * Returns a new deep clone of default headers.
 */
export function createDefaultHeaders(): KeyValueItem[] {
  return DEFAULT_HEADERS.map((h) => ({ ...h }))
}

/**
 * Common standard HTTP header keys for autocompletion suggestions.
 */
export const COMMON_HEADER_KEYS: string[] = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'ETag',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Origin',
  'Pragma',
  'Range',
  'Referer',
  'Sec-Fetch-Dest',
  'Sec-Fetch-Mode',
  'Sec-Fetch-Site',
  'Sec-Fetch-User',
  'Upgrade-Insecure-Requests',
  'User-Agent',
  'X-API-Key',
  'X-CSRF-Token',
  'X-Forwarded-For',
  'X-Forwarded-Host',
  'X-Forwarded-Proto',
  'X-Requested-With'
]

/**
 * Common standard HTTP header values for autocompletion suggestions.
 */
export const COMMON_HEADER_VALUES: string[] = [
  '*/*',
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/html',
  'text/xml',
  'application/xml',
  'application/octet-stream',
  'gzip, deflate, br',
  'keep-alive',
  'close',
  'no-cache',
  'no-store',
  'max-age=0',
  'zh-CN,zh;q=0.9,en;q=0.8',
  'en-US,en;q=0.9',
  'Bearer {{token}}',
  'Basic {{credentials}}',
  'Relay/1.0.0',
  'XMLHttpRequest'
]

export interface HeaderPreset {
  id: string
  labelKey: string
  headers: KeyValueItem[]
}

export const HEADER_PRESETS: HeaderPreset[] = [
  {
    id: 'default',
    labelKey: 'presetDefault',
    headers: [
      { key: 'User-Agent', value: 'Relay/1.0.0', enabled: true },
      { key: 'Accept', value: '*/*', enabled: true },
      { key: 'Accept-Encoding', value: 'gzip, deflate, br', enabled: true },
      { key: 'Connection', value: 'keep-alive', enabled: true }
    ]
  },
  {
    id: 'json',
    labelKey: 'presetJson',
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Accept', value: 'application/json, text/plain, */*', enabled: true }
    ]
  },
  {
    id: 'no-cache',
    labelKey: 'presetNoCache',
    headers: [
      { key: 'Cache-Control', value: 'no-cache', enabled: true },
      { key: 'Pragma', value: 'no-cache', enabled: true }
    ]
  },
  {
    id: 'bearer',
    labelKey: 'presetBearer',
    headers: [
      { key: 'Authorization', value: 'Bearer {{token}}', enabled: true }
    ]
  }
]

/**
 * Parses raw header text into KeyValueItem array.
 * Supports:
 * - Chrome / Edge DevTools two-line alternating format (key on line N, value on line N+1)
 * - Standard colon format (key: value)
 * - HTTP/2 pseudo-headers (:authority: example.com)
 * - Tab-delimited format (key\tvalue)
 * - JSON object format ({"key": "value"})
 */
export function parseRawHeaders(rawText: string): KeyValueItem[] {
  if (!rawText || !rawText.trim()) return []
  const trimmed = rawText.trim()

  // 1. Check JSON format
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([key, val]) => ({
          key: key.trim(),
          value: typeof val === 'object' ? JSON.stringify(val) : String(val),
          enabled: true
        }))
      }
    } catch {
      // Continue to line parsing
    }
  }

  // Split into lines
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  // 2. Check tab-separated format
  const tabLineCount = lines.filter((l) => l.includes('\t')).length
  if (tabLineCount >= Math.ceil(lines.length * 0.5)) {
    return lines
      .map((line) => {
        const parts = line.split('\t')
        return {
          key: parts[0].trim(),
          value: parts.slice(1).join('\t').trim(),
          enabled: true
        }
      })
      .filter((h) => h.key)
  }

  // 3. Check colon-separated format (key: value or :authority: example.com)
  const validKeyValueColonLines = lines.filter((line) => {
    const stripped = line.startsWith(':') ? line.slice(1) : line
    const colonIdx = stripped.indexOf(':')
    if (colonIdx <= 0) return false
    const potentialKey = stripped.slice(0, colonIdx).trim()
    return potentialKey.length > 0 && !potentialKey.includes(' ')
  })

  if (validKeyValueColonLines.length >= Math.ceil(lines.length * 0.5)) {
    return lines
      .map((line) => {
        let key = ''
        let value = ''
        if (line.startsWith(':')) {
          const nextColon = line.indexOf(':', 1)
          if (nextColon > 1) {
            key = line.slice(0, nextColon).trim()
            value = line.slice(nextColon + 1).trim()
          } else {
            key = line.trim()
          }
        } else {
          const colonIdx = line.indexOf(':')
          if (colonIdx > 0) {
            key = line.slice(0, colonIdx).trim()
            value = line.slice(colonIdx + 1).trim()
          } else {
            key = line.trim()
          }
        }
        return { key, value, enabled: true }
      })
      .filter((h) => h.key)
  }

  // 4. Chrome DevTools alternating two-line format (line 2i is key, line 2i+1 is value)
  const result: KeyValueItem[] = []
  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i].trim()
    const value = i + 1 < lines.length ? lines[i + 1].trim() : ''
    if (key) {
      result.push({ key, value, enabled: true })
    }
  }

  return result
}
