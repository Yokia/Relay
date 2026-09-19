/**
 * Utility functions for DevToys / Scratchpad
 * Includes MD5, Web Crypto SHA, UTF-8 Base64, URL encode/decode, and JWT inspection.
 */

// --- 1. Pure JS MD5 Implementation ---
function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff)
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
  return (msw << 16) | (lsw & 0xffff)
}

function bitRotateLeft(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt))
}

function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
}

function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t)
}

function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
}

function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(b ^ c ^ d, a, b, x, s, t)
}

function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t)
}

function binlMD5(x: number[], len: number): number[] {
  x[len >> 5] |= 0x80 << len % 32
  x[(((len + 64) >>> 9) << 4) + 14] = len

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  for (let i = 0; i < x.length; i += 16) {
    const olda = a
    const oldb = b
    const oldc = c
    const oldd = d

    a = md5ff(a, b, c, d, x[i], 7, -680876936)
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)

    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
    b = md5gg(b, c, d, a, x[i], 20, -373897302)
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)

    a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
    d = md5hh(d, a, b, c, x[i], 11, -358537222)
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)

    a = md5ii(a, b, c, d, x[i], 6, -198630844)
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)

    a = safeAdd(a, olda)
    b = safeAdd(b, oldb)
    c = safeAdd(c, oldc)
    d = safeAdd(d, oldd)
  }
  return [a, b, c, d]
}

function binl2rstr(input: number[]): string {
  let output = ''
  const length8 = input.length * 32
  for (let i = 0; i < length8; i += 8) {
    output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff)
  }
  return output
}

function rstr2binl(input: string): number[] {
  const output: number[] = []
  output[(input.length >> 2) - 1] = 0
  for (let i = 0; i < output.length; i++) {
    output[i] = 0
  }
  const length8 = input.length * 8
  for (let i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32
  }
  return output
}

function rstrMD5(s: string): string {
  return binl2rstr(binlMD5(rstr2binl(s), s.length * 8))
}

function rstr2hex(input: string): string {
  const hexTab = '0123456789abcdef'
  let output = ''
  for (let i = 0; i < input.length; i++) {
    const x = input.charCodeAt(i)
    output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
  }
  return output
}

export function computeMD5(string: string): string {
  if (!string) return ''
  const utf8 = unescape(encodeURIComponent(string))
  return rstr2hex(rstrMD5(utf8))
}

// --- 2. Web Crypto SHA hashes ---
export async function computeHash(
  text: string,
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
): Promise<string> {
  if (!text) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await window.crypto.subtle.digest(algorithm, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// --- 3. UTF-8 Base64 Encoder / Decoder ---
export function encodeBase64(text: string, urlSafe = false): string {
  if (!text) return ''
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  let b64 = btoa(binary)
  if (urlSafe) {
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  return b64
}

export function decodeBase64(text: string, urlSafe = false): string {
  if (!text) return ''
  let cleaned = text.trim()
  if (urlSafe || cleaned.includes('-') || cleaned.includes('_')) {
    cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/')
    while (cleaned.length % 4) {
      cleaned += '='
    }
  }
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

// --- 4. JWT Inspector ---
export interface ParsedJwt {
  header: any
  payload: any
  signature: string
  isExpired?: boolean
  issuedAt?: string
  expiresAt?: string
  notBefore?: string
}

export function parseJwt(token: string): ParsedJwt {
  const parts = token.trim().split('.')
  if (parts.length < 2) {
    throw new Error('Invalid JWT: Token must have at least 2 parts separated by dot')
  }

  const decodeJwtPart = (part: string) => {
    let base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const jsonStr = new TextDecoder().decode(bytes)
    return JSON.parse(jsonStr)
  }

  const header = decodeJwtPart(parts[0])
  const payload = decodeJwtPart(parts[1])
  const signature = parts[2] || ''

  let isExpired: boolean | undefined = undefined
  let issuedAt: string | undefined = undefined
  let expiresAt: string | undefined = undefined
  let notBefore: string | undefined = undefined

  if (payload) {
    if (typeof payload.exp === 'number') {
      const expDate = new Date(payload.exp * 1000)
      expiresAt = formatDateTime(expDate)
      isExpired = expDate.getTime() < Date.now()
    }
    if (typeof payload.iat === 'number') {
      issuedAt = formatDateTime(new Date(payload.iat * 1000))
    }
    if (typeof payload.nbf === 'number') {
      notBefore = formatDateTime(new Date(payload.nbf * 1000))
    }
  }

  return {
    header,
    payload,
    signature,
    isExpired,
    issuedAt,
    expiresAt,
    notBefore
  }
}

// --- 5. Date and Timestamp helpers ---
export function formatDateTime(date: Date): string {
  if (isNaN(date.getTime())) return 'Invalid Date'
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

export function formatRelativeTime(targetDate: Date, lang: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const diffMs = targetDate.getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const isPast = diffSec < 0
  const absSec = Math.abs(diffSec)

  if (absSec < 5) {
    return lang === 'zh-CN' ? '刚刚' : 'just now'
  }

  const minutes = Math.floor(absSec / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (lang === 'zh-CN') {
    if (days > 0) return isPast ? `${days}天前` : `${days}天后`
    if (hours > 0) return isPast ? `${hours}小时前` : `${hours}小时后`
    if (minutes > 0) return isPast ? `${minutes}分钟前` : `${minutes}分钟后`
    return isPast ? `${absSec}秒前` : `${absSec}秒后`
  } else {
    if (days > 0) return isPast ? `${days} day${days > 1 ? 's' : ''} ago` : `in ${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return isPast ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `in ${hours} hour${hours > 1 ? 's' : ''}`
    if (minutes > 0) return isPast ? `${minutes} minute${minutes > 1 ? 's' : ''} ago` : `in ${minutes} minute${minutes > 1 ? 's' : ''}`
    return isPast ? `${absSec} second${absSec > 1 ? 's' : ''} ago` : `in ${absSec} second${absSec > 1 ? 's' : ''}`
  }
}
