import { KeyValueItem } from '../types'

/**
 * Parses query parameters from a URL string into KeyValueItem array,
 * preserving existing descriptions and non-overlapping disabled params.
 */
export function parseUrlToParams(
  url: string,
  existingParams: KeyValueItem[] = []
): KeyValueItem[] {
  if (!url) {
    return existingParams.filter((p) => !p.enabled && (p.key.trim() || p.value.trim()))
  }

  // Strip hash fragment if present
  const hashIdx = url.indexOf('#')
  const cleanUrl = hashIdx !== -1 ? url.slice(0, hashIdx) : url

  const qIdx = cleanUrl.indexOf('?')
  if (qIdx === -1) {
    // No query parameters in URL. Retain only previously disabled parameters
    return existingParams.filter((p) => !p.enabled && (p.key.trim() || p.value.trim()))
  }

  const queryString = cleanUrl.slice(qIdx + 1)
  if (!queryString) {
    return existingParams.filter((p) => !p.enabled && (p.key.trim() || p.value.trim()))
  }

  const pairs = queryString.split('&')
  const parsedPairs: Array<{ key: string; value: string }> = []

  for (const part of pairs) {
    if (!part) continue
    const eqIdx = part.indexOf('=')
    let rawKey = eqIdx !== -1 ? part.slice(0, eqIdx) : part
    let rawVal = eqIdx !== -1 ? part.slice(eqIdx + 1) : ''

    let key = rawKey
    let value = rawVal
    try {
      key = decodeURIComponent(rawKey)
    } catch {
      key = rawKey
    }
    try {
      value = decodeURIComponent(rawVal)
    } catch {
      value = rawVal
    }

    parsedPairs.push({ key, value })
  }

  const usedIndices = new Set<number>()
  const result: KeyValueItem[] = []

  // 1. Map each parsed pair, reusing existing metadata (description, etc.) if key matches
  for (const pair of parsedPairs) {
    const matchIdx = existingParams.findIndex(
      (p, idx) => !usedIndices.has(idx) && p.key === pair.key
    )

    if (matchIdx !== -1) {
      usedIndices.add(matchIdx)
      result.push({
        ...existingParams[matchIdx],
        key: pair.key,
        value: pair.value,
        enabled: true
      })
    } else {
      result.push({
        key: pair.key,
        value: pair.value,
        enabled: true
      })
    }
  }

  // 2. Retain any disabled parameters that were NOT in the URL
  existingParams.forEach((p, idx) => {
    if (!usedIndices.has(idx) && !p.enabled && (p.key.trim() || p.value.trim())) {
      result.push(p)
    }
  })

  return result
}

/**
 * Reconstructs a URL from base URL and KeyValueItem params.
 */
export function buildUrlWithParams(
  currentUrl: string,
  params: KeyValueItem[] = []
): string {
  if (!currentUrl && (!params || params.length === 0)) {
    return ''
  }

  const safeUrl = currentUrl || ''
  const hashIdx = safeUrl.indexOf('#')
  const hash = hashIdx !== -1 ? safeUrl.slice(hashIdx) : ''
  const urlBeforeHash = hashIdx !== -1 ? safeUrl.slice(0, hashIdx) : safeUrl
  const qIdx = urlBeforeHash.indexOf('?')
  const baseUrl = qIdx !== -1 ? urlBeforeHash.slice(0, qIdx) : urlBeforeHash

  const enabledParams = params.filter(
    (p) => p.enabled && (p.key.trim() !== '' || p.value.trim() !== '')
  )

  if (enabledParams.length === 0) {
    return baseUrl + hash
  }

  const queryParts = enabledParams.map((p) => {
    const k = p.key || ''
    const v = p.value !== undefined ? p.value : ''
    if (k && v !== '') {
      return `${k}=${v}`
    } else if (k) {
      return `${k}=`
    } else {
      return `=${v}`
    }
  })

  const queryString = queryParts.join('&')
  return `${baseUrl}?${queryString}${hash}`
}

/**
 * Checks if two KeyValueItem arrays are functionally equivalent.
 */
export function areParamsEquivalent(
  a: KeyValueItem[] = [],
  b: KeyValueItem[] = []
): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i]
    const itemB = b[i]
    if (
      itemA.key !== itemB.key ||
      itemA.value !== itemB.value ||
      itemA.enabled !== itemB.enabled ||
      itemA.description !== itemB.description
    ) {
      return false
    }
  }
  return true
}
