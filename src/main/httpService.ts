import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import FormData from 'form-data'
import fs from 'fs'

export interface RequestPayload {
  id?: string
  method: string
  url: string
  headers?: { key: string; value: string; enabled: boolean }[]
  params?: { key: string; value: string; enabled: boolean }[]
  bodyType?: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'
  bodyRaw?: string
  bodyFormData?: { key: string; value: string; type: 'text' | 'file'; filePath?: string; enabled: boolean }[]
  bodyUrlEncoded?: { key: string; value: string; enabled: boolean }[]
  timeout?: number
  rejectUnauthorized?: boolean
  auth?: {
    type: 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2'
    token?: string
    username?: string
    password?: string
    key?: string
    value?: string
    in?: 'header' | 'query'
    grantType?: 'client_credentials' | 'password'
    tokenUrl?: string
    clientId?: string
    clientSecret?: string
    scope?: string
    accessToken?: string
  }
}

export interface ResponseResult {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  size: number
  time: number
  contentType: string
  error?: string
}

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

  return removeTrailingCommas(result)
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

export async function executeRequest(req: RequestPayload): Promise<ResponseResult> {
  const startTime = Date.now()

  // 1. Prepare Headers
  const headers: Record<string, string> = {}
  if (req.headers) {
    for (const h of req.headers) {
      if (h.enabled && h.key.trim()) {
        headers[h.key.trim()] = h.value
      }
    }
  }

  const auth = req.auth
  if (auth?.type === 'oauth2' && !auth.accessToken && auth.tokenUrl && auth.clientId) {
    try {
      const tokenParams = new URLSearchParams({
        grant_type: auth.grantType || 'client_credentials',
        client_id: auth.clientId,
        client_secret: auth.clientSecret || ''
      })
      if (auth.grantType === 'password') {
        tokenParams.set('username', auth.username || '')
        tokenParams.set('password', auth.password || '')
      }
      if (auth.scope) tokenParams.set('scope', auth.scope)
      const tokenResponse = await axios.post(auth.tokenUrl, tokenParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: req.timeout || 30000,
        validateStatus: () => true
      })
      if (tokenResponse.status >= 200 && tokenResponse.status < 300 && tokenResponse.data?.access_token) {
        auth.accessToken = tokenResponse.data.access_token
      }
    } catch {
      // The main request below will return the original network/auth error.
    }
  }
  if (auth?.type === 'oauth2' && auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`
  }
  else if (auth?.type === 'bearer' && auth.token) {
    headers.Authorization = `Bearer ${auth.token}`
  } else if (auth?.type === 'basic' && (auth.username || auth.password)) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.username || ''}:${auth.password || ''}`).toString('base64')}`
  } else if (auth?.type === 'api-key' && auth.key && auth.value && auth.in !== 'query') {
    headers[auth.key] = auth.value
  }

  // 2. Prepare Params
  const params: Record<string, string> = {}
  if (req.params) {
    for (const p of req.params) {
      if (p.enabled && p.key.trim()) {
        params[p.key.trim()] = p.value
      }
    }
  }

  // 3. Prepare Data
  let data: any = undefined
  if (req.bodyType === 'json' && req.bodyRaw) {
    const cleanedJson = stripJsonComments(req.bodyRaw)
    try {
      data = JSON.parse(cleanedJson)
    } catch {
      data = cleanedJson.trim() ? cleanedJson : req.bodyRaw
    }
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
  } else if (req.bodyType === 'x-www-form-urlencoded' && req.bodyUrlEncoded) {
    const searchParams = new URLSearchParams()
    for (const item of req.bodyUrlEncoded) {
      if (item.enabled && item.key.trim()) {
        searchParams.append(item.key.trim(), item.value)
      }
    }
    data = searchParams.toString()
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
  } else if (req.bodyType === 'form-data' && req.bodyFormData) {
    const form = new FormData()
    for (const item of req.bodyFormData) {
      if (item.enabled && item.key.trim()) {
        if ((item as any).type === 'file' && (item as any).filePath) {
          if (fs.existsSync((item as any).filePath)) {
            form.append(item.key.trim(), fs.createReadStream((item as any).filePath))
          }
        } else {
          form.append(item.key.trim(), item.value)
        }
      }
    }
    data = form
    Object.assign(headers, form.getHeaders())
  } else if (req.bodyType === 'raw') {
    data = req.bodyRaw
  }

  const config: AxiosRequestConfig = {
    method: req.method,
    url: req.url,
    headers,
    params,
    data,
    timeout: req.timeout || 30000,
    validateStatus: () => true, // Don't throw for 4xx/5xx
    transformResponse: [(resData) => resData] // Keep raw string or stream to calculate accurate size
  }

  if (auth?.type === 'api-key' && auth.key && auth.value && auth.in === 'query') {
    params[auth.key] = auth.value
  }

  try {
    const response: AxiosResponse = await axios(config)
    const endTime = Date.now()
    const duration = endTime - startTime

    // Calculate response size
    let resData = response.data
    let size = 0
    if (typeof resData === 'string') {
      size = Buffer.byteLength(resData, 'utf8')
    } else if (Buffer.isBuffer(resData)) {
      size = resData.length
      resData = resData.toString('utf8')
    } else if (resData) {
      const jsonStr = JSON.stringify(resData)
      size = Buffer.byteLength(jsonStr, 'utf8')
    }

    // Try parsing as JSON if possible
    let parsedData = resData
    const contentType = (response.headers['content-type'] as string) || ''
    if (typeof resData === 'string' && contentType.includes('application/json')) {
      try {
        parsedData = JSON.parse(resData)
      } catch {
        parsedData = resData
      }
    }

    const flatHeaders: Record<string, string> = {}
    for (const [k, v] of Object.entries(response.headers)) {
      flatHeaders[k] = Array.isArray(v) ? v.join(', ') : (v ? String(v) : '')
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: flatHeaders,
      data: parsedData,
      size,
      time: duration,
      contentType,
      timestamp: startTime
    }
  } catch (err: any) {
    const duration = Date.now() - startTime
    return {
      status: 0,
      statusText: 'Client Error',
      headers: {},
      data: null,
      size: 0,
      time: duration,
      contentType: '',
      error: err.message || 'Request failed',
      timestamp: startTime
    }
  }
}
