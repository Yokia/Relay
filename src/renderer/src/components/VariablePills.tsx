import React, { useState, useRef, useEffect } from 'react'
import { Server, Hash, ChevronDown, Check, Plus, Trash2, Globe, Sparkles, X } from 'lucide-react'
import { Environment } from '../types'

interface Props {
  url: string
  environments: Environment[]
  activeEnvId?: string
  onUpdateVariable: (key: string, value: string, addOption?: boolean) => void
  onDeleteOption?: (key: string, optionToDelete: string) => void
}

export const VariablePills: React.FC<Props> = ({
  url,
  environments,
  activeEnvId,
  onUpdateVariable,
  onDeleteOption
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Extract all {{var}} from url
  const regex = /\{\{([^}]+)\}\}/g
  const matches: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(url)) !== null) {
    const trimmed = m[1].trim()
    if (trimmed && !matches.includes(trimmed)) {
      matches.push(trimmed)
    }
  }

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveKey(null)
      }
    }
    if (activeKey) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeKey])

  if (matches.length === 0) {
    return null
  }

  const currentEnv = environments.find((e) => e.id === activeEnvId)

  // Helper to get variable details
  const getVariableDetails = (key: string) => {
    const found = currentEnv?.variables.find((v) => v.key === key)
    const value = found ? found.value : ''
    let options = found?.options || []

    // Add some smart default options if empty
    if (options.length === 0) {
      const lower = key.toLowerCase()
      if (lower.includes('port')) {
        options = ['3000', '8080', '8000', '5000', '9000']
      } else if (lower.includes('server') || lower.includes('host') || lower.includes('url')) {
        options = ['http://localhost', 'http://127.0.0.1', 'https://api.dev.local']
      }
      if (value && !options.includes(value)) {
        options = [value, ...options]
      }
    }
    return { value, options, isSet: Boolean(found && found.value) }
  }

  // Realtime resolved URL preview
  let resolvedUrl = url
  for (const k of matches) {
    const details = getVariableDetails(k)
    resolvedUrl = resolvedUrl.replaceAll('{{' + k + '}}', details.value || '{{' + k + '}}')
  }

  const handleSelectOption = (key: string, val: string) => {
    onUpdateVariable(key, val, false)
    setActiveKey(null)
  }

  const handleAddCustom = (key: string) => {
    if (!customInput.trim()) return
    onUpdateVariable(key, customInput.trim(), true)
    setCustomInput('')
    setActiveKey(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 text-xs relative">
      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 shrink-0">
        <Sparkles className="w-3 h-3 text-sky-400" /> Variables:
      </span>

      {matches.map((k) => {
        const details = getVariableDetails(k)
        const isOpen = activeKey === k
        const isPort = k.toLowerCase().includes('port')

        return (
          <div key={k} className="relative">
            <button
              type="button"
              onClick={() => {
                if (isOpen) {
                  setActiveKey(null)
                } else {
                  setActiveKey(k)
                  setCustomInput(details.value || '')
                }
              }}
              className={"inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono transition-all " +
                (isOpen
                  ? "bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400/50 shadow-sm"
                  : details.isSet
                  ? "bg-slate-800/90 border-slate-700 hover:border-sky-500/60 text-slate-200 hover:text-white"
                  : "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20")
              }
              title={"Click to switch or edit '" + k + "'"}
            >
              {isPort ? (
                <Hash className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Server className="w-3 h-3 text-sky-400 shrink-0" />
              )}
              <span className="font-semibold text-slate-300">{k}:</span>
              <span className={"truncate max-w-[150px] " + (details.isSet ? "text-sky-400 font-bold" : "text-amber-400 italic")}>
                {details.isSet ? details.value : '(not set)'}
              </span>
              <ChevronDown className={"w-3 h-3 text-slate-400 transition-transform " + (isOpen ? "rotate-180" : "")} />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
              <div
                ref={popoverRef}
                className="absolute top-full left-0 mt-1.5 w-72 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl p-2.5 z-50 flex flex-col gap-2.5 select-none text-slate-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                    <span>Switch {isPort ? 'Port' : 'Server'}:</span>
                    <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-200 text-[11px]">{'{{' + k + '}}'}</code>
                  </div>
                  <button onClick={() => setActiveKey(null)} className="text-slate-400 hover:text-slate-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Input current / new value */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustom(k)
                      }
                    }}
                    placeholder={"New value for " + k + "..."}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustom(k)}
                    className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-medium shrink-0"
                    title="Save & Apply"
                  >
                    Apply
                  </button>
                </div>

                {/* Preset List */}
                <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-0.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 px-1">Presets / History</span>
                  {details.options.length === 0 ? (
                    <div className="text-[11px] text-slate-500 px-1 py-1 italic">No presets yet. Type above and click Apply.</div>
                  ) : (
                    details.options.map((opt) => {
                      const isSelected = opt === details.value
                      return (
                        <div
                          key={opt}
                          onClick={() => handleSelectOption(k, opt)}
                          className={"flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs font-mono transition-colors group " +
                            (isSelected
                              ? "bg-sky-500/20 text-sky-300 font-semibold"
                              : "hover:bg-slate-800 text-slate-300 hover:text-white")
                          }
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                            <span className="truncate">{opt}</span>
                          </div>
                          {onDeleteOption && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteOption(k, opt)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5"
                              title="Delete option"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Resolved URL Preview */}
      {resolvedUrl !== url && (
        <div className="ml-auto text-[11px] font-mono text-slate-400 truncate max-w-sm bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded flex items-center gap-1.5" title={"Actual Request URL: " + resolvedUrl}>
          <span className="text-slate-500 font-sans">Preview:</span>
          <span className="text-emerald-400 truncate">{resolvedUrl}</span>
        </div>
      )}
    </div>
  )
}