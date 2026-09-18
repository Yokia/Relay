import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import FormData from 'form-data'

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
    try {
      data = JSON.parse(req.bodyRaw)
    } catch {
      data = req.bodyRaw
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
        form.append(item.key.trim(), item.value)
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
      contentType
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
      error: err.message || 'Request failed'
    }
  }
}
