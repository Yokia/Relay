import React, { useState } from 'react'
import { KeyValueEditor } from './KeyValueEditor'
import { CodeEditor } from './CodeEditor'
import { ScriptEditor } from './ScriptEditor'
import { RequestItem } from '../types'
import { Sparkles, WrapText, ChevronDown } from 'lucide-react'
import { stripJsonComments } from '../utils/jsonUtils'
import { useI18n } from '../i18n'

interface Props {
  request: RequestItem
  onChange: (updates: Partial<RequestItem>) => void
}

type TabType = 'params' | 'headers' | 'body' | 'preRequest' | 'tests'

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
      <div className="flex items-center gap-4 px-3 border-b border-slate-800 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('params')}
          className={"py-2.5 relative transition-colors " + (activeTab === 'params' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
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
          className={"py-2.5 relative transition-colors " + (activeTab === 'headers' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
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
          className={"py-2.5 relative transition-colors " + (activeTab === 'body' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
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
          className={"py-2.5 relative transition-colors " + (activeTab === 'preRequest' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
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
          className={"py-2.5 relative transition-colors " + (activeTab === 'tests' ? "text-sky-400 font-semibold" : "hover:text-slate-200")}
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