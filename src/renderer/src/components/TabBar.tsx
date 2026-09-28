import React, { useState, useEffect, useRef } from 'react'
import { Plus, X, Layers, Pin, PinOff, Check } from 'lucide-react'
import { WorkspaceTab, HttpMethod, TabColor } from '../types'
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
  onTogglePinTab?: (tabId: string) => void
  onSetTabColor?: (tabId: string, color?: TabColor) => void
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

const tabColorBorder: Record<TabColor, string> = {
  red: 'border-t-2 border-t-rose-500',
  orange: 'border-t-2 border-t-orange-500',
  amber: 'border-t-2 border-t-amber-500',
  emerald: 'border-t-2 border-t-emerald-500',
  sky: 'border-t-2 border-t-sky-500',
  purple: 'border-t-2 border-t-purple-500',
  rose: 'border-t-2 border-t-pink-500'
}

const tabColorDot: Record<TabColor, string> = {
  red: 'bg-rose-500 shadow-rose-500/50',
  orange: 'bg-orange-500 shadow-orange-500/50',
  amber: 'bg-amber-500 shadow-amber-500/50',
  emerald: 'bg-emerald-500 shadow-emerald-500/50',
  sky: 'bg-sky-500 shadow-sky-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50',
  rose: 'bg-pink-500 shadow-pink-500/50'
}

const colorList: Array<{ key: TabColor; nameKey: string; class: string }> = [
  { key: 'red', nameKey: 'colorRed', class: 'bg-rose-500' },
  { key: 'orange', nameKey: 'colorOrange', class: 'bg-orange-500' },
  { key: 'amber', nameKey: 'colorAmber', class: 'bg-amber-500' },
  { key: 'emerald', nameKey: 'colorEmerald', class: 'bg-emerald-500' },
  { key: 'sky', nameKey: 'colorSky', class: 'bg-sky-500' },
  { key: 'purple', nameKey: 'colorPurple', class: 'bg-purple-500' },
  { key: 'rose', nameKey: 'colorRose', class: 'bg-pink-500' }
]

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
  onTogglePinTab,
  onSetTabColor,
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
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const activeBorder = tab.color
            ? tabColorBorder[tab.color]
            : isActive
              ? 'border-t-2 border-t-sky-500'
              : 'border-t-2 border-t-transparent'

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
              className={`group flex items-center gap-1.5 px-2.5 h-full border-r border-slate-800/80 cursor-pointer transition-colors ${
                tab.isPinned ? 'min-w-[70px] max-w-[150px]' : 'min-w-[110px] max-w-[200px]'
              } ${activeBorder} ${
                isActive
                  ? 'bg-slate-900 text-slate-100 font-semibold shadow-sm'
                  : 'bg-slate-950/60 hover:bg-slate-900/50 text-slate-400 hover:text-slate-200'
              }`}
              title={`${tab.isPinned ? `[${t('tabs.pinTab')}] ` : ''}${tab.method} ${tab.name}`}
            >
              {/* Pin indicator */}
              {tab.isPinned && (
                <Pin className="w-3 h-3 text-sky-400 shrink-0 transform -rotate-45" />
              )}

              {/* Method badge */}
              <span className={`text-[10px] font-mono font-bold shrink-0 ${methodColor[tab.method] || 'text-slate-400'}`}>
                {tab.method}
              </span>

              {/* Tab Color Dot indicator */}
              {tab.color && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tabColorDot[tab.color]}`} />
              )}

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
                    title={t('tabs.closeTab')}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden" />
                    <X className="w-3 h-3 hidden group-hover:block text-slate-400 hover:text-rose-400" />
                  </div>
                ) : tab.isPinned ? (
                  /* Pinned tabs don't show close button by default */
                  null
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
        const targetTab = tabs.find((t) => t.id === contextMenu.tabId)
        const currentTabIndex = tabs.findIndex((t) => t.id === contextMenu.tabId)
        const hasTabsToLeft = currentTabIndex > 0
        const hasTabsToRight = currentTabIndex !== -1 && currentTabIndex < tabs.length - 1
        const hasOtherTabs = tabs.length > 1

        return (
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 bg-slate-900 border border-slate-700/80 rounded-lg shadow-2xl p-1 w-48 text-xs text-slate-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-75"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pin / Unpin */}
            {onTogglePinTab && (
              <button
                type="button"
                onClick={() => {
                  onTogglePinTab(contextMenu.tabId)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  {targetTab?.isPinned ? (
                    <PinOff className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{targetTab?.isPinned ? t('tabs.unpinTab') : t('tabs.pinTab')}</span>
                </span>
              </button>
            )}

            {/* Tab Colors */}
            {onSetTabColor && (
              <div className="px-2.5 py-1.5 flex flex-col gap-1.5 border-t border-slate-800/80 my-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t('tabs.tabColor')}</span>
                  {targetTab?.color && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetTabColor(contextMenu.tabId, undefined)
                        setContextMenu(null)
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {t('tabs.clearColor')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {colorList.map((c) => {
                    const isSelected = targetTab?.color === c.key
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          onSetTabColor(contextMenu.tabId, isSelected ? undefined : c.key)
                          setContextMenu(null)
                        }}
                        className={`w-4 h-4 rounded-full ${c.class} flex items-center justify-center hover:scale-110 transition-transform cursor-pointer relative shadow-sm`}
                        title={t(`tabs.${c.nameKey}` as any)}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="h-px bg-slate-800 my-0.5" />

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
