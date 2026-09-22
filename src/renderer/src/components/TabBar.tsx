import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, Layers } from 'lucide-react'
import { WorkspaceTab, HttpMethod } from '../types'
import { useI18n } from '../i18n'

interface Props {
  tabs: WorkspaceTab[]
  activeTabId: string
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onCloseOtherTabs: (tabId: string) => void
  onCloseTabsToLeft: (tabId: string) => void
  onCloseTabsToRight: (tabId: string) => void
  onCloseAllTabs: () => void
  onNewTab: () => void
  extraRight?: React.ReactNode
}

const methodColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-500 dark:text-emerald-400',
  POST: 'text-amber-500 dark:text-amber-400',
  PUT: 'text-blue-500 dark:text-blue-400',
  DELETE: 'text-rose-500 dark:text-rose-400',
  PATCH: 'text-purple-500 dark:text-purple-400',
  HEAD: 'text-cyan-500 dark:text-cyan-400',
  OPTIONS: 'text-slate-500 dark:text-slate-400'
}

export const TabBar: React.FC<Props> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToLeft,
  onCloseTabsToRight,
  onCloseAllTabs,
  onNewTab,
  extraRight
}) => {
  const { t } = useI18n()
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    tabId: string
  } | null>(null)

  const tabContainerRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!tabContainerRef.current) return
    const activeEl = tabContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  return (
    <div className="h-9 border-b border-slate-800 bg-slate-950 flex items-center select-none text-xs z-10 shrink-0">
      {/* Scrollable Tabs List */}
      <div
        ref={tabContainerRef}
        className="flex-1 flex items-center overflow-x-auto no-scrollbar h-full"
        onWheel={(event) => {
          if (event.deltaY !== 0) {
            event.currentTarget.scrollLeft += event.deltaY
          }
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  tabId: tab.id
                })
              }}
              className={`group flex items-center gap-1.5 px-3 h-full border-r border-slate-800/80 cursor-pointer transition-colors max-w-[200px] min-w-[120px] ${
                isActive
                  ? 'bg-slate-900 border-t-2 border-t-sky-500 text-slate-100 font-semibold shadow-sm'
                  : 'bg-slate-950/60 hover:bg-slate-900/50 text-slate-400 hover:text-slate-200'
              }`}
              title={`${tab.method} ${tab.name}`}
            >
              {/* Method badge */}
              <span className={`text-[10px] font-mono font-bold shrink-0 ${methodColor[tab.method] || 'text-slate-400'}`}>
                {tab.method}
              </span>

              {/* Tab Name */}
              <span className="truncate text-xs flex-1">
                {tab.name || t('tabs.untitledTab')}
              </span>

              {/* Dirty Unsaved Dot or Close Button */}
              <div className="shrink-0 flex items-center justify-center w-4 h-4">
                {tab.isDirty ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden" />
                    <X className="w-3 h-3 hidden group-hover:block text-slate-400 hover:text-rose-400" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                    className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('tabs.closeTab')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* New Tab Button */}
        <button
          type="button"
          onClick={() => onNewTab()}
          title={t('tabs.newTab') + ' (Ctrl+T)'}
          className="p-1.5 mx-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 rounded transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional Extra Right Elements (Theme Switcher / Shortcut kbd) */}
      {extraRight && (
        <div className="flex items-center px-2 shrink-0 border-l border-slate-800 h-full">
          {extraRight}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (() => {
        const currentTabIndex = tabs.findIndex((t) => t.id === contextMenu.tabId)
        const hasTabsToLeft = currentTabIndex > 0
        const hasTabsToRight = currentTabIndex !== -1 && currentTabIndex < tabs.length - 1
        const hasOtherTabs = tabs.length > 1

        return (
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl p-1 w-44 text-xs text-slate-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-75"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onCloseTab(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{t('tabs.closeTab')}</span>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+W</span>
            </button>
            <button
              type="button"
              disabled={!hasOtherTabs}
              onClick={() => {
                onCloseOtherTabs(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded transition-colors cursor-pointer disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed"
            >
              <span>{t('tabs.closeOthers')}</span>
            </button>
            <button
              type="button"
              disabled={!hasTabsToLeft}
              onClick={() => {
                onCloseTabsToLeft(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded transition-colors cursor-pointer disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed"
            >
              <span>{t('tabs.closeToLeft')}</span>
            </button>
            <button
              type="button"
              disabled={!hasTabsToRight}
              onClick={() => {
                onCloseTabsToRight(contextMenu.tabId)
                setContextMenu(null)
              }}
              className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded transition-colors cursor-pointer disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-inherit disabled:cursor-not-allowed"
            >
              <span>{t('tabs.closeToRight')}</span>
            </button>
            <div className="h-px bg-slate-800 my-0.5" />
            <button
              type="button"
              onClick={() => {
                onCloseAllTabs()
                setContextMenu(null)
              }}
              className="px-2.5 py-1.5 text-left hover:bg-rose-500/20 hover:text-rose-400 text-rose-400 rounded transition-colors cursor-pointer"
            >
              <span>{t('tabs.closeAll')}</span>
            </button>
          </div>
        )
      })()}
    </div>
  )
}
