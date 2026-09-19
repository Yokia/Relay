import React, { useState, useEffect, useRef } from 'react'
import { Search, Folder, X, CornerDownLeft, ArrowDown, ArrowUp } from 'lucide-react'
import { CollectionItem, RequestItem, HttpMethod } from '../types'
import { useI18n } from '../i18n'

interface FlattenedRequest {
  request: RequestItem
  colId: string
  folderPath: string
}

interface Props {
  isOpen: boolean
  collections: CollectionItem[]
  onClose: () => void
  onSelectRequest: (req: RequestItem) => void
}

const methodColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10',
  POST: 'text-amber-500 dark:text-amber-400 bg-amber-500/10',
  PUT: 'text-blue-500 dark:text-blue-400 bg-blue-500/10',
  DELETE: 'text-rose-500 dark:text-rose-400 bg-rose-500/10',
  PATCH: 'text-purple-500 dark:text-purple-400 bg-purple-500/10',
  HEAD: 'text-cyan-500 dark:text-cyan-400 bg-cyan-500/10',
  OPTIONS: 'text-slate-500 dark:text-slate-400 bg-slate-500/10'
}

function extractAllRequests(cols: CollectionItem[], prefix = ''): FlattenedRequest[] {
  let list: FlattenedRequest[] = []
  for (const c of cols) {
    const currentPath = prefix ? `${prefix} / ${c.name}` : c.name
    for (const req of c.requests || []) {
      list.push({
        request: req,
        colId: c.id,
        folderPath: currentPath
      })
    }
    if (c.children && c.children.length > 0) {
      list = list.concat(extractAllRequests(c.children, currentPath))
    }
  }
  return list
}

export const CommandPaletteModal: React.FC<Props> = ({
  isOpen,
  collections,
  onClose,
  onSelectRequest
}) => {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allRequests = React.useMemo(() => extractAllRequests(collections), [collections])

  const filteredRequests = React.useMemo(() => {
    if (!query.trim()) return allRequests.slice(0, 30)
    const lower = query.toLowerCase()
    return allRequests
      .filter((item) => {
        return (
          item.request.name.toLowerCase().includes(lower) ||
          item.request.url.toLowerCase().includes(lower) ||
          item.request.method.toLowerCase().includes(lower) ||
          item.folderPath.toLowerCase().includes(lower)
        )
      })
      .slice(0, 40)
  }, [allRequests, query])

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Auto scroll selected item
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
    if (el) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (filteredRequests.length === 0 ? 0 : (prev + 1) % filteredRequests.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        filteredRequests.length === 0 ? 0 : (prev - 1 + filteredRequests.length) % filteredRequests.length
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filteredRequests[selectedIndex]
      if (target) {
        onSelectRequest(target.request)
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/90 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] text-slate-200 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 border-b border-slate-800 bg-slate-950/60 gap-2.5">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 min-h-[160px] max-h-[420px] flex flex-col gap-0.5">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
              <span>{t('commandPalette.noResults')}</span>
            </div>
          ) : (
            filteredRequests.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.request.id}
                  data-index={idx}
                  onClick={() => {
                    onSelectRequest(item.request)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/40 text-slate-100'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 shrink-0 ${
                        methodColor[item.request.method] || 'text-slate-400'
                      }`}
                    >
                      {item.request.method}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium truncate text-slate-200">
                        {item.request.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                        {item.request.url || 'untitled url'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded max-w-[180px] truncate">
                      <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{item.folderPath}</span>
                    </div>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer tip */}
        <div className="px-3.5 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-slate-800 rounded border border-slate-700 text-[10px]">↑</kbd>
              <kbd className="px-1 bg-slate-800 rounded border border-slate-700 text-[10px]">↓</kbd>
              {t('commandPalette.navigateTip')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-slate-800 rounded border border-slate-700 text-[10px]">↵</kbd>
              {t('commandPalette.selectTip')}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 bg-slate-800 rounded border border-slate-700 text-[10px]">Esc</kbd>
            {t('commandPalette.closeTip')}
          </span>
        </div>
      </div>
    </div>
  )
}
