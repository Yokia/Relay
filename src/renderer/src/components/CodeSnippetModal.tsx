import React, { useState } from 'react'
import { X, Copy, Check, Code2, Terminal } from 'lucide-react'
import { RequestItem } from '../types'
import { useI18n } from '../i18n'
import { stripJsonComments } from '../utils/jsonUtils'

interface Props {
  isOpen: boolean
  request: RequestItem
  resolvedUrl?: string
  onClose: () => void
  onToast?: (msg: string) => void
}

type LangTarget = 'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'java'

export const CodeSnippetModal: React.FC<Props> = ({
  isOpen,
  request,
  resolvedUrl,
  onClose,
  onToast
}) => {
  const { t } = useI18n()
  const [selectedLang, setSelectedLang] = useState<LangTarget>('fetch')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const url = resolvedUrl || request.url || 'https://api.example.com'
  const method = request.method || 'GET'
  const activeHeaders = (request.headers || []).filter((h) => h.enabled && h.key)
  const headerObj: Record<string, string> = {}
  activeHeaders.forEach((h) => {
    headerObj[h.key] = h.value
  })

  // Body handling with robust JSON formatting & blank line stripping
  let formattedJsonObject: any = null
  let bodyContent = ''
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (request.bodyType === 'json' && request.bodyRaw) {
      const stripped = stripJsonComments(request.bodyRaw)
      try {
        formattedJsonObject = JSON.parse(stripped)
        bodyContent = JSON.stringify(formattedJsonObject, null, 2)
      } catch {
        // If JSON.parse fails (e.g. template variables inside), remove blank lines from stripped comments
        bodyContent = stripped
          .split('\n')
          .filter((line, idx, arr) => {
            if (line.trim() !== '') return true
            return idx > 0 && arr[idx - 1].trim() !== ''
          })
          .join('\n')
      }
      if (!headerObj['Content-Type']) {
        headerObj['Content-Type'] = 'application/json'
      }
    } else if (request.bodyType === 'x-www-form-urlencoded' && request.bodyUrlEncoded) {
      const parts: string[] = []
      request.bodyUrlEncoded
        .filter((i) => i.enabled && i.key)
        .forEach((i) => parts.push(`${encodeURIComponent(i.key)}=${encodeURIComponent(i.value)}`))
      bodyContent = parts.join('&')
      if (!headerObj['Content-Type']) {
        headerObj['Content-Type'] = 'application/x-www-form-urlencoded'
      }
    } else if (request.bodyType === 'raw' && request.bodyRaw) {
      bodyContent = request.bodyRaw.replace(/\n{3,}/g, '\n\n')
    }
  }

  const generateSnippet = (lang: LangTarget): string => {
    switch (lang) {
      case 'curl': {
        let cmd = `curl --location --request ${method} '${url}'`
        for (const [k, v] of Object.entries(headerObj)) {
          cmd += ` \\\n  --header '${k}: ${v}'`
        }
        if (formattedJsonObject !== null) {
          const compactJson = JSON.stringify(formattedJsonObject)
          cmd += ` \\\n  --data-raw '${compactJson.replace(/'/g, "'\\''")}'`
        } else if (bodyContent) {
          cmd += ` \\\n  --data-raw '${bodyContent.replace(/'/g, "'\\''")}'`
        }
        return cmd
      }

      case 'fetch': {
        const headersStr =
          Object.keys(headerObj).length > 0
            ? JSON.stringify(headerObj, null, 2)
                .split('\n')
                .map((line, idx) => (idx === 0 ? line : '    ' + line))
                .join('\n')
            : '{}'

        let code = `// JavaScript Fetch\nconst myHeaders = ${headersStr};\n\nconst requestOptions = {\n  method: '${method}',\n  headers: myHeaders`
        if (formattedJsonObject !== null) {
          const formatted = JSON.stringify(formattedJsonObject, null, 2)
          const indented = formatted
            .split('\n')
            .map((line, idx) => (idx === 0 ? line : '  ' + line))
            .join('\n')
          code += `,\n  body: JSON.stringify(${indented})`
        } else if (bodyContent) {
          if (request.bodyType === 'json') {
            const indented = bodyContent
              .split('\n')
              .map((line, idx) => (idx === 0 ? line : '  ' + line))
              .join('\n')
            code += `,\n  body: JSON.stringify(${indented})`
          } else {
            code += `,\n  body: ${JSON.stringify(bodyContent)}`
          }
        }
        code += `,\n  redirect: 'follow'\n};\n\ntry {\n  const response = await fetch('${url}', requestOptions);\n  const result = await response.json();\n  console.log(result);\n} catch (error) {\n  console.error('Fetch error:', error);\n}`
        return code
      }

      case 'axios': {
        let code = `// JavaScript / TypeScript Axios\nimport axios from 'axios';\n\nconst config = {\n  method: '${method.toLowerCase()}',\n  url: '${url}',\n  headers: ${JSON.stringify(headerObj, null, 4)}`
        if (formattedJsonObject !== null) {
          code += `,\n  data: ${JSON.stringify(formattedJsonObject, null, 4)}`
        } else if (bodyContent) {
          if (request.bodyType === 'json') {
            code += `,\n  data: ${bodyContent}`
          } else {
            code += `,\n  data: ${JSON.stringify(bodyContent)}`
          }
        }
        code += `\n};\n\naxios.request(config)\n  .then((response) => {\n    console.log(JSON.stringify(response.data));\n  })\n  .catch((error) => {\n    console.error(error);\n  });`
        return code
      }

      case 'python': {
        let code = `import requests\nimport json\n\nurl = "${url}"\n\nheaders = ${JSON.stringify(headerObj, null, 4)}\n\n`
        if (formattedJsonObject !== null) {
          code += `payload = json.dumps(${JSON.stringify(formattedJsonObject, null, 4)})\n\n`
          code += `response = requests.request("${method}", url, headers=headers, data=payload)\n\n`
        } else if (bodyContent) {
          code += `payload = ${JSON.stringify(bodyContent)}\n\n`
          code += `response = requests.request("${method}", url, headers=headers, data=payload)\n\n`
        } else {
          code += `response = requests.request("${method}", url, headers=headers)\n\n`
        }
        code += `print(response.status_code)\nprint(response.text)`
        return code
      }

      case 'go': {
        let code = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"\n`
        if (formattedJsonObject !== null || bodyContent) {
          code += `\t"strings"\n`
        }
        code += `)\n\nfunc main() {\n\turl := "${url}"\n\tmethod := "${method}"\n\n`
        if (formattedJsonObject !== null) {
          const goJson = JSON.stringify(formattedJsonObject, null, 2)
          code += `\tpayload := strings.NewReader(\`${goJson.replace(/`/g, '` + "`" + `')}\`)\n\n`
          code += `\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, payload)\n`
        } else if (bodyContent) {
          code += `\tpayload := strings.NewReader(\`${bodyContent.replace(/`/g, '` + "`" + `')}\`)\n\n`
          code += `\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, payload)\n`
        } else {
          code += `\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, nil)\n`
        }
        code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
        for (const [k, v] of Object.entries(headerObj)) {
          code += `\treq.Header.Add("${k}", "${v}")\n`
        }
        code += `\n\tres, err := client.Do(req)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n\tdefer res.Body.Close()\n\n\tbody, err := io.ReadAll(res.Body)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n\tfmt.Println(string(body))\n}`
        return code
      }

      case 'java': {
        let code = `// Java OkHttp\nimport okhttp3.*;\nimport java.io.IOException;\n\npublic class Main {\n  public static void main(String[] args) throws IOException {\n    OkHttpClient client = new OkHttpClient().newBuilder().build();\n`
        if (formattedJsonObject !== null) {
          const compactJson = JSON.stringify(formattedJsonObject)
          code += `    MediaType mediaType = MediaType.parse("${headerObj['Content-Type'] || 'application/json'}");\n`
          code += `    RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(compactJson)});\n`
          code += `    Request request = new Request.Builder()\n      .url("${url}")\n      .method("${method}", body)\n`
        } else if (bodyContent) {
          code += `    MediaType mediaType = MediaType.parse("${headerObj['Content-Type'] || 'text/plain'}");\n`
          code += `    RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(bodyContent)});\n`
          code += `    Request request = new Request.Builder()\n      .url("${url}")\n      .method("${method}", body)\n`
        } else {
          code += `    Request request = new Request.Builder()\n      .url("${url}")\n      .method("${method}", null)\n`
        }
        for (const [k, v] of Object.entries(headerObj)) {
          code += `      .addHeader("${k}", "${v}")\n`
        }
        code += `      .build();\n    Response response = client.newCall(request).execute();\n    System.out.println(response.body().string());\n  }\n}`
        return code
      }

      default:
        return ''
    }
  }

  const currentSnippet = generateSnippet(selectedLang)

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet)
    setCopied(true)
    if (onToast) onToast(t('toast.codeCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const languages: { id: LangTarget; label: string }[] = [
    { id: 'fetch', label: t('codeSnippet.fetch') },
    { id: 'axios', label: t('codeSnippet.axios') },
    { id: 'python', label: t('codeSnippet.python') },
    { id: 'go', label: t('codeSnippet.go') },
    { id: 'java', label: t('codeSnippet.java') },
    { id: 'curl', label: t('codeSnippet.curl') }
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-200">
            <div className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Code2 className="w-4 h-4" />
            </div>
            <span>{t('codeSnippet.title')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {/* Language Selector Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLang(lang.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors border ${
                  selectedLang === lang.id
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-400 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Code Viewer Container */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto font-mono text-xs text-slate-200 relative group min-h-[260px] max-h-[440px]">
            <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono">
              <code>{currentSnippet}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            {method} {url.slice(0, 45)}...
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 rounded-md transition-colors font-medium"
            >
              {t('common.close')}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-1.5 text-xs bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md transition-colors shadow-sm flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('codeSnippet.copied') : t('codeSnippet.copyCode')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
