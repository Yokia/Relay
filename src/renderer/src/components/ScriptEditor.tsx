import React from 'react'
import { CodeEditor } from './CodeEditor'
import { Code2, PlusCircle, Sparkles, HelpCircle } from 'lucide-react'
import { useI18n } from '../i18n'

interface Snippet {
  title: string
  code: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  mode: 'pre-request' | 'test'
  placeholder?: string
}

export const ScriptEditor: React.FC<Props> = ({
  value,
  onChange,
  mode,
  placeholder
}) => {
  const { t } = useI18n()

  const preRequestSnippets: Snippet[] = [
    {
      title: t('script.snipSetEnv') || 'Set an environment variable',
      code: `pm.environment.set("variable_key", "variable_value");\n`
    },
    {
      title: t('script.snipGetEnv') || 'Get an environment variable',
      code: `const myVar = pm.environment.get("variable_key");\nconsole.log("Current variable:", myVar);\n`
    },
    {
      title: t('script.snipTimestamp') || 'Set timestamp / UUID',
      code: `pm.environment.set("timestamp", Date.now());\n`
    },
    {
      title: t('script.snipAddHeader') || 'Dynamically add request header',
      code: `pm.request.headers.add({ key: "X-Request-Id", value: "req-" + Date.now() });\n`
    }
  ]

  const testSnippets: Snippet[] = [
    {
      title: t('script.snipStatus200') || 'Status code is 200',
      code: `pm.test("Status code is 200", () => {\n  pm.response.to.have.status(200);\n});\n`
    },
    {
      title: t('script.snipCheckJsonField') || 'Check JSON response field',
      code: `pm.test("Check JSON field", () => {\n  const jsonData = pm.response.json();\n  pm.expect(jsonData).to.have.property("code", 0);\n});\n`
    },
    {
      title: t('script.snipSetEnvFromResponse') || 'Set environment variable from JSON',
      code: `try {\n  const jsonData = pm.response.json();\n  if (jsonData.token) {\n    pm.environment.set("authToken", jsonData.token);\n    console.log("Token saved to environment:", jsonData.token);\n  }\n} catch (e) {\n  console.error("Failed to parse token:", e);\n}\n`
    },
    {
      title: t('script.snipResponseTime') || 'Response time is less than 500ms',
      code: `pm.test("Response time is acceptable", () => {\n  pm.expect(pm.response.responseTime).toBeLessThan(500);\n});\n`
    },
    {
      title: t('script.snipStatus2xx') || 'Successful status code (2xx)',
      code: `pm.test("Status code is 2xx", () => {\n  pm.expect(pm.response.code).toBeGreaterThan(199);\n  pm.expect(pm.response.code).toBeLessThan(300);\n});\n`
    }
  ]

  const snippets = mode === 'pre-request' ? preRequestSnippets : testSnippets

  const handleInsertSnippet = (snippetCode: string) => {
    const updated = value ? `${value.trimEnd()}\n\n${snippetCode}` : snippetCode
    onChange(updated)
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Script CodeMirror Editor */}
      <div className="flex-1 h-full min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-800">
        <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800 text-xs flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {mode === 'pre-request' ? t('script.preRequestTitle') : t('script.testTitle')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">JavaScript (pm API)</span>
        </div>

        <div className="flex-1 min-h-0">
          <CodeEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder || '// Enter custom JavaScript here...'}
            wrap={true}
          />
        </div>
      </div>

      {/* Snippet Toolbox Sidebar */}
      <div className="w-full md:w-64 bg-slate-950/30 p-3 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-2.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('script.snippetsTitle')}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {snippets.map((snip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertSnippet(snip.code)}
              className="group flex items-start gap-2 p-2 rounded-lg text-left bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/40 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 mt-0.5 shrink-0 transition-colors" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-300 group-hover:text-sky-300 font-medium leading-tight transition-colors">
                  {snip.title}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
          <span className="leading-relaxed">
            {mode === 'pre-request' ? t('script.preRequestTip') : t('script.testTip')}
          </span>
        </div>
      </div>
    </div>
  )
}
