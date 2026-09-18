import React, { useState } from 'react'
import { KeyValueEditor } from './KeyValueEditor'
import { CodeEditor } from './CodeEditor'
import { RequestItem } from '../types'
import { Sparkles } from 'lucide-react'

interface Props {
  request: RequestItem
  onChange: (updates: Partial<RequestItem>) => void
}

type TabType = 'params' | 'headers' | 'body'

export const RequestEditor: React.FC<Props> = ({ request, onChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('params')

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(request.bodyRaw)
      onChange({ bodyRaw: JSON.stringify(parsed, null, 2) })
    } catch (e) {
      alert('Invalid JSON content. Please check syntax.')
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
          <span>Params</span>
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
          <span>Headers</span>
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
          <span>Body</span>
          {request.bodyType !== 'none' && (
            <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-sky-400 rounded-full align-middle" />
          )}
          {activeTab === 'body' && (
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
            placeholderKey="Parameter"
            placeholderValue="Value"
          />
        )}

        {activeTab === 'headers' && (
          <KeyValueEditor
            items={request.headers || []}
            onChange={(headers) => onChange({ headers })}
            placeholderKey="Header"
            placeholderValue="Value"
          />
        )}

        {activeTab === 'body' && (
          <div className="flex flex-col h-full p-2">
            {/* Body Type Radio Selector */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                {(['none', 'json', 'x-www-form-urlencoded', 'raw'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                    <input
                      type="radio"
                      name="bodyType"
                      checked={request.bodyType === type}
                      onChange={() => onChange({ bodyType: type })}
                      className="accent-sky-500 w-3 h-3"
                    />
                    <span className="capitalize">{type === 'none' ? 'none' : type}</span>
                  </label>
                ))}
              </div>

              {request.bodyType === 'json' && (
                <button
                  type="button"
                  onClick={handleFormatJson}
                  title="Format JSON"
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Format
                </button>
              )}
            </div>

            {/* Body Form or Editor */}
            {request.bodyType === 'none' && (
              <div className="text-center py-12 text-xs text-slate-500">
                This request does not have a body.
              </div>
            )}

            {(request.bodyType === 'json' || request.bodyType === 'raw') && (
              <div className="flex-1 min-h-[240px] flex flex-col">
                <CodeEditor
                  value={request.bodyRaw || ''}
                  onChange={(val) => onChange({ bodyRaw: val })}
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
      </div>
    </div>
  )
}