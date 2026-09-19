import React, { useState } from 'react'
import { KeyValueEditor } from './KeyValueEditor'
import { CodeEditor } from './CodeEditor'
import { ScriptEditor } from './ScriptEditor'
import { RequestItem } from '../types'
import { Sparkles, WrapText, ChevronDown, KeyRound, Plus, Trash2, FileUp } from 'lucide-react'
import { stripJsonComments } from '../utils/jsonUtils'
import { useI18n } from '../i18n'

interface Props {
  request: RequestItem
  onChange: (updates: Partial<RequestItem>) => void
}

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'extract' | 'preRequest' | 'tests'

export const RequestEditor: React.FC<Props> = ({ request, onChange }) => {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>('params')
  const [wrapLines, setWrapLines] = useState(true)

  const handleFormatJson = () => {
    if (!request.bodyRaw) return
    try {
      const parsed = JSON.parse(request.bodyRaw)
      onChange({ bodyRaw: JSON.stringify(parsed, null, 2) })
    } catch {
      try {
        const cleaned = stripJsonComments(request.bodyRaw)
        const parsed = JSON.parse(cleaned)
        onChange({ bodyRaw: JSON.stringify(parsed, null, 2) })
      } catch (e) {
        alert('Invalid JSON content. Please check syntax.')
      }
    }
  }

  const activeParamsCount = (request.params || []).filter((p) => p.enabled && p.key).length
  const activeHeadersCount = (request.headers || []).filter((h) => h.enabled && h.key).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div
        className="flex items-center gap-2 px-3 border-b border-slate-800 text-xs font-medium text-slate-400 overflow-x-auto no-scrollbar shrink-0"
        onWheel={(event) => {
          if (event.deltaY !== 0) {
            event.currentTarget.scrollLeft += event.deltaY
          }
        }}
      >
        <button
          onClick={() => setActiveTab('extract')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'extract' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>Extract</span>
          {(request.responseExtractions || []).length > 0 && <span className="ml-1.5 text-[10px] text-emerald-400">{request.responseExtractions?.length}</span>}
          {activeTab === 'extract' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />}
        </button>

        <button
          onClick={() => setActiveTab('auth')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'auth' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>Auth</span>
          {request.auth && request.auth.type !== 'none' && <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-emerald-400 rounded-full align-middle" />}
          {activeTab === 'auth' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />}
        </button>

        <button
          onClick={() => setActiveTab('params')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'params' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>{t('editor.params')}</span>
          {activeParamsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full text-[10px]">
              {activeParamsCount}
            </span>
          )}
          {activeTab === 'params' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('headers')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'headers' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>{t('editor.headers')}</span>
          {activeHeadersCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full text-[10px]">
              {activeHeadersCount}
            </span>
          )}
          {activeTab === 'headers' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('body')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'body' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>{t('editor.body')}</span>
          {request.bodyType !== 'none' && (
            <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-sky-400 rounded-full align-middle" />
          )}
          {activeTab === 'body' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('preRequest')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'preRequest' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>{t('editor.preRequest')}</span>
          {Boolean(request.preRequestScript && request.preRequestScript.trim()) && (
            <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-emerald-400 rounded-full align-middle" />
          )}
          {activeTab === 'preRequest' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={"py-2.5 px-1 relative transition-colors shrink-0 whitespace-nowrap " + (activeTab === 'tests' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
        >
          <span>{t('editor.tests')}</span>
          {Boolean(request.testScript && request.testScript.trim()) && (
            <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-amber-400 rounded-full align-middle" />
          )}
          {activeTab === 'tests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-t" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'params' && (
          <KeyValueEditor
            items={request.params || []}
            onChange={(params) => onChange({ params })}
            placeholderKey={t('editor.paramKeyPlaceholder')}
            placeholderValue={t('editor.paramValPlaceholder')}
          />
        )}

        {activeTab === 'headers' && (
          <KeyValueEditor
            items={request.headers || []}
            onChange={(headers) => onChange({ headers })}
            placeholderKey={t('editor.headerKeyPlaceholder')}
            placeholderValue={t('editor.headerValPlaceholder')}
          />
        )}

        {activeTab === 'body' && (
          <div className="flex flex-col h-full p-2">
            {/* Body Type Dropdown Selector */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <select
                    value={request.bodyType || 'none'}
                    onChange={(e) => onChange({ bodyType: e.target.value as any })}
                    className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700/90 text-xs text-slate-200 rounded px-2.5 py-1 pr-7 appearance-none cursor-pointer focus:outline-none focus:border-sky-500 font-medium transition-colors shadow-sm"
                  >
                    <option value="none" className="bg-slate-900 text-slate-200">{t('editor.bodyNone')}</option>
                    <option value="json" className="bg-slate-900 text-slate-200">{t('editor.bodyJson')}</option>
                    <option value="form-data" className="bg-slate-900 text-slate-200">Form Data</option>
                    <option value="x-www-form-urlencoded" className="bg-slate-900 text-slate-200">{t('editor.bodyUrlEncoded')}</option>
                    <option value="raw" className="bg-slate-900 text-slate-200">{t('editor.bodyRaw')}</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(request.bodyType === 'json' || request.bodyType === 'raw') && (
                  <button
                    type="button"
                    onClick={() => setWrapLines((prev) => !prev)}
                    className={"px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors " + (wrapLines ? "bg-sky-500/15 text-sky-400 border border-sky-500/40 font-medium" : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent")}
                    title={t('editor.wordWrap')}
                  >
                    <WrapText className="w-3 h-3" />
                    <span>{t('editor.wordWrap')}</span>
                  </button>
                )}

                {request.bodyType === 'json' && (
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    title={t('editor.formatJson')}
                    className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> {t('editor.formatJson')}
                  </button>
                )}
              </div>
            </div>

            {/* Body Form or Editor */}
            {request.bodyType === 'none' && (
              <div className="text-center py-12 text-xs text-slate-500">
                {t('editor.bodyNone')}
              </div>
            )}

            {(request.bodyType === 'json' || request.bodyType === 'raw') && (
              <div className="flex-1 min-h-[240px] flex flex-col">
                <CodeEditor
                  value={request.bodyRaw || ''}
                  onChange={(val) => onChange({ bodyRaw: val })}
                  wrap={wrapLines}
                  placeholder={request.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw text content...'}
                />
              </div>
            )}

            {request.bodyType === 'x-www-form-urlencoded' && (
              <KeyValueEditor
                items={request.bodyUrlEncoded || []}
                onChange={(bodyUrlEncoded) => onChange({ bodyUrlEncoded })}
                placeholderKey="key"
                placeholderValue="value"
              />
            )}

            {request.bodyType === 'form-data' && (
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {(request.bodyFormData || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={item.enabled} onChange={(e) => {
                      const next = [...(request.bodyFormData || [])]; next[index] = { ...item, enabled: e.target.checked }; onChange({ bodyFormData: next })
                    }} />
                    <input value={item.key} onChange={(e) => { const next = [...(request.bodyFormData || [])]; next[index] = { ...item, key: e.target.value }; onChange({ bodyFormData: next }) }} placeholder="field" className="w-1/3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" />
                    <select value={item.type || 'text'} onChange={(e) => { const next = [...(request.bodyFormData || [])]; next[index] = { ...item, type: e.target.value as 'text' | 'file' }; onChange({ bodyFormData: next }) }} className="bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-slate-200">
                      <option value="text">Text</option><option value="file">File</option>
                    </select>
                    {item.type === 'file' ? <button type="button" onClick={async () => { const result = await window.electronAPI?.openFileDialog({ filters: [{ name: 'All Files', extensions: ['*'] }] }); if (result?.success) { const next = [...(request.bodyFormData || [])]; next[index] = { ...item, filePath: result.filePath, value: result.filePath || '' }; onChange({ bodyFormData: next }) } }} className="flex-1 truncate text-left bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400"><FileUp className="w-3 h-3 inline mr-1" />{item.filePath || 'Choose file'}</button> : <input value={item.value} onChange={(e) => { const next = [...(request.bodyFormData || [])]; next[index] = { ...item, value: e.target.value }; onChange({ bodyFormData: next }) }} placeholder="value" className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" />}
                    <button type="button" onClick={() => onChange({ bodyFormData: (request.bodyFormData || []).filter((_, i) => i !== index) })} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => onChange({ bodyFormData: [...(request.bodyFormData || []), { key: '', value: '', enabled: true, type: 'text' }] })} className="self-start flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"><Plus className="w-3 h-3" />Add field</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="p-3 flex flex-col gap-3 text-xs max-w-xl">
            <div className="flex items-center gap-2 text-slate-400"><KeyRound className="w-4 h-4 text-sky-400" />Request authentication</div>
            <select value={request.auth?.type || 'none'} onChange={(e) => onChange({ auth: { ...(request.auth || {}), type: e.target.value as any } })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200">
              <option value="none">No Auth</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option><option value="api-key">API Key</option><option value="oauth2">OAuth 2.0</option>
            </select>
            {request.auth?.type === 'bearer' && <input value={request.auth.token || ''} onChange={(e) => onChange({ auth: { ...request.auth!, token: e.target.value } })} placeholder="Token or {{token}}" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" />}
            {request.auth?.type === 'basic' && <div className="grid grid-cols-2 gap-2"><input value={request.auth.username || ''} onChange={(e) => onChange({ auth: { ...request.auth!, username: e.target.value } })} placeholder="Username" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><input type="password" value={request.auth.password || ''} onChange={(e) => onChange({ auth: { ...request.auth!, password: e.target.value } })} placeholder="Password" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /></div>}
            {request.auth?.type === 'api-key' && <div className="grid grid-cols-2 gap-2"><input value={request.auth.key || ''} onChange={(e) => onChange({ auth: { ...request.auth!, key: e.target.value } })} placeholder="Header / query key" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><input value={request.auth.value || ''} onChange={(e) => onChange({ auth: { ...request.auth!, value: e.target.value } })} placeholder="Value or {{apiKey}}" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><select value={request.auth.in || 'header'} onChange={(e) => onChange({ auth: { ...request.auth!, in: e.target.value as any } })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200"><option value="header">Header</option><option value="query">Query</option></select></div>}
            {request.auth?.type === 'oauth2' && <div className="flex flex-col gap-2"><select value={request.auth.grantType || 'client_credentials'} onChange={(e) => onChange({ auth: { ...request.auth!, grantType: e.target.value as any } })} className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200"><option value="client_credentials">Client Credentials</option><option value="password">Password Grant</option></select><input value={request.auth.tokenUrl || ''} onChange={(e) => onChange({ auth: { ...request.auth!, tokenUrl: e.target.value } })} placeholder="Token URL" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><div className="grid grid-cols-2 gap-2"><input value={request.auth.clientId || ''} onChange={(e) => onChange({ auth: { ...request.auth!, clientId: e.target.value } })} placeholder="Client ID" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><input type="password" value={request.auth.clientSecret || ''} onChange={(e) => onChange({ auth: { ...request.auth!, clientSecret: e.target.value } })} placeholder="Client Secret" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /></div>{request.auth.grantType === 'password' && <div className="grid grid-cols-2 gap-2"><input value={request.auth.username || ''} onChange={(e) => onChange({ auth: { ...request.auth!, username: e.target.value } })} placeholder="Username" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><input type="password" value={request.auth.password || ''} onChange={(e) => onChange({ auth: { ...request.auth!, password: e.target.value } })} placeholder="Password" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /></div>}<input value={request.auth.scope || ''} onChange={(e) => onChange({ auth: { ...request.auth!, scope: e.target.value } })} placeholder="Scope (optional)" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><input value={request.auth.accessToken || ''} onChange={(e) => onChange({ auth: { ...request.auth!, accessToken: e.target.value } })} placeholder="Existing access token (optional)" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" /><div className="text-[11px] text-slate-500">发送请求前会自动换取 access_token。</div></div>}
          </div>
        )}

        {activeTab === 'extract' && (
          <div className="p-3 flex flex-col gap-2 text-xs">
            <div className="text-slate-400">将响应中的值写入当前环境，供后续请求使用。</div>
            {(request.responseExtractions || []).map((rule, index) => (
              <div key={index} className="grid grid-cols-[1fr_90px_1.5fr_auto] gap-1.5 items-center">
                <input value={rule.variable} onChange={(e) => { const next = [...(request.responseExtractions || [])]; next[index] = { ...rule, variable: e.target.value }; onChange({ responseExtractions: next }) }} placeholder="变量名" className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" />
                <select value={rule.source} onChange={(e) => { const next = [...(request.responseExtractions || [])]; next[index] = { ...rule, source: e.target.value as any }; onChange({ responseExtractions: next }) }} className="bg-slate-800 border border-slate-700 rounded px-1 py-1.5 text-slate-200"><option value="json">JSON</option><option value="header">Header</option></select>
                <input value={rule.path} onChange={(e) => { const next = [...(request.responseExtractions || [])]; next[index] = { ...rule, path: e.target.value }; onChange({ responseExtractions: next }) }} placeholder={rule.source === 'json' ? 'data.token' : 'set-cookie'} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200" />
                <button type="button" onClick={() => onChange({ responseExtractions: (request.responseExtractions || []).filter((_, i) => i !== index) })} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button type="button" onClick={() => onChange({ responseExtractions: [...(request.responseExtractions || []), { variable: '', source: 'json', path: '' }] })} className="self-start flex items-center gap-1 text-sky-400 hover:text-sky-300"><Plus className="w-3 h-3" />Add extraction</button>
          </div>
        )}

        {activeTab === 'preRequest' && (
          <div className="flex-1 h-full min-h-[300px]">
            <ScriptEditor
              value={request.preRequestScript || ''}
              onChange={(val) => onChange({ preRequestScript: val })}
              mode="pre-request"
              placeholder="// Write JavaScript to execute before sending request..."
            />
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="flex-1 h-full min-h-[300px]">
            <ScriptEditor
              value={request.testScript || ''}
              onChange={(val) => onChange({ testScript: val })}
              mode="test"
              placeholder="// Write JavaScript assertions to test response..."
            />
          </div>
        )}
      </div>
    </div>
  )
}
