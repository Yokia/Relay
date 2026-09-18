import React, { useState, useRef, useEffect } from 'react'
import { Send, Save, Code, Braces, Globe, Copy, Check, Zap } from 'lucide-react'
import { HttpMethod, RequestItem, ConstantItem } from '../types'
import { ConstantsBar } from './ConstantsBar'

interface Props {
  request: RequestItem
  onChange: (updates: Partial<RequestItem>) => void
  onSend: () => void
  onSave: () => void
  onExportCurl: () => void
  isLoading: boolean
  constants: ConstantItem[]
  onSwitchConstant?: (name: string, value: string) => void
  onRequestSwitchConstant: (name: string, value: string | null) => void
  onOpenManageConstants: () => void
  isDirty?: boolean
  autoSave: boolean
  onToggleAutoSave: () => void
  resolvedUrl?: string
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 font-bold',
  POST: 'text-amber-400 font-bold',
  PUT: 'text-blue-400 font-bold',
  DELETE: 'text-rose-400 font-bold',
  PATCH: 'text-purple-400 font-bold',
  HEAD: 'text-cyan-400 font-bold',
  OPTIONS: 'text-slate-400 font-bold'
}

export const RequestHeader: React.FC<Props> = ({
  request,
  onChange,
  onSend,
  onSave,
  onExportCurl,
  isLoading,
  constants,
  onSwitchConstant,
  onRequestSwitchConstant,
  onOpenManageConstants,
  isDirty = false,
  autoSave,
  onToggleAutoSave,
  resolvedUrl: passedResolvedUrl
}) => {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  const [showVarPicker, setShowVarPicker] = useState(false)
  const [copiedPreview, setCopiedPreview] = useState(false)
  const varPickerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (varPickerRef.current && !varPickerRef.current.contains(e.target as Node)) {
        setShowVarPicker(false)
      }
    }
    if (showVarPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVarPicker])

  const cursorPositionRef = useRef<number>(0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSend()
    }
  }

  const handleInsertConstant = (name: string) => {
    const tag = '{{' + name + '}}'
    const currentVal = request.url || ''
    const input = urlInputRef.current
    
    // Get cursor position: use input selection if available, or fall back to last tracked position
    const pos = (input && typeof input.selectionStart === 'number' && input.selectionStart >= 0)
      ? input.selectionStart
      : (cursorPositionRef.current ?? currentVal.length)

    const newVal = currentVal.slice(0, pos) + tag + currentVal.slice(pos)
    onChange({ url: newVal })
    setShowVarPicker(false)

    // Position cursor right after the newly inserted tag
    const nextCursorPos = pos + tag.length
    cursorPositionRef.current = nextCursorPos
    setTimeout(() => {
      if (urlInputRef.current) {
        urlInputRef.current.focus()
        urlInputRef.current.setSelectionRange(nextCursorPos, nextCursorPos)
      }
    }, 40)
  }

  // Compute resolved preview URL respecting request-level constant overrides
  const overrides = request.constantOverrides || {}
  let resolvedUrl = passedResolvedUrl || request.url || ''
  if (!passedResolvedUrl) {
    for (const c of constants) {
      if (c.name) {
        const effectiveVal = overrides[c.name] !== undefined ? overrides[c.name] : c.currentValue
        if (effectiveVal) {
          resolvedUrl = resolvedUrl.replaceAll('{{' + c.name + '}}', effectiveVal)
        }
      }
    }
  }

  const handleCopyPreview = () => {
    if (!resolvedUrl) return
    navigator.clipboard.writeText(resolvedUrl)
    setCopiedPreview(true)
    setTimeout(() => setCopiedPreview(false), 1500)
  }

  return (
    <div className="p-3 border-b border-slate-800 flex flex-col gap-2.5 bg-slate-900/40">
      {/* Top Request Name & Control Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={request.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Request Name"
            className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none focus:border-b border-sky-500 px-1 py-0.5 w-64 truncate"
          />
          {isDirty && !autoSave && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Auto-save Toggle */}
          <button
            type="button"
            onClick={onToggleAutoSave}
            className={"flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors " +
              (autoSave
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300")
            }
            title="Click to toggle Auto Save"
          >
            <Zap className={"w-3 h-3 " + (autoSave ? "text-emerald-400" : "text-slate-500")} />
            <span>Auto Save: {autoSave ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onExportCurl}
            title="Export cURL"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>cURL</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            title="Save Request (Ctrl+S)"
            className={"flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors active:scale-95 " +
              (isDirty && !autoSave
                ? "bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-sm ring-1 ring-sky-400/50"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white")
            }
          >
            <Save className="w-3.5 h-3.5" />
            <span>{autoSave ? 'Saved' : isDirty ? 'Save*' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* 1. Main Address Row */}
      <div className="flex items-center gap-2">
        {/* Method Select */}
        <div className="relative">
          <select
            value={request.method}
            onChange={(e) => onChange({ method: e.target.value as HttpMethod })}
            className={"bg-slate-900 border border-slate-700/70 rounded px-3 py-1.5 text-xs font-mono focus:outline-none cursor-pointer " + methodColors[request.method]}
          >
            {methods.map((m) => (
              <option key={m} value={m} className={methodColors[m]}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* URL Input Box */}
        <div className="flex-1 relative flex items-center">
          <input
            ref={urlInputRef}
            type="text"
            value={request.url}
            onChange={(e) => onChange({ url: e.target.value })}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              cursorPositionRef.current = e.currentTarget.selectionStart || 0
            }}
            onClick={(e) => {
              cursorPositionRef.current = e.currentTarget.selectionStart || 0
            }}
            onKeyUp={(e) => {
              cursorPositionRef.current = e.currentTarget.selectionStart || 0
            }}
            placeholder="Enter URL (e.g. {{server}}:{{port}}/api/users)"
            className="w-full bg-slate-900 border border-slate-700/70 rounded px-3 py-1.5 pr-9 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {/* Insert Variable Quick Button */}
          <div className="absolute right-1.5" ref={varPickerRef}>
            <button
              type="button"
              onClick={() => setShowVarPicker(!showVarPicker)}
              title="Insert constant into URL"
              className="p-1 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
            >
              <Braces className="w-3.5 h-3.5" />
            </button>

            {showVarPicker && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 z-50 flex flex-col gap-0.5 text-xs select-none">
                <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-800 mb-1">
                  <span>Insert Constant</span>
                  <button onClick={onOpenManageConstants} className="text-sky-400 hover:underline capitalize text-[10px]">
                    Edit
                  </button>
                </div>
                {constants.length === 0 ? (
                  <div className="px-2 py-2 text-slate-500 text-[11px] italic">
                    No constants defined.<br />Click 'Edit' above to add one.
                  </div>
                ) : (
                  constants.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleInsertConstant(c.name)}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-left transition-colors text-slate-300 hover:text-white"
                    >
                      <span className="font-mono text-sky-400">{'{{' + c.name + '}}'}</span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[120px] font-mono">{c.currentValue}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isLoading || !request.url.trim()}
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded transition-all shadow-sm active:scale-95"
        >
          <Send className={"w-3.5 h-3.5 " + (isLoading ? "animate-pulse" : "")} />
          <span>{isLoading ? 'Sending...' : 'Send'}</span>
        </button>
      </div>

      {/* 2. Direct Preview Row: Right below the address bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs font-mono select-text">
        <div className="flex items-center gap-2 truncate flex-1 mr-2">
          <div className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-500 shrink-0 select-none">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Preview:</span>
          </div>
          <span className={"truncate " + (resolvedUrl ? "text-emerald-400 font-semibold" : "text-slate-600 italic font-sans")}>
            {resolvedUrl || '(Enter URL above to preview full request address)'}
          </span>
        </div>

        {resolvedUrl && (
          <button
            type="button"
            onClick={handleCopyPreview}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors shrink-0 select-none"
            title="Copy resolved URL"
          >
            {copiedPreview ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Constants Switcher Bar */}
      <ConstantsBar
        constants={constants}
        url={request.url}
        constantOverrides={request.constantOverrides}
        onRequestSwitchConstant={onRequestSwitchConstant}
        onOpenManageModal={onOpenManageConstants}
      />
    </div>
  )
}