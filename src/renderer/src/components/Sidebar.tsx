import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Folder,
  FileCode2,
  History,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  Terminal,
  Zap,
  Sliders,
  Globe,
  Edit3,
  Copy,
  FolderPlus,
  MoveRight,
  Link,
  Search,
  X,
  ChevronsDownUp,
  ChevronsUpDown,
  MoreHorizontal,
  Check,
  AlertTriangle,
  FolderTree,
  ArrowUpDown,
  FolderDown,
  Play,
  BookOpen,
  Sparkles
} from 'lucide-react'
import { CollectionItem, HistoryItem, Environment, RequestItem, HttpMethod, ConstantItem } from '../types'
import {
  findCollectionInTree,
  countAllRequests,
  countAllSubCollections,
  filterCollectionTree,
  collectAllCollectionIds,
  isDescendant,
  collectAllRequests
} from '../utils/collectionTree'
import { useI18n } from '../i18n'

interface Props {
  width?: number
  collections: CollectionItem[]
  history: HistoryItem[]
  environments: Environment[]
  constants: ConstantItem[]
  activeEnvId?: string
  selectedRequestId?: string
  onSelectRequest: (req: RequestItem) => void
  onNewRequest: () => void
  onCreateCollection: (name: string, id?: string) => void
  onCreateSubCollection: (parentColId: string, name?: string) => void
  onRenameCollection: (colId: string, newName: string) => void
  onDuplicateCollection: (colId: string) => void
  onDeleteCollection: (id: string) => void
  onMoveCollection: (sourceColId: string, targetColId: string | null, position: 'before' | 'after' | 'inside') => void
  onNewRequestInCollection: (colId: string) => void
  onRenameRequest: (colId: string, reqId: string, newName: string) => void
  onDuplicateRequest: (colId: string, reqId: string) => void
  onDeleteRequest: (colId: string, reqId: string) => void
  onMoveRequest: (sourceColId: string, targetColId: string, reqId: string, targetIndex?: number) => void
  onCopyRequestCurl: (req: RequestItem) => void
  onCopyUrl: (url: string) => void
  onClearHistory: () => void
  onOpenEnvModal: () => void
  onOpenCurlModal: () => void
  onOpenConstantModal: () => void
  onSelectEnv: (id: string) => void
  onSwitchConstant: (name: string, value: string) => void
  dirtyIds?: Set<string>
  onOpenSettings: () => void
  onOpenDevToys?: () => void
  onOpenDataTransfer?: (tab?: 'export' | 'import', targetColId?: string, format?: 'json' | 'html' | 'markdown') => void
  onRunCollection?: (col: CollectionItem) => void
  onRunRequests?: (requests: RequestItem[], title: string) => void
}

const methodBadgeColor: Record<HttpMethod, string> = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  DELETE: 'text-rose-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-cyan-400',
  OPTIONS: 'text-slate-400'
}

interface ContextMenuState {
  type: 'collection' | 'request'
  x: number
  y: number
  colId: string
  reqId?: string
  request?: RequestItem
}

interface EditingTarget {
  type: 'collection' | 'request'
  id: string
  name: string
  colId?: string
}

function flattenAllCollections(cols: CollectionItem[], prefix = ''): { id: string; name: string }[] {
  let list: { id: string; name: string }[] = []
  for (const c of cols) {
    const fullName = prefix ? `${prefix} / ${c.name}` : c.name
    list.push({ id: c.id, name: fullName })
    if (c.children && c.children.length > 0) {
      list = list.concat(flattenAllCollections(c.children, fullName))
    }
  }
  return list
}

export const Sidebar: React.FC<Props> = ({
  width,
  collections,
  history,
  environments,
  constants,
  activeEnvId,
  selectedRequestId,
  onSelectRequest,
  onNewRequest,
  onCreateCollection,
  onCreateSubCollection,
  onRenameCollection,
  onDuplicateCollection,
  onDeleteCollection,
  onMoveCollection,
  onNewRequestInCollection,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
  onMoveRequest,
  onCopyRequestCurl,
  onCopyUrl,
  onClearHistory,
  onOpenEnvModal,
  onOpenCurlModal,
  onOpenConstantModal,
  onSelectEnv,
  onSwitchConstant,
  dirtyIds,
  onOpenSettings,
  onOpenDevToys,
  onOpenDataTransfer,
  onRunCollection,
  onRunRequests
}) => {
  const { t } = useI18n()
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-selection state for batch operations
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set())
  const lastSelectedReqIdRef = useRef<string | null>(null)

  // Flat list of requests in tree order for range selection
  const flatRequestList = useMemo(() => {
    let list: RequestItem[] = []
    const traverse = (cols: CollectionItem[]) => {
      for (const c of cols) {
        if (c.requests) list.push(...c.requests)
        if (c.children) traverse(c.children)
      }
    }
    traverse(collections)
    return list
  }, [collections])

  const handleRequestClick = (e: React.MouseEvent, req: RequestItem) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setSelectedReqIds((prev) => {
        const next = new Set(prev)
        if (next.has(req.id)) next.delete(req.id)
        else next.add(req.id)
        return next
      })
      lastSelectedReqIdRef.current = req.id
    } else if (e.shiftKey && lastSelectedReqIdRef.current) {
      e.preventDefault()
      const lastId = lastSelectedReqIdRef.current
      const idx1 = flatRequestList.findIndex((r) => r.id === lastId)
      const idx2 = flatRequestList.findIndex((r) => r.id === req.id)
      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2)
        const end = Math.max(idx1, idx2)
        const rangeIds = flatRequestList.slice(start, end + 1).map((r) => r.id)
        setSelectedReqIds(new Set(rangeIds))
      } else {
        setSelectedReqIds(new Set([req.id]))
        lastSelectedReqIdRef.current = req.id
      }
    } else {
      setSelectedReqIds(new Set())
      lastSelectedReqIdRef.current = req.id
      onSelectRequest(req)
    }
  }

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false)

  // Inline Rename State
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)

  // Drag and Drop State for Collections & Requests
  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const [dragOverColTarget, setDragOverColTarget] = useState<{
    id: string
    position: 'before' | 'after' | 'inside'
  } | null>(null)
  const [draggedItem, setDraggedItem] = useState<{ colId: string; reqId: string } | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [dragOverReqId, setDragOverReqId] = useState<string | null>(null)

  // Secondary confirmation for collection deletion
  const [deleteConfirmCol, setDeleteConfirmCol] = useState<CollectionItem | null>(null)

  // Focus inline edit input when active (Only select all text once when entering rename mode)
  const prevEditingIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (editingTarget) {
      if (editingTarget.id !== prevEditingIdRef.current) {
        prevEditingIdRef.current = editingTarget.id
        if (editInputRef.current) {
          editInputRef.current.focus()
          editInputRef.current.select()
        }
      }
    } else {
      prevEditingIdRef.current = null
    }
  }, [editingTarget?.id])

  // Context menu dismissal listeners
  useEffect(() => {
    const handleDismiss = () => {
      setContextMenu(null)
      setShowMoveSubmenu(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setShowMoveSubmenu(false)
        setEditingTarget(null)
      }
    }
    if (contextMenu) {
      window.addEventListener('click', handleDismiss)
      window.addEventListener('contextmenu', handleDismiss)
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('click', handleDismiss)
      window.removeEventListener('contextmenu', handleDismiss)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  const toggleCol = (id: string) => {
    setCollapsedCols((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const allColIds = useMemo<string[]>(() => collectAllCollectionIds(collections), [collections])
  const isAllCollapsed = allColIds.length > 0 && allColIds.every((id: string) => collapsedCols[id])
  const toggleCollapseAll = () => {
    if (isAllCollapsed) {
      setCollapsedCols({})
    } else {
      const all: Record<string, boolean> = {}
      allColIds.forEach((id: string) => (all[id] = true))
      setCollapsedCols(all)
    }
  }

  const handleCreateCol = () => {
    const newId = 'col-' + Date.now()
    const defaultName = t('sidebar.newCollection')
    onCreateCollection(defaultName, newId)
    setCollapsedCols((prev) => ({ ...prev, [newId]: false }))
    setTimeout(() => {
      setEditingTarget({ type: 'collection', id: newId, name: defaultName })
    }, 60)
  }

  const handleCreateSubCol = (parentColId: string) => {
    const newId = 'col-' + Date.now()
    const defaultName = t('sidebar.newSubCollection')
    onCreateSubCollection(parentColId, defaultName)
    setCollapsedCols((prev) => ({ ...prev, [parentColId]: false }))
    setTimeout(() => {
      setEditingTarget({ type: 'collection', id: newId, name: defaultName })
    }, 60)
  }


  const handleCommitRename = () => {
    if (!editingTarget) return
    const trimmed = editingTarget.name.trim()
    if (trimmed) {
      if (editingTarget.type === 'collection') {
        onRenameCollection(editingTarget.id, trimmed)
      } else if (editingTarget.type === 'request' && editingTarget.colId) {
        onRenameRequest(editingTarget.colId, editingTarget.id, trimmed)
      }
    }
    setEditingTarget(null)
  }

  const renderRequestItem = (
    col: CollectionItem,
    req: RequestItem,
    reqIndex: number,
    depth: number
  ) => {
    const isBeingDragged = draggedItem?.reqId === req.id
    const isDragTarget = dragOverReqId === req.id

    return (
      <div
        key={req.id}
        draggable={editingTarget?.id !== req.id}
        onDragStart={(e) => {
          e.stopPropagation()
          setDraggedItem({ colId: col.id, reqId: req.id })
          e.dataTransfer.setData('text/plain', JSON.stringify({ colId: col.id, reqId: req.id }))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDraggedItem(null)
          setDragOverColId(null)
          setDragOverReqId(null)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (draggedItem && draggedItem.reqId !== req.id) {
            setDragOverReqId(req.id)
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverReqId(null)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (draggedItem) {
            onMoveRequest(draggedItem.colId, col.id, draggedItem.reqId, reqIndex)
          }
          setDraggedItem(null)
          setDragOverColId(null)
          setDragOverReqId(null)
        }}
        onClick={(e) => handleRequestClick(e, req)}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowMoveSubmenu(false)
          if (!selectedReqIds.has(req.id)) {
            setSelectedReqIds(new Set())
          }
          setContextMenu({
            type: 'request',
            x: Math.min(e.clientX, window.innerWidth - 220),
            y: Math.min(e.clientY, window.innerHeight - 300),
            colId: col.id,
            reqId: req.id,
            request: req
          })
        }}
        style={{ paddingLeft: `${22 + depth * 14}px`, paddingRight: '8px' }}
        className={"flex items-center justify-between py-1.5 rounded cursor-pointer text-xs group transition-all " +
          (selectedReqIds.has(req.id)
            ? "bg-sky-100 text-sky-950 font-bold ring-1 ring-sky-400/60 dark:bg-sky-500/25 dark:text-sky-200 dark:ring-sky-500/50 shadow-sm"
            : selectedRequestId === req.id
            ? "bg-sky-100 text-sky-950 font-bold dark:bg-sky-500/20 dark:text-sky-300 dark:font-medium shadow-sm"
            : "text-slate-200 hover:bg-slate-800/60 hover:text-slate-100") +
          (isBeingDragged ? " opacity-40 border border-dashed border-sky-400" : "") +
          (isDragTarget ? " border-t-2 border-sky-400" : "")}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 mr-1">
          <span className={"font-mono text-[10px] font-bold w-9 shrink-0 " + (methodBadgeColor[req.method] || 'text-slate-400')}>
            {req.method}
          </span>

          {editingTarget?.type === 'request' && editingTarget.id === req.id ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingTarget.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditingTarget({ ...editingTarget, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitRename()
                if (e.key === 'Escape') setEditingTarget(null)
              }}
              onBlur={handleCommitRename}
              className="bg-slate-950 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-slate-100 font-medium focus:outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingTarget({ type: 'request', id: req.id, name: req.name, colId: col.id })
              }}
              className="truncate text-xs"
              title={req.name || req.url || t('common.untitled')}
            >
              {req.name || req.url || t('common.untitled')}
            </span>
          )}

          {dirtyIds?.has(req.id) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title={t('header.autoSaveOffTip')} />
          )}
        </div>

        {/* Request Actions (Hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              setShowMoveSubmenu(false)
              setContextMenu({
                type: 'request',
                x: Math.min(rect.right + 4, window.innerWidth - 220),
                y: Math.min(rect.top, window.innerHeight - 300),
                colId: col.id,
                reqId: req.id,
                request: req
              })
            }}
            className="p-1 hover:text-slate-200 text-slate-500 rounded hover:bg-slate-800"
            title={t('common.edit')}
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  const renderCollectionTreeItem = (col: CollectionItem, depth: number) => {
    const isCollapsed = searchQuery ? false : (collapsedCols[col.id] || false)
    const isBeingDragged = draggedColId === col.id
    const isTargetBefore = dragOverColTarget?.id === col.id && dragOverColTarget.position === 'before'
    const isTargetAfter = dragOverColTarget?.id === col.id && dragOverColTarget.position === 'after'
    const isTargetInside = dragOverColTarget?.id === col.id && dragOverColTarget.position === 'inside'
    const isReqDragOver = dragOverColId === col.id

    const requestsToDisplay = searchQuery
      ? col.requests.filter(
          (r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.url.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : col.requests

    let headerClasses = "flex items-center justify-between py-1.5 rounded-md hover:bg-slate-800/60 cursor-pointer text-xs group text-slate-100 font-semibold transition-colors "
    if (isBeingDragged) headerClasses += "opacity-40 border border-dashed border-sky-400 "
    if (isTargetBefore) headerClasses += "border-t-2 border-sky-400 bg-sky-500/10 "
    if (isTargetAfter) headerClasses += "border-b-2 border-sky-400 bg-sky-500/10 "
    if (isTargetInside) headerClasses += "ring-2 ring-sky-500 bg-sky-500/15 text-sky-400 font-semibold "
    if (isReqDragOver) headerClasses += "ring-2 ring-sky-500/80 bg-sky-500/10 "

    const totalReqs = countAllRequests(col)
    const subColCount = col.children?.length || 0

    return (
      <div key={col.id} className="flex flex-col">
        {/* Collection Header */}
        <div
          draggable={editingTarget?.id !== col.id}
          onDragStart={(e) => {
            e.stopPropagation()
            setDraggedColId(col.id)
            e.dataTransfer.setData('text/plain', 'col:' + col.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setDraggedColId(null)
            setDragOverColTarget(null)
            setDraggedItem(null)
            setDragOverColId(null)
            setDragOverReqId(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (draggedColId && draggedColId !== col.id && !isDescendant(collections, draggedColId, col.id)) {
              const rect = e.currentTarget.getBoundingClientRect()
              const relY = (e.clientY - rect.top) / rect.height
              const position: 'before' | 'after' | 'inside' = relY < 0.25 ? 'before' : relY > 0.75 ? 'after' : 'inside'
              setDragOverColTarget({ id: col.id, position })
            } else if (draggedItem && draggedItem.colId !== col.id) {
              setDragOverColId(col.id)
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dragOverColTarget?.id === col.id) setDragOverColTarget(null)
              if (dragOverColId === col.id) setDragOverColId(null)
            }
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (draggedColId && dragOverColTarget && draggedColId !== dragOverColTarget.id) {
              onMoveCollection(draggedColId, dragOverColTarget.id, dragOverColTarget.position)
            } else if (draggedItem) {
              onMoveRequest(draggedItem.colId, col.id, draggedItem.reqId)
            }
            setDraggedColId(null)
            setDragOverColTarget(null)
            setDraggedItem(null)
            setDragOverColId(null)
            setDragOverReqId(null)
          }}
          onClick={() => toggleCol(col.id)}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowMoveSubmenu(false)
            setContextMenu({
              type: 'collection',
              x: Math.min(e.clientX, window.innerWidth - 220),
              y: Math.min(e.clientY, window.innerHeight - 280),
              colId: col.id
            })
          }}
          style={{ paddingLeft: `${6 + depth * 14}px`, paddingRight: '8px' }}
          className={headerClasses}
        >
          <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 mr-1">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            {depth === 0 ? (
              <Folder className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
            ) : (
              <FolderTree className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
            )}

            {editingTarget?.type === 'collection' && editingTarget.id === col.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editingTarget.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingTarget({ ...editingTarget, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitRename()
                  if (e.key === 'Escape') setEditingTarget(null)
                }}
                onBlur={handleCommitRename}
                className="bg-slate-950 border border-sky-500 rounded px-1.5 py-0.5 text-xs text-slate-100 font-medium focus:outline-none w-full"
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditingTarget({ type: 'collection', id: col.id, name: col.name })
                }}
                className="font-medium truncate"
                title={col.name}
              >
                {col.name}
              </span>
            )}

            <span className="text-[10px] text-slate-500 font-mono shrink-0">
              ({totalReqs}{subColCount > 0 ? ` · ${t('sidebar.subColCountBadge', { count: subColCount })}` : ''})
            </span>
          </div>

          {/* Collection Actions (Hover) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRunCollection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRunCollection(col)
                }}
                className="p-1 hover:text-emerald-400 text-slate-500 rounded hover:bg-slate-800"
                title={t('sidebar.runCollection')}
              >
                <Play className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNewRequestInCollection(col.id)
              }}
              className="p-1 hover:text-sky-400 text-slate-500 rounded hover:bg-slate-800"
              title={t('sidebar.addRequest')}
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleCreateSubCol(col.id)
              }}
              className="p-1 hover:text-amber-400 text-slate-500 rounded hover:bg-slate-800"
              title={t('sidebar.addSubCollection')}
            >
              <FolderPlus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                setShowMoveSubmenu(false)
                setContextMenu({
                  type: 'collection',
                  x: Math.min(rect.right + 4, window.innerWidth - 220),
                  y: Math.min(rect.top, window.innerHeight - 280),
                  colId: col.id
                })
              }}
              className="p-1 hover:text-slate-200 text-slate-500 rounded hover:bg-slate-800"
              title={t('common.edit')}
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Children & Requests */}
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5 relative">
            {/* Subtle tree guideline */}
            <div
              className="absolute bottom-1 top-0 border-l border-slate-800/80 pointer-events-none"
              style={{ left: `${12 + depth * 14}px` }}
            />

            {/* Sub-collections first */}
            {col.children && col.children.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {col.children.map((subCol) => renderCollectionTreeItem(subCol, depth + 1))}
              </div>
            )}

            {/* Requests in this collection */}
            <div className="flex flex-col gap-0.5">
              {requestsToDisplay.map((req, reqIndex) => renderRequestItem(col, req, reqIndex, depth))}
            </div>

            {requestsToDisplay.length === 0 && (!col.children || col.children.length === 0) && (
              <div
                style={{ paddingLeft: `${24 + depth * 14}px` }}
                className="py-1 text-[11px] text-slate-500 italic"
              >
                {searchQuery ? t('sidebar.noMatches') : t('sidebar.emptyFolder')}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="w-64 h-full flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 select-none relative"
    >
      {/* Top Brand / Actions */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-200 tracking-wide">
          <div className="w-5 h-5 bg-sky-500 rounded flex items-center justify-center text-white text-xs font-black">
            R
          </div>
          <span>Relay</span>
        </div>
        <div className="flex items-center gap-1">
          {onOpenDataTransfer && (
            <button
              type="button"
              onClick={() => onOpenDataTransfer('export')}
              title={t('sidebar.importExportData')}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCurlModal}
            title={t('sidebar.importCurl')}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCreateCol}
            title={t('sidebar.newCollection')}
            className="p-1 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNewRequest}
            title={t('sidebar.newRequest')}
            className="p-1 text-sky-400 hover:text-sky-300 hover:bg-slate-800 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <div className="flex flex-col gap-1.5">
          {/* Search Input */}
          <div className="relative mb-1">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder={t('sidebar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded pl-7 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Collections Header with Expand/Collapse and New Collection */}
          <div className="flex items-center justify-between px-1 py-0.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span>{t('sidebar.collections')}</span>
              <span className="text-[10px] text-slate-400 font-normal font-mono">({flattenAllCollections(collections).length})</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapseAll}
                title={isAllCollapsed ? t('sidebar.expandAll') : t('sidebar.collapseAll')}
                className="p-1 text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 rounded transition-colors"
              >
                {isAllCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCreateCol}
                title={t('sidebar.newCollection')}
                className="p-1 text-sky-400 hover:text-sky-300 hover:bg-slate-800/60 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {collections.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 flex flex-col items-center gap-2">
              <span>{t('sidebar.noCollections')}</span>
              <button
                type="button"
                onClick={handleCreateCol}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded text-xs transition-colors flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> {t('sidebar.createCollection')}
              </button>
            </div>
          ) : (
            <>
              {filterCollectionTree(collections, searchQuery).map((col) =>
                renderCollectionTreeItem(col, 0)
              )}

              {/* Drop target at bottom to convert dragged collection back to root level */}
              {draggedColId && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverColTarget({ id: '__ROOT__', position: 'after' })
                  }}
                  onDragLeave={() => {
                    if (dragOverColTarget?.id === '__ROOT__') {
                      setDragOverColTarget(null)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (draggedColId) {
                      onMoveCollection(draggedColId, null, 'after')
                    }
                    setDraggedColId(null)
                    setDragOverColTarget(null)
                  }}
                  className={`py-2 px-3 border-2 border-dashed rounded-lg text-center text-xs transition-all ${
                    dragOverColTarget?.id === '__ROOT__'
                      ? 'border-sky-400 bg-sky-500/10 text-sky-300 font-medium'
                      : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span>{t('sidebar.dropAsRoot')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Environment Selector */}
      <div className="p-2.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <select
            value={activeEnvId || ''}
            onChange={(e) => onSelectEnv(e.target.value)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none truncate w-full cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-slate-400">{t('sidebar.noEnv')}</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} className="bg-slate-900 text-slate-200">
                {env.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {onOpenDevToys && (
            <button
              type="button"
              onClick={onOpenDevToys}
              title={`${t('devtoys.title')} (Ctrl+Shift+T)`}
              className="p-1 text-slate-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenEnvModal}
            title={t('sidebar.envSettings')}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title={t('sidebar.prefSettings')}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenu && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl p-1 w-52 text-xs text-slate-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-75 select-none"
        >
          {contextMenu.type === 'collection' && (
            <>
              {onRunCollection && (
                <button
                  type="button"
                  onClick={() => {
                    const col = findCollectionInTree(collections, contextMenu.colId)
                    if (col) {
                      onRunCollection(col)
                    }
                    setContextMenu(null)
                  }}
                  className="px-2.5 py-1.5 text-left hover:bg-emerald-500/20 hover:text-emerald-300 rounded flex items-center gap-2 transition-colors font-medium text-emerald-400"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-400/20" />
                  <span>{t('sidebar.runCollection')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const col = findCollectionInTree(collections, contextMenu.colId)
                  if (col) {
                    setEditingTarget({ type: 'collection', id: col.id, name: col.name })
                  }
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('sidebar.renameCollection')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewRequestInCollection(contextMenu.colId)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('sidebar.addRequest')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCreateSubCol(contextMenu.colId)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('sidebar.addSubCollection')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateCollection(contextMenu.colId)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('sidebar.duplicateCollection')}</span>
              </button>

              {onOpenDataTransfer && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDataTransfer('export', contextMenu.colId, 'json')
                      setContextMenu(null)
                    }}
                    className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
                  >
                    <FolderDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('sidebar.exportCollection')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenDataTransfer('export', contextMenu.colId, 'html')
                      setContextMenu(null)
                    }}
                    className="px-2.5 py-1.5 text-left hover:bg-emerald-500/20 hover:text-emerald-300 rounded flex items-center gap-2 transition-colors text-emerald-300"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('sidebar.exportDocCollection')}</span>
                  </button>
                </>
              )}

              <div className="h-px bg-slate-800 my-0.5" />

              <button
                type="button"
                onClick={() => {
                  const target = findCollectionInTree(collections, contextMenu.colId)
                  if (target) {
                    setDeleteConfirmCol(target)
                  }
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-rose-500/20 hover:text-rose-400 rounded flex items-center gap-2 transition-colors text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('sidebar.deleteCollection')}</span>
              </button>
            </>
          )}

          {contextMenu.type === 'request' && contextMenu.request && (
            <>
              {selectedReqIds.size > 1 && selectedReqIds.has(contextMenu.request.id) ? (
                onRunRequests && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedList = flatRequestList.filter((r) => selectedReqIds.has(r.id))
                      if (selectedList.length > 0) {
                        onRunRequests(
                          selectedList,
                          t('sidebar.runSelected', { count: selectedList.length })
                        )
                      }
                      setContextMenu(null)
                    }}
                    className="px-2.5 py-1.5 text-left hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 rounded flex items-center gap-2 transition-colors font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20 dark:fill-emerald-400/20" />
                    <span>{t('sidebar.runSelected', { count: selectedReqIds.size })}</span>
                  </button>
                )
              ) : (
                onRunRequests && (
                  <button
                    type="button"
                    onClick={() => {
                      if (contextMenu.request) {
                        onRunRequests([contextMenu.request], contextMenu.request.name || 'Request')
                      }
                      setContextMenu(null)
                    }}
                    className="px-2.5 py-1.5 text-left hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 rounded flex items-center gap-2 transition-colors text-emerald-600 dark:text-emerald-400 font-medium"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-600/20 dark:fill-emerald-400/20" />
                    <span>{t('sidebar.runInRunner')}</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingTarget({
                    type: 'request',
                    id: contextMenu.request!.id,
                    name: contextMenu.request!.name,
                    colId: contextMenu.colId
                  })
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('sidebar.renameRequest')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onDuplicateRequest(contextMenu.colId, contextMenu.request!.id)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('sidebar.duplicateRequest')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCopyUrl(contextMenu.request!.url)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Link className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('sidebar.copyUrl')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCopyRequestCurl(contextMenu.request!)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('sidebar.copyAsCurl')}</span>
              </button>

              {/* Move to Collection Submenu */}
              <div
                className="relative"
                onMouseEnter={() => setShowMoveSubmenu(true)}
                onMouseLeave={() => setShowMoveSubmenu(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowMoveSubmenu((prev) => !prev)}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MoveRight className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('sidebar.moveTo')}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </button>

                {showMoveSubmenu && (
                  <div className="absolute left-full top-0 ml-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl p-1 w-52 max-h-64 overflow-y-auto text-xs text-slate-200 flex flex-col gap-0.5">
                    {flattenAllCollections(collections).filter((c) => c.id !== contextMenu.colId).length === 0 ? (
                      <div className="px-2.5 py-1.5 text-slate-500 italic text-[11px]">
                        {t('sidebar.noOtherCollections')}
                      </div>
                    ) : (
                      flattenAllCollections(collections)
                        .filter((c) => c.id !== contextMenu.colId)
                        .map((targetCol) => (
                          <button
                            key={targetCol.id}
                            type="button"
                            onClick={() => {
                              onMoveRequest(contextMenu.colId, targetCol.id, contextMenu.request!.id)
                              setContextMenu(null)
                              setShowMoveSubmenu(false)
                            }}
                            className="px-2 py-1 text-left hover:bg-sky-500/20 hover:text-sky-300 rounded flex items-center gap-2 transition-colors truncate"
                            title={targetCol.name}
                          >
                            <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{targetCol.name}</span>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800 my-0.5" />

              <button
                type="button"
                onClick={() => {
                  onDeleteRequest(contextMenu.colId, contextMenu.request!.id)
                  setContextMenu(null)
                }}
                className="px-2.5 py-1.5 text-left hover:bg-rose-500/20 hover:text-rose-400 rounded flex items-center gap-2 transition-colors text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('sidebar.deleteRequest')}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      {deleteConfirmCol && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-100"
          onClick={() => setDeleteConfirmCol(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDeleteConfirmCol(null)
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl p-5 max-w-md w-full flex flex-col gap-4 text-slate-200 animate-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  {t('sidebar.deleteColTitle')}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('sidebar.deleteColConfirmMsg', { name: deleteConfirmCol.name })}
                  {(() => {
                    const reqCount = countAllRequests(deleteConfirmCol)
                    const subColCount = countAllSubCollections(deleteConfirmCol)
                    if (reqCount > 0 || subColCount > 0) {
                      const parts: string[] = []
                      if (subColCount > 0) parts.push(t('sidebar.subCollectionsUnit', { count: subColCount }))
                      if (reqCount > 0) parts.push(t('sidebar.requestsUnit', { count: reqCount }))
                      return (
                        <> {t('sidebar.deleteColContainsMsg', { parts: parts.join('、') })}</>
                      )
                    }
                    return <> {t('sidebar.deleteColCannotUndo')}</>
                  })()}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmCol(null)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700/80 rounded-md transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  onDeleteCollection(deleteConfirmCol.id)
                  setDeleteConfirmCol(null)
                }}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors font-medium flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('common.confirmDelete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
