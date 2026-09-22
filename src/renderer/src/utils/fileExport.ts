export interface FileFilter {
  name: string
  extensions: string[]
}

/**
 * Strips invalid characters for Windows / Unix file names and trims whitespace / dots.
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  // Strip illegal characters: \ / : * ? " < > | \r \n \t \0
  let clean = name.replace(/[\\/:*?"<>|\r\n\t\0]/g, '_').trim()
  // Remove leading and trailing dots and spaces (Windows does not allow trailing dots/spaces)
  clean = clean.replace(/^[.\s]+|[.\s]+$/g, '')
  return clean
}

/**
 * Ensures the filename ends with the specified extension, respecting known aliases (.jpeg/.jpg, etc.)
 */
export function ensureExtension(filename: string, ext: string): string {
  if (!filename) return ext.startsWith('.') ? ext : `.${ext}`
  if (!ext) return filename

  const targetExt = ext.startsWith('.') ? ext : `.${ext}`
  const lowerExt = targetExt.toLowerCase()
  const lowerName = filename.toLowerCase()

  if (lowerName.endsWith(lowerExt)) return filename

  // Common extension aliases
  if ((lowerExt === '.jpg' || lowerExt === '.jpeg') && (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg'))) {
    return filename
  }
  if ((lowerExt === '.html' || lowerExt === '.htm') && (lowerName.endsWith('.html') || lowerName.endsWith('.htm'))) {
    return filename
  }
  if ((lowerExt === '.tif' || lowerExt === '.tiff') && (lowerName.endsWith('.tif') || lowerName.endsWith('.tiff'))) {
    return filename
  }
  if ((lowerExt === '.mp4' || lowerExt === '.m4v') && (lowerName.endsWith('.mp4') || lowerName.endsWith('.m4v'))) {
    return filename
  }

  return `${filename}${targetExt}`
}

/**
 * Extracts a filename from the Content-Disposition header if available.
 */
export function extractContentDispositionFilename(headerVal?: string): string | null {
  if (!headerVal || typeof headerVal !== 'string') return null

  // RFC 5987 / RFC 6266: filename*=UTF-8''encoded_name
  const utf8Match = headerVal.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim())
      const clean = sanitizeFileName(decoded)
      if (clean) return clean
    } catch {
      // ignore decoding error
    }
  }

  // Standard: filename="name.ext" or filename=name.ext
  const match = headerVal.match(/filename\s*=\s*(?:"([^"]+)"|'([^']+)'|([^;\s]+))/i)
  if (match) {
    const raw = match[1] || match[2] || match[3]
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw.trim())
        const clean = sanitizeFileName(decoded)
        if (clean) return clean
      } catch {
        const clean = sanitizeFileName(raw.trim())
        if (clean) return clean
      }
    }
  }

  return null
}

/**
 * Extracts a filename candidate from a URL (path segments or filename query parameters).
 */
export function extractFileNameFromUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`)

    // 1. Check explicit query params for filename
    for (const key of ['filename', 'file_name', 'fileName']) {
      const val = parsed.searchParams.get(key)
      if (val) {
        try {
          const decoded = decodeURIComponent(val.trim())
          const clean = sanitizeFileName(decoded)
          if (clean) return clean
        } catch {
          const clean = sanitizeFileName(val.trim())
          if (clean) return clean
        }
      }
    }

    // 2. Check pathname segments
    const segments = parsed.pathname.split('/').map((s) => s.trim()).filter(Boolean)
    if (segments.length > 0) {
      const last = segments[segments.length - 1]
      try {
        const decoded = decodeURIComponent(last)
        const clean = sanitizeFileName(decoded)
        if (clean) return clean
      } catch {
        const clean = sanitizeFileName(last)
        if (clean) return clean
      }
    }

    // 3. Fallback to generic query params if any
    for (const key of ['file', 'name']) {
      const val = parsed.searchParams.get(key)
      if (val) {
        try {
          const decoded = decodeURIComponent(val.trim())
          const clean = sanitizeFileName(decoded)
          if (clean) return clean
        } catch {
          const clean = sanitizeFileName(val.trim())
          if (clean) return clean
        }
      }
    }
  } catch {
    // URL parsing failed
  }
  return null
}

/**
 * Determines file extension based on MIME Content-Type.
 */
export function getFileExtensionFromContentType(contentType?: string): string {
  const normType = (contentType || '').toLowerCase().split(';')[0].trim()
  const map: Record<string, string> = {
    // Video
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'video/x-flv': '.flv',
    // Image
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/x-icon': '.ico',
    // Audio
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
    'audio/flac': '.flac',
    // Docs & text
    'application/pdf': '.pdf',
    'text/html': '.html',
    'application/json': '.json',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/csv': '.csv'
  }

  if (map[normType]) return map[normType]
  if (normType.startsWith('video/')) {
    const sub = normType.split('/')[1]
    return sub ? `.${sub}` : '.mp4'
  }
  if (normType.startsWith('image/')) {
    const sub = normType.split('/')[1]
    return sub ? `.${sub}` : '.png'
  }
  if (normType.startsWith('audio/')) {
    const sub = normType.split('/')[1]
    return sub ? `.${sub}` : '.mp3'
  }
  return '.txt'
}

/**
 * Returns a suggested default filename based on URL, Content-Disposition, request name, and Content-Type.
 */
export function getSuggestedFileName(options: {
  url?: string
  headers?: Record<string, any>
  requestName?: string
  contentType?: string
  isPreview?: boolean
  isJsonObject?: boolean
}): string {
  const { url, headers, requestName, contentType, isPreview, isJsonObject } = options
  const ext = isPreview
    ? getFileExtensionFromContentType(contentType)
    : isJsonObject
      ? '.json'
      : getFileExtensionFromContentType(contentType)

  // Header content-disposition (case-insensitive lookup)
  let contentDisposition: string | undefined
  if (headers) {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-disposition') {
        contentDisposition = headers[key]
        break
      }
    }
  }

  // If in Preview mode (or saving media), prioritize URL filename and Content-Disposition!
  if (isPreview) {
    const dispositionName = extractContentDispositionFilename(contentDisposition)
    if (dispositionName) {
      return ensureExtension(dispositionName, ext)
    }

    const urlName = extractFileNameFromUrl(url)
    if (urlName) {
      return ensureExtension(urlName, ext)
    }

    const safeReq = requestName ? sanitizeFileName(requestName) : ''
    return ensureExtension(safeReq || 'media', ext)
  }

  // Not preview mode (e.g. saving body)
  const safeReq = requestName ? sanitizeFileName(requestName) : ''
  if (safeReq) {
    return ensureExtension(safeReq, ext)
  }
  const urlName = extractFileNameFromUrl(url)
  if (urlName) {
    return ensureExtension(urlName, ext)
  }
  return ensureExtension('response', ext)
}

/**
 * Returns appropriate dialog FileFilters for the given content type.
 */
export function getFileFilters(options: {
  contentType?: string
  isPreview?: boolean
  isJsonObject?: boolean
  defaultPath?: string
}): FileFilter[] {
  const { contentType, isPreview, isJsonObject, defaultPath } = options
  const normType = (contentType || '').toLowerCase().split(';')[0].trim()

  if (isPreview) {
    if (normType === 'video/mp4') {
      return [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType.startsWith('video/')) {
      const ext = normType.split('/')[1] || 'mp4'
      return [
        { name: `${ext.toUpperCase()} Video`, extensions: [ext] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'image/jpeg') {
      return [
        { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'image/png') {
      return [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'image/gif') {
      return [
        { name: 'GIF Image', extensions: ['gif'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'image/webp') {
      return [
        { name: 'WebP Image', extensions: ['webp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'image/svg+xml') {
      return [
        { name: 'SVG Image', extensions: ['svg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType.startsWith('image/')) {
      const ext = normType.split('/')[1] || 'png'
      return [
        { name: `${ext.toUpperCase()} Image`, extensions: [ext] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'audio/mpeg') {
      return [
        { name: 'MP3 Audio', extensions: ['mp3'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'audio/wav') {
      return [
        { name: 'WAV Audio', extensions: ['wav'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType.startsWith('audio/')) {
      const ext = normType.split('/')[1] || 'mp3'
      return [
        { name: `${ext.toUpperCase()} Audio`, extensions: [ext] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'application/pdf') {
      return [
        { name: 'PDF Document', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (normType === 'text/html') {
      return [
        { name: 'HTML Document', extensions: ['html', 'htm'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
  }

  // Based on defaultPath extension if available
  if (defaultPath) {
    const ext = defaultPath.split('.').pop()?.toLowerCase()
    if (ext === 'json' || isJsonObject) {
      return [
        { name: 'JSON Document', extensions: ['json'] },
        { name: 'Text Document', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (ext === 'html' || ext === 'htm') {
      return [
        { name: 'HTML Document', extensions: ['html', 'htm'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (ext === 'mp4' || ext === 'webm' || ext === 'mov' || ext === 'avi' || ext === 'mkv') {
      return [
        { name: `${ext.toUpperCase()} Video`, extensions: [ext] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return [
        { name: `${ext?.toUpperCase()} Image`, extensions: [ext || 'png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }
  }

  if (isJsonObject || normType === 'application/json') {
    return [
      { name: 'JSON Document', extensions: ['json'] },
      { name: 'Text Document', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }

  return [
    { name: 'Text Document', extensions: ['txt'] },
    { name: 'JSON Document', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
