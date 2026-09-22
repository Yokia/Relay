import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Send,
  Save,
  Code,
  Braces,
  Globe,
  Copy,
  Check,
  Zap,
  AlertTriangle,
  ChevronDown,
  X,
  Pencil,
  Plus,
  Search,
  History
} from 'lucide-react'
import { HttpMethod, RequestItem, ConstantItem } from '../types'
import { useI18n } from '../i18n'

interface Props {
  request: RequestItem
  onChange: (updates: Partial<RequestItem>) => void
  onSend: () => void
  onSave: () => void
  onExportCurl?: () => void
  onOpenCodeSnippet?: () => void
  isLoading: boolean
  constants: ConstantItem[]
  onSwitchConstant?: (name: string, value: string) => void
  onRequestSwitchConstant: (name: string, value: string | null) => void
  onOpenManageConstants: () => void
  isDirty?: boolean
  autoSave: boolean
  onToggleAutoSave?: () => void
  resolvedUrl?: string
  onOpenCommandPalette?: () => void
  onOpenHistoryWindow?: () => void
  historyCount?: number
  collectionPath?: string
}

interface UrlSegment {
  type: 'text' | 'constant'
  value: string
  raw: string
  start: number
  end: number
}

interface ActivePill {
  name: string
  raw: string
  start: number
  end: number
  isValid: boolean
  rect: DOMRect
}

interface AutocompleteState {
  triggerIndex: number
  query: string
  cursorPos: number
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

function parseUrlSegments(url: string): UrlSegment[] {
  const segments: UrlSegment[] = []
  if (!url) return segments

  const regex = /\{\{([^}]+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(url)) !== null) {
    if (match.index > lastIndex) {
      const text = url.slice(lastIndex, match.index)
      segments.push({
        type: 'text',
        value: text,
        raw: text,
        start: lastIndex,
        end: match.index
      })
    }
    segments.push({
      type: 'constant',
      value: match[1].trim(),
      raw: match[0],
      start: match.index,
      end: regex.lastIndex
    })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < url.length) {
    const text = url.slice(lastIndex)
    segments.push({
      type: 'text',
      value: text,
      raw: text,
      start: lastIndex,
      end: url.length
    })
  }

  return segments
}

export const RequestHeader: React.FC<Props> = ({
  request,
  onChange,
  onSend,
  onSave,
  onExportCurl,
  onOpenCodeSnippet,
  isLoading,
  constants,
  onRequestSwitchConstant,
  onOpenManageConstants,
  isDirty = false,
  autoSave,
  onToggleAutoSave,
  resolvedUrl: passedResolvedUrl,
  onOpenCommandPalette,
  onOpenHistoryWindow,
  historyCount,
  collectionPath
}) => {
  const { t } = useI18n()
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  const [showVarPicker, setShowVarPicker] = useState(false)
  const [copiedPreview, setCopiedPreview] = useState(false)
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [activePill, setActivePill] = useState<ActivePill | null>(null)
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState | null>(null)
  const [selectedAutoIndex, setSelectedAutoIndex] = useState<number>(0)

  const varPickerRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const urlBarContainerRef = useRef<HTMLDivElement>(null)
  const autoListRef = useRef<HTMLDivElement>(null)
  const activePillCardRef = useRef<HTMLDivElement>(null)
  const cursorPositionRef = useRef<number>(0)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Listen clicks outside for var picker
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

  // Close active pill on window resize (ignore scroll events originating inside the active pill popover)
  useEffect(() => {
    const handleResize = () => setActivePill(null)
    const handleScroll = (e: Event) => {
      // If the scroll happened inside the active pill popover card, DO NOT close it!
      if (activePillCardRef.current && activePillCardRef.current.contains(e.target as Node)) {
        return
      }
      setActivePill(null)
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Auto-scroll selected autocomplete item into view
  useEffect(() => {
    if (autocompleteState && autoListRef.current) {
      const activeEl = autoListRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedAutoIndex, autocompleteState])

  // Parse current URL into segments (text & constants)
  const urlSegments = useMemo(() => parseUrlSegments(request.url || ''), [request.url])

  // Filter constants matching the autocomplete query
  const filteredAutoConstants = useMemo(() => {
    if (!autocompleteState) return []
    const q = autocompleteState.query.trim().toLowerCase()
    if (!q) return constants
    return constants.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.currentValue && c.currentValue.toLowerCase().includes(q))
    )
  }, [autocompleteState, constants])

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

  // Switch to raw text editing mode and place cursor
  const startEditingAt = (pos?: number) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsEditingUrl(true)
    const targetPos = typeof pos === 'number' ? pos : (request.url?.length || 0)
    cursorPositionRef.current = targetPos
    setTimeout(() => {
      if (urlInputRef.current) {
        urlInputRef.current.focus()
        urlInputRef.current.setSelectionRange(targetPos, targetPos)
      }
    }, 30)
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as Node | null
    if (urlBarContainerRef.current && relatedTarget && urlBarContainerRef.current.contains(relatedTarget)) {
      return
    }
    blurTimeoutRef.current = setTimeout(() => {
      setIsEditingUrl(false)
      setAutocompleteState(null)
    }, 180)
  }

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }

  // Detect if cursor is preceded by {{ without closing }} and trigger autocomplete
  const updateAutocomplete = (text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos)
    const lastTriggerIndex = textBeforeCursor.lastIndexOf('{{')

    if (lastTriggerIndex === -1) {
      setAutocompleteState(null)
      return
    }

    const queryAfterTrigger = textBeforeCursor.slice(lastTriggerIndex + 2)
    // If there's a closing }} before the cursor, or newline, close autocomplete
    if (queryAfterTrigger.includes('}}') || queryAfterTrigger.includes('\n')) {
      setAutocompleteState(null)
      return
    }

    setAutocompleteState({
      triggerIndex: lastTriggerIndex,
      query: queryAfterTrigger,
      cursorPos
    })
    setSelectedAutoIndex(0)
  }

  // Insert constant tag when user selects from autocomplete list
  const handleSelectAutocomplete = (name: string) => {
    const currentVal = request.url || ''
    const triggerIndex = autocompleteState ? autocompleteState.triggerIndex : currentVal.lastIndexOf('{{')
    const cursorPos = autocompleteState ? autocompleteState.cursorPos : (cursorPositionRef.current ?? currentVal.length)

    const prefix = triggerIndex >= 0 ? currentVal.slice(0, triggerIndex) : currentVal.slice(0, cursorPos)
    let suffix = currentVal.slice(cursorPos)

    // Absorb closing }} if already present immediately after cursor
    if (suffix.startsWith('}}')) {
      suffix = suffix.slice(2)
    } else if (suffix.startsWith('}')) {
      suffix = suffix.slice(1)
    }

    const insertedTag = '{{' + name + '}}'
    const newVal = prefix + insertedTag + suffix
    onChange({ url: newVal })
    setAutocompleteState(null)

    const nextPos = prefix.length + insertedTag.length
    cursorPositionRef.current = nextPos

    setTimeout(() => {
      if (urlInputRef.current) {
        urlInputRef.current.focus()
        urlInputRef.current.setSelectionRange(nextPos, nextPos)
      }
    }, 30)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If autocomplete dropdown is open and has items
    if (autocompleteState && filteredAutoConstants.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedAutoIndex((prev) => (prev + 1) % filteredAutoConstants.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedAutoIndex((prev) => (prev - 1 + filteredAutoConstants.length) % filteredAutoConstants.length)
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.nativeEvent.isComposing) {
        e.preventDefault()
        const selected = filteredAutoConstants[selectedAutoIndex]
        if (selected) {
          handleSelectAutocomplete(selected.name)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setAutocompleteState(null)
        return
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSend()
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      setIsEditingUrl(false)
      setAutocompleteState(null)
    } else if (e.key === 'Escape') {
      setIsEditingUrl(false)
      setAutocompleteState(null)
    }
  }

  // Insert constant tag into current cursor position
  const handleInsertConstant = (name: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    const tag = '{{' + name + '}}'
    const currentVal = request.url || ''
    const input = urlInputRef.current

    const pos = (input && typeof input.selectionStart === 'number' && input.selectionStart >= 0)
      ? input.selectionStart
      : (cursorPositionRef.current ?? currentVal.length)

    const newVal = currentVal.slice(0, pos) + tag + currentVal.slice(pos)
    onChange({ url: newVal })
    setShowVarPicker(false)

    const nextCursorPos = pos + tag.length
    cursorPositionRef.current = nextCursorPos
    if (isEditingUrl) {
      setTimeout(() => {
        if (urlInputRef.current) {
          urlInputRef.current.focus()
          urlInputRef.current.setSelectionRange(nextCursorPos, nextCursorPos)
        }
      }, 40)
    }
  }

  // Remove a specific constant occurrence from URL
  const handleRemoveConstant = (start: number, end: number) => {
    const currentVal = request.url || ''
    const newVal = currentVal.slice(0, start) + currentVal.slice(end)
    onChange({ url: newVal })
    if (activePill) {
      setActivePill(null)
    }
  }

  // Look up constant item for active pill if valid
  const activeConstantItem = activePill && activePill.isValid
    ? constants.find((c) => c.name === activePill.name)
    : undefined

  return (
    <div className="p-3 border-b border-slate-800 flex flex-col gap-2.5 bg-slate-900/40 select-none">
      {/* Top Request Name & Control Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {collectionPath && (
            <span className="text-xs text-slate-500 font-medium truncate max-w-[260px]" title={collectionPath}>
              {collectionPath} /
            </span>
          )}
          <input
            type="text"
            value={request.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t('header.requestNamePlaceholder')}
            className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none focus:border-b border-sky-500 px-1 py-0.5 w-64 truncate"
          />
          {isDirty && !autoSave && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title={t('header.unsavedChanges')} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Global Search (Ctrl+P) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-sky-300 border border-slate-700/80 text-slate-200 transition-colors shadow-sm cursor-pointer group text-xs"
              title={t('shortcuts.quickOpen')}
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors" />
              <span className="text-[11px] font-medium">{t('commandPalette.globalSearch')}</span>
              <kbd className="px-1.5 py-0.2 text-[10px] bg-slate-900/90 text-slate-400 rounded border border-slate-700/80 font-mono">
                Ctrl+P
              </kbd>
            </button>
          )}

          {/* History Request (Opens in dedicated new window) */}
          {onOpenHistoryWindow && (
            <button
              type="button"
              onClick={onOpenHistoryWindow}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-sky-300 border border-slate-700/80 text-slate-200 transition-colors shadow-sm cursor-pointer group text-xs"
              title={t('historyWindow.openInNewWindow')}
            >
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-medium">{t('sidebar.history')}</span>
              {typeof historyCount === 'number' && historyCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-sky-500/20 text-sky-300 rounded-full font-mono font-medium">
                  {historyCount}
                </span>
              )}
            </button>
          )}

          {/* Constants (Opens Constant Manager Modal) */}
          <button
            type="button"
            onClick={onOpenManageConstants}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 hover:text-amber-300 border border-slate-700/80 text-slate-200 transition-colors shadow-sm cursor-pointer group text-xs"
            title={t('header.constantsTip')}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium">{t('sidebar.constants')}</span>
            {constants.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500/20 text-amber-300 rounded-full font-mono font-medium">
                {constants.length}
              </span>
            )}
          </button>

          <span className="text-slate-700">|</span>

          {/* Code Snippets */}
          {onOpenCodeSnippet && (
            <button
              type="button"
              onClick={onOpenCodeSnippet}
              title={t('codeSnippet.title')}
              className="flex items-center gap-1 text-xs text-slate-200 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-2.5 py-1 rounded transition-colors shadow-sm"
            >
              <Code className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('codeSnippet.openBtn')}</span>
            </button>
          )}

          {/* Save Request */}
          <button
            type="button"
            onClick={() => onSave()}
            title={`${t('header.save')} (Ctrl+S)`}
            className={"flex items-center gap-1 text-xs px-3 py-1 rounded transition-colors active:scale-95 shadow-sm " +
              (isDirty && !autoSave
                ? "bg-sky-500 hover:bg-sky-600 text-white font-medium ring-1 ring-sky-400/50"
                : "bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 hover:text-slate-100")
            }
          >
            <Save className="w-3.5 h-3.5" />
            <span>{autoSave ? t('header.save') : isDirty ? `${t('header.save')}*` : t('header.save')}</span>
          </button>
        </div>
      </div>

      {/* 1. Main Address Row */}
      <div className="flex items-center gap-2">
        {/* Method Select */}
        <div className="relative shrink-0">
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

        {/* Address Bar Container (Pills Mode or Raw Input Mode) */}
        <div ref={urlBarContainerRef} className="flex-1 relative flex items-center min-w-0">
          {isEditingUrl ? (
            /* Editing Mode: Standard Input */
            <>
              <input
                ref={urlInputRef}
                type="text"
                value={request.url}
                onChange={(e) => {
                  const val = e.target.value
                  onChange({ url: val })
                  const pos = e.target.selectionStart || 0
                  cursorPositionRef.current = pos
                  updateAutocomplete(val, pos)
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleInputBlur}
                onFocus={handleInputFocus}
                onSelect={(e) => {
                  const pos = e.currentTarget.selectionStart || 0
                  cursorPositionRef.current = pos
                  updateAutocomplete(e.currentTarget.value, pos)
                }}
                onClick={(e) => {
                  const pos = e.currentTarget.selectionStart || 0
                  cursorPositionRef.current = pos
                  updateAutocomplete(e.currentTarget.value, pos)
                }}
                onKeyUp={(e) => {
                  const pos = e.currentTarget.selectionStart || 0
                  cursorPositionRef.current = pos
                  if (!['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
                    updateAutocomplete(e.currentTarget.value, pos)
                  }
                }}
                autoFocus
                placeholder={t('header.urlPlaceholder')}
                className="w-full bg-slate-900 border border-sky-500 rounded px-3 py-1.5 pr-16 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition-colors shadow-inner min-h-[34px]"
              />

              {/* {{ Constant Autocomplete Floating Popup */}
              {autocompleteState && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 top-full mt-1.5 w-96 max-w-[calc(100vw-50px)] bg-slate-900 border border-sky-500/60 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-1 ring-sky-500/20 select-none"
                >
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-800 bg-slate-950 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Braces className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-semibold text-slate-100">{t('header.constantsAutocomplete')}</span>
                      {autocompleteState.query && (
                        <span className="font-mono text-sky-400 bg-sky-500/15 px-1.5 py-0.2 rounded text-[10px]">
                          "{autocompleteState.query}"
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
                      <span>↑↓</span>
                      <span>·</span>
                      <span>Enter</span>
                      <span>·</span>
                      <span>Esc</span>
                    </div>
                  </div>

                  <div ref={autoListRef} className="max-h-56 overflow-y-auto p-1.5 flex flex-col gap-1 scrollbar-thin">
                    {filteredAutoConstants.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5 font-sans">
                        <span>{t('header.noMatchingConstants')} "{autocompleteState.query}"</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAutocompleteState(null)
                            onOpenManageConstants()
                          }}
                          className="text-sky-400 hover:underline text-[11px] flex items-center gap-1 mt-1 font-medium"
                        >
                          <Plus className="w-3 h-3" /> {t('header.addThisConstant')}
                        </button>
                      </div>
                    ) : (
                      filteredAutoConstants.map((c, idx) => {
                        const isSelected = idx === selectedAutoIndex
                        return (
                          <button
                            key={c.id}
                            type="button"
                            data-selected={isSelected ? "true" : "false"}
                            onMouseEnter={() => setSelectedAutoIndex(idx)}
                            onClick={() => handleSelectAutocomplete(c.name)}
                            className={"flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors font-mono text-xs cursor-pointer " +
                              (isSelected
                                ? "bg-sky-500/15 border border-sky-500/50 text-sky-400 font-bold shadow-sm"
                                : "text-slate-200 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent")}
                          >
                            <div className="flex items-center gap-2 truncate flex-1 mr-2">
                              <span className="font-bold text-sky-400 shrink-0">{'{{' + c.name + '}}'}</span>
                              <span className="text-[11px] text-slate-400 truncate font-mono">
                                = {c.currentValue || <span className="italic">--</span>}
                              </span>
                              {c.currentValue && c.optionNotes?.[c.currentValue] && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/80 font-sans truncate shrink-0">
                                  {c.optionNotes[c.currentValue]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-sans">
                              {c.options && c.options.length > 1 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/80">
                                  {c.options.length}
                                </span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 ml-1 shrink-0" />}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  <div className="px-2.5 py-1.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => {
                        setAutocompleteState(null)
                        onOpenManageConstants()
                      }}
                      className="hover:text-sky-400 transition-colors flex items-center gap-1 font-sans"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{t('header.manageConstantsBtn')}</span>
                    </button>
                    <span className="font-sans">({filteredAutoConstants.length})</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Interactive Pills Display Mode */
            <div
              onClick={() => startEditingAt(request.url?.length || 0)}
              className="w-full bg-slate-900 border border-slate-700/70 hover:border-slate-600 rounded px-3 py-1.5 pr-16 text-xs font-mono text-slate-200 transition-colors flex items-center flex-wrap gap-1 min-h-[34px] cursor-text"
              title={t('header.editUrlMode')}
            >
              {!request.url ? (
                <span className="text-slate-500 italic select-none">
                  {t('header.urlPlaceholder')}
                </span>
              ) : (
                urlSegments.map((seg, idx) => {
                  if (seg.type === 'text') {
                    return (
                      <span
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditingAt(seg.start)
                        }}
                        className="text-slate-200 select-text break-all cursor-text hover:text-slate-100"
                      >
                        {seg.value}
                      </span>
                    )
                  }

                  // Constant Segment: Check if valid in constants library
                  const constant = constants.find((c) => c.name === seg.value)
                  const isValid = Boolean(constant)
                  const overrideVal = request.constantOverrides ? request.constantOverrides[seg.value] : undefined
                  const isOverridden = overrideVal !== undefined
                  const effectiveVal = isOverridden ? overrideVal : (constant?.currentValue || '')
                  const note = (effectiveVal && constant?.optionNotes?.[effectiveVal]) || constant?.description

                  if (isValid) {
                    return (
                      <span
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          const rect = e.currentTarget.getBoundingClientRect()
                          setActivePill({
                            name: seg.value,
                            raw: seg.raw,
                            start: seg.start,
                            end: seg.end,
                            isValid: true,
                            rect
                          })
                        }}
                        className={"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all shadow-sm group/pill " +
                          (isOverridden
                            ? "bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-400 ring-1 ring-purple-500/20"
                            : "bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-400 ring-1 ring-sky-500/20")
                        }
                        title={isOverridden ? `{{${seg.value}}} ${note ? note + ' — ' : ''}${t('header.exclusiveValue')}: ${overrideVal}` : `{{${seg.value}}} ${note ? note + ' — ' : ''}${t('header.globalValue')}: ${constant?.currentValue || ''}`}
                      >
                        <span className="font-semibold">{seg.raw}</span>
                        {isOverridden ? (
                          <span className="text-[9px] px-1 py-0.1 rounded bg-purple-500/25 text-purple-400 border border-purple-500/40 font-sans font-medium">
                            {note || t('header.exclusiveValue')}
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.1 rounded bg-sky-500/25 text-sky-400 border border-sky-500/40 font-sans font-medium">
                            {note || t('header.globalValue')}
                          </span>
                        )}
                        <ChevronDown className="w-3 h-3 opacity-60 group-hover/pill:opacity-100 transition-opacity" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveConstant(seg.start, seg.end)
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors ml-0.5"
                          title={`${t('header.removeConstantFromUrl')} {{${seg.value}}}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  }

                  // Undefined Constant: Highlight in RED with warning indicator
                  return (
                    <span
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setActivePill({
                          name: seg.value,
                          raw: seg.raw,
                          start: seg.start,
                          end: seg.end,
                          isValid: false,
                          rect
                        })
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 ring-1 ring-rose-500/20 transition-all shadow-sm group/pill"
                      title={t('header.undefinedConstantWarn', { name: seg.value })}
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="font-semibold underline decoration-rose-500 decoration-wavy">{seg.raw}</span>
                      <span className="text-[9px] px-1 py-0.1 rounded bg-rose-500/25 text-rose-400 border border-rose-500/40 font-sans font-medium">
                        {t('header.undefinedConstant')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveConstant(seg.start, seg.end)
                        }}
                        className="p-0.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors ml-0.5"
                        title={`${t('header.removeConstantFromUrl')} {{${seg.value}}}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })
              )}
            </div>
          )}

          {/* Right Action Icons on Address Bar (Pencil + Variable Picker) */}
          <div className="absolute right-1.5 flex items-center gap-1">
            {/* Direct Edit Mode Toggle Button */}
            {isEditingUrl ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsEditingUrl(false)}
                title={t('common.done')}
                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startEditingAt(request.url?.length || 0)}
                title={t('header.editUrlMode')}
                className="p-1 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Insert Variable Quick Button */}
            <div className="relative" ref={varPickerRef}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowVarPicker(!showVarPicker)}
                title={t('header.insertConstant')}
                className="p-1 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded transition-colors"
              >
                <Braces className="w-3.5 h-3.5" />
              </button>

              {showVarPicker && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 z-50 flex flex-col gap-0.5 text-xs select-none">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-800 mb-1">
                    <span>{t('header.insertConstant')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVarPicker(false)
                        onOpenManageConstants()
                      }}
                      className="text-sky-400 hover:underline capitalize text-[10px]"
                    >
                      {t('header.manageConstantsBtn')}
                    </button>
                  </div>
                  {constants.length === 0 ? (
                    <div className="px-2 py-2 text-slate-500 text-[11px] italic">
                      {t('sidebar.noConstants')}
                    </div>
                  ) : (
                    constants.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleInsertConstant(c.name)}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-left transition-colors text-slate-300 hover:text-slate-100"
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
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => onSend()}
          disabled={isLoading || !request.url?.trim()}
          title={`${t('header.send')} (${typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent) ? '⌘+Enter' : 'Ctrl+Enter'})`}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-1.5 rounded transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className={"w-3.5 h-3.5 " + (isLoading ? "animate-pulse" : "")} />
          <span>{isLoading ? t('header.sending') : t('header.send')}</span>
          <kbd className="px-1.5 py-0.2 text-[10px] bg-sky-600/70 text-sky-100 rounded border border-sky-400/40 font-mono leading-none select-none">
            {typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent) ? '⌘+Enter' : 'Ctrl+Enter'}
          </kbd>
        </button>
      </div>

      {/* 2. Direct Preview Row: Right below the address bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-950/80 border border-slate-800 text-xs font-mono select-text">
        <div className="flex items-center gap-2 truncate flex-1 mr-2">
          <div className="flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 shrink-0 select-none">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('header.preview')}:</span>
          </div>
          <span className={"truncate " + (resolvedUrl ? "text-emerald-400 font-semibold" : "text-slate-400 italic font-sans")}>
            {resolvedUrl || '(Enter URL above to preview full request address)'}
          </span>
        </div>

        {resolvedUrl && (
          <button
            type="button"
            onClick={handleCopyPreview}
            className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 px-1.5 py-0.5 rounded transition-colors shrink-0 select-none"
            title={t('header.copyPreview')}
          >
            {copiedPreview ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">{t('header.copySuccess')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{t('common.copy')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Floating Popover Menu for Active Pill */}
      {activePill && (
        <>
          {/* Backdrop to close popover on outside click */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setActivePill(null)}
          />

          {/* Floating Dropdown Card */}
          <div
            ref={activePillCardRef}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(activePill.rect.bottom + 6, window.innerHeight - 340),
              left: Math.max(12, Math.min(activePill.rect.left, window.innerWidth - 340))
            }}
            className="z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 text-xs text-slate-200 animate-in fade-in duration-100 select-none flex flex-col gap-2.5"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-mono text-sm">
                {activePill.isValid ? (
                  <>
                    <Braces className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-bold text-sky-400">{activePill.raw}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-bold text-rose-400">{activePill.raw}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {activePill.isValid ? (() => {
                  const overrideVal = request.constantOverrides ? request.constantOverrides[activePill.name] : undefined
                  const isOverridden = overrideVal !== undefined
                  const effectiveVal = isOverridden ? overrideVal : (activeConstantItem?.currentValue || '')
                  const note = (effectiveVal && activeConstantItem?.optionNotes?.[effectiveVal]) || activeConstantItem?.description

                  return isOverridden ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40 font-medium">
                      {note || t('header.exclusiveValue')}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-medium">
                      {note || t('header.globalValue')}
                    </span>
                  )
                })() : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold">
                    {t('header.undefinedConstant')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActivePill(null)}
                  className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Valid Constant Body */}
            {activePill.isValid && activeConstantItem ? (() => {
              const overrideVal = request.constantOverrides ? request.constantOverrides[activePill.name] : undefined
              const isOverridden = overrideVal !== undefined
              const effectiveVal = isOverridden ? overrideVal : (activeConstantItem.currentValue || '')

              const rawOptions = activeConstantItem.options && activeConstantItem.options.length > 0
                ? activeConstantItem.options
                : (activeConstantItem.currentValue ? [activeConstantItem.currentValue] : [])

              const allOptions = Array.from(new Set([
                ...rawOptions,
                ...(activeConstantItem.currentValue ? [activeConstantItem.currentValue] : []),
                ...(overrideVal ? [overrideVal] : [])
              ]))

              return (
                <div className="flex flex-col gap-2">
                  {/* Current effective value preview */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {t('header.activeValue')}
                    </span>
                    <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono text-emerald-800 dark:text-emerald-400 text-xs break-all select-text font-bold flex items-center justify-between gap-2">
                      <span>{effectiveVal || <span className="italic text-slate-400">--</span>}</span>
                      {effectiveVal && activeConstantItem.optionNotes?.[effectiveVal] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-sans shrink-0 font-medium">
                          {activeConstantItem.optionNotes[effectiveVal]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Switch Candidate Values */}
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      {t('header.switchCandidateValue')}
                    </span>
                    <div
                      className="max-h-48 overflow-y-auto flex flex-col gap-1 scrollbar-thin pr-1"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {/* Global Default Option */}
                      <button
                        type="button"
                        onClick={() => {
                          onRequestSwitchConstant(activePill.name, null)
                          setActivePill(null)
                        }}
                        className={"flex items-center justify-between px-2 py-1.5 rounded-lg border text-left transition-colors text-xs font-mono " +
                          (!isOverridden
                            ? "bg-sky-500/15 border-sky-500/50 text-sky-400 font-bold shadow-sm"
                            : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-slate-100")
                        }
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>🌐 {t('header.followGlobalDefault')}</span>
                          <span className="text-[10px] text-slate-400 truncate">
                            ({activeConstantItem.currentValue || '--'}{activeConstantItem.currentValue && activeConstantItem.optionNotes?.[activeConstantItem.currentValue] ? ` · ${activeConstantItem.optionNotes[activeConstantItem.currentValue]}` : ''})
                          </span>
                        </div>
                        {!isOverridden && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-1" />}
                      </button>

                      {/* Candidate Options */}
                      {allOptions.map((opt) => {
                        const isSelected = isOverridden && overrideVal === opt
                        const note = activeConstantItem.optionNotes?.[opt]
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              onRequestSwitchConstant(activePill.name, opt)
                              setActivePill(null)
                            }}
                            className={"flex items-center justify-between px-2 py-1.5 rounded-lg border text-left transition-colors text-xs font-mono " +
                              (isSelected
                                ? "bg-purple-500/20 border-purple-500/60 text-purple-400 font-bold shadow-sm"
                                : "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200 hover:text-slate-100")
                            }
                          >
                            <div className="flex items-center gap-1.5 truncate mr-1">
                              <span className="truncate">{opt}</span>
                              {note && (
                                <span className={"text-[10px] px-1.5 py-0.2 rounded font-sans shrink-0 font-normal border " +
                                  (isSelected
                                    ? "bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-500/40 font-medium"
                                    : "bg-slate-800 text-slate-300 border-slate-700/80")
                                }>
                                  {note}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {opt === activeConstantItem.currentValue && (
                                <span className="text-[9px] text-slate-400 font-sans">({t('header.globalValue')})</span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions Divider */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePill(null)
                        onOpenManageConstants()
                      }}
                      className="flex items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors font-medium"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>{t('header.manageConstant')}...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveConstant(activePill.start, activePill.end)}
                      className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-medium"
                    >
                      <X className="w-3 h-3" />
                      <span>{t('header.removeConstantFromUrl')}</span>
                    </button>
                  </div>
                </div>
              )
            })() : (
              /* Invalid Constant Body */
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs leading-relaxed font-medium">
                  {t('header.undefinedConstantWarn', { name: activePill.name })}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePill(null)
                      onOpenManageConstants()
                    }}
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('header.addThisConstant')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveConstant(activePill.start, activePill.end)}
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t('header.removeConstantFromUrl')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
