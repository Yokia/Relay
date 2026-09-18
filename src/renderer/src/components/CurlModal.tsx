import React, { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { RequestItem } from '../types'

interface Props {
  isOpen: boolean
  mode: 'import' | 'export'
  onClose: () => void
  onImport?: (parsed: Partial<RequestItem>) => void
  currentRequest?: RequestItem
}

export const CurlModal: React.FC<Props> = ({
  isOpen,
  mode,
  onClose,
  onImport,
  currentRequest
}) => {
  const [curlText, setCurlText] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Generate cURL
  const generateCurl = (req: RequestItem) => {
    let curl = `curl --location --request ${req.method} '${req.url}'`
    if (req.headers) {
      req.headers.forEach((h) => {
        if (h.enabled && h.key) {
          curl += ` \
  --header '${h.key}: ${h.value}'`
        }
      })
    }
    if (req.bodyType === 'json' && req.bodyRaw) {
      curl += ` \
  --header 'Content-Type: application/json'`
      curl += ` \
  --data-raw '${req.bodyRaw.replace(/'/g, "'\\''")}'`
    }
    return curl
  }

  const exportText = currentRequest ? generateCurl(currentRequest) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse simple cURL
  const parseCurl = (text: string) => {
    try {
      const clean = text.replace(/\\\n/g, ' ').replace(/\r?\n/g, ' ')
      const methodMatch = clean.match(/-X\s+([A-Z]+)|--request\s+([A-Z]+)/)
      const method = (methodMatch ? methodMatch[1] || methodMatch[2] : 'GET') as any

      const urlMatch = clean.match(/curl\s+.*?['"](https?:\/\/[^'"]+)['"]/) || clean.match(/['"](https?:\/\/[^'"]+)['"]/) || clean.match(/(https?:\/\/[^\s]+)/)
      const url = urlMatch ? urlMatch[1] : ''

      const headers: { key: string; value: string; enabled: boolean }[] = []
      const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g
      let match
      while ((match = headerRegex.exec(clean)) !== null) {
        const parts = match[1].split(':')
        if (parts.length >= 2) {
          headers.push({
            key: parts[0].trim(),
            value: parts.slice(1).join(':').trim(),
            enabled: true
          })
        }
      }

      let bodyRaw = ''
      let bodyType: RequestItem['bodyType'] = 'none'
      const dataMatch = clean.match(/(?:-d|--data|--data-raw)\s+['"](.*?)['"](?=\s+-[a-zA-Z]|\s*$)/s)
      if (dataMatch) {
        bodyRaw = dataMatch[1]
        bodyType = 'json'
      }

      if (onImport) {
        onImport({
          method,
          url,
          headers,
          bodyRaw,
          bodyType
        })
      }
      onClose()
    } catch (e) {
      alert('Failed to parse cURL command. Please check formatting.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">
            {mode === 'import' ? 'Import cURL' : 'Export as cURL'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {mode === 'import' ? (
            <>
              <textarea
                placeholder="Paste your cURL command here..."
                value={curlText}
                onChange={(e) => setCurlText(e.target.value)}
                className="w-full h-44 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => parseCurl(curlText)}
                  disabled={!curlText.trim()}
                  className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-medium rounded transition-colors"
                >
                  Import
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <textarea
                  readOnly
                  value={exportText}
                  className="w-full h-44 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none resize-none"
                />
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
