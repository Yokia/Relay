import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { RequestHeader } from './components/RequestHeader'
import { RequestEditor } from './components/RequestEditor'
import { ResponseViewer } from './components/ResponseViewer'
import { EnvironmentModal } from './components/EnvironmentModal'
import { CurlModal } from './components/CurlModal'
import { ConstantManagerModal } from './components/ConstantManagerModal'
import { SettingsModal, AppSettings } from './components/SettingsModal'
import { ToastContainer, ToastMessage } from './components/Toast'
import { RequestItem, CollectionItem, HistoryItem, Environment, ResponseData, ConstantItem, ResponseRun } from './types'

const initialConstants: ConstantItem[] = [
  {
    id: 'c-server',
    name: 'server',
    currentValue: 'http://localhost',
    options: ['http://localhost', 'http://127.0.0.1', 'http://192.168.1.100', 'https://api.dev.local'],
    description: 'Target server host/IP'
  },
  {
    id: 'c-port',
    name: 'port',
    currentValue: '8080',
    options: ['3000', '8080', '8000', '5000', '9000'],
    description: 'Server listening port'
  },
  {
    id: 'c-baseurl',
    name: 'baseUrl',
    currentValue: 'https://jsonplaceholder.typicode.com',
    options: ['https://jsonplaceholder.typicode.com', 'https://api.github.com'],
    description: 'Public API base URL'
  }
]

const defaultNewRequest: RequestItem = {
  id: 'req-' + Date.now(),
  name: 'Sample Request',
  method: 'GET',
  url: '{{server}}:{{port}}/api/users',
  params: [],
  headers: [],
  bodyType: 'none',
  bodyRaw: ''
}

const defaultSettings: AppSettings = {
  autoSave: false,
  timeout: 30000,
  sslVerify: true,
  maxResponsesPerRequest: 5
}

export default function App() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [constants, setConstants] = useState<ConstantItem[]>(initialConstants)
  const [activeEnvId, setActiveEnvId] = useState<string | undefined>(undefined)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  // In-memory working drafts and dirty state tracking (Never lose changes upon switching APIs)
  const [drafts, setDrafts] = useState<Record<string, RequestItem>>({})
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())

  const [currentRequest, setCurrentRequest] = useState<RequestItem>(defaultNewRequest)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Per-request response runs history (Preserves responses across switching APIs and app restarts)
  const [responseHistoryMap, setResponseHistoryMap] = useState<Record<string, ResponseRun[]>>({})
  const [selectedRunIdMap, setSelectedRunIdMap] = useState<Record<string, string>>({})

  // Modals
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false)
  const [isConstantModalOpen, setIsConstantModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [curlModalState, setCurlModalState] = useState<{ isOpen: boolean; mode: 'import' | 'export' }>({
    isOpen: false,
    mode: 'import'
  })

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  // Resizable split pane
  const [splitRatio, setSplitRatio] = useState<number>(0.5)
  const isDraggingRef = useRef(false)

  // Load initial data from electron storage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getData().then((data: any) => {
        if (data) {
          if (data.collections) setCollections(data.collections)
          if (data.history) setHistory(data.history)
          if (data.environments) setEnvironments(data.environments)
          if (data.constants && data.constants.length > 0) {
            setConstants(data.constants)
          }
          if (data.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }))
          }
          if (data.activeEnvironmentId) setActiveEnvId(data.activeEnvironmentId)
          if (data.responseHistoryMap) {
            setResponseHistoryMap(data.responseHistoryMap)
          }
          if (data.collections?.[0]?.requests?.[0]) {
            const initialReq = JSON.parse(JSON.stringify(data.collections[0].requests[0]))
            setCurrentRequest(initialReq)
            if (data.responseHistoryMap?.[initialReq.id]?.[0]) {
              setResponse(data.responseHistoryMap[initialReq.id][0].response)
            }
          }
        }
      })
    }
  }, [])

  // Persist helper
  const persist = (updates: any) => {
    if (window.electronAPI) {
      window.electronAPI.saveData(updates)
    }
  }

  // Update request handler with draft and auto-save support
  const handleRequestChange = (updates: Partial<RequestItem>) => {
    setCurrentRequest((prev) => {
      const next = { ...prev, ...updates }
      // Record draft in memory immediately so switching APIs preserves it
      setDrafts((prevDrafts) => ({ ...prevDrafts, [next.id]: next }))

      if (settings.autoSave) {
        // Auto Save ON: write directly to collections and persist
        syncToCollections(next)
      } else {
        // Auto Save OFF: mark as dirty (unsaved)
        setDirtyIds((prevSet) => new Set(prevSet).add(next.id))
      }
      return next
    })
  }

  // Helper to sync request to collection
  const syncToCollections = (req: RequestItem) => {
    setCollections((prevCols) => {
      let found = false
      const nextCols = prevCols.map((col) => {
        const idx = col.requests.findIndex((r) => r.id === req.id)
        if (idx !== -1) {
          found = true
          const nextReqs = [...col.requests]
          nextReqs[idx] = JSON.parse(JSON.stringify(req))
          return { ...col, requests: nextReqs }
        }
        return col
      })
      if (found) {
        persist({ collections: nextCols })
        return nextCols
      }
      return prevCols
    })
  }

  // Switching APIs from Sidebar (Preserves all unsaved modifications via drafts & retains response history)
  const handleSelectRequest = (targetReq: RequestItem) => {
    // If there is an unsaved working draft for this request, load the draft!
    const reqToLoad = drafts[targetReq.id] || targetReq
    setCurrentRequest(JSON.parse(JSON.stringify(reqToLoad)))

    // Load active response for this request if any
    const existingRuns = responseHistoryMap[targetReq.id] || []
    const selectedRunId = selectedRunIdMap[targetReq.id]
    const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
    setResponse(activeRun ? activeRun.response : null)
  }

  // Switch constant current value directly (Global)
  const handleSwitchConstant = (name: string, value: string) => {
    const next = constants.map((c) => (c.name === name ? { ...c, currentValue: value } : c))
    setConstants(next)
    persist({ constants: next })
    addToast(`Switched global {{${name}}} to ${value}`, 'info')
  }

  // Switch constant for current request (request-level override or reset to global)
  const handleRequestSwitchConstant = (name: string, value: string | null) => {
    const prevOverrides = currentRequest.constantOverrides || {}
    const nextOverrides: Record<string, string> = { ...prevOverrides }

    if (value === null) {
      delete nextOverrides[name]
    } else {
      nextOverrides[name] = value
    }

    const updatedReq: RequestItem = {
      ...currentRequest,
      constantOverrides: nextOverrides
    }

    setCurrentRequest(updatedReq)

    if (settings.autoSave) {
      syncToCollections(updatedReq)
    } else {
      setDirtyIds((prev) => new Set(prev).add(updatedReq.id))
    }

    if (value === null) {
      addToast(`{{${name}}} 恢复跟随全局默认值`, 'info')
    } else {
      addToast(`已为当前请求锁定 {{${name}}} = ${value}`, 'success')
    }
  }

  // Save updated constants from modal
  const handleSaveConstants = (updated: ConstantItem[]) => {
    setConstants(updated)
    persist({ constants: updated })
    addToast('Constants updated successfully!', 'success')
  }

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const next = { ...settings, ...newSettings }
    setSettings(next)

    if (newSettings.maxResponsesPerRequest !== undefined) {
      const maxLimit = newSettings.maxResponsesPerRequest
      setResponseHistoryMap((prev) => {
        const trimmed: Record<string, ResponseRun[]> = {}
        for (const [k, v] of Object.entries(prev)) {
          trimmed[k] = v.slice(0, maxLimit)
        }
        persist({ settings: next, responseHistoryMap: trimmed })
        return trimmed
      })
    } else {
      persist({ settings: next })
    }

    if (next.autoSave) {
      // When turning on auto-save, automatically save current dirty requests
      if (dirtyIds.has(currentRequest.id)) {
        syncToCollections(currentRequest)
        setDirtyIds(new Set())
      }
      addToast('Auto Save enabled (changes save automatically)', 'success')
    } else {
      addToast('Auto Save disabled (manual save mode)', 'info')
    }
  }

  // Open any detected link from response body as a new request in Relay
  const handleOpenUrlInRelay = (url: string) => {
    const newReq: RequestItem = {
      id: 'req-' + Date.now(),
      name: 'Linked: ' + (url.replace(/^https?:\/\//, '').slice(0, 24)),
      method: 'GET',
      url,
      params: [],
      headers: [],
      bodyType: 'none',
      bodyRaw: ''
    }
    setCurrentRequest(newReq)
    setResponse(null)
    addToast('Created new request from link', 'info')
  }

  // Replace variables like {{server}} or {{port}} with constants and environment variables
  const interpolate = (text: string, req?: RequestItem): string => {
    if (!text) return text
    let result = text

    const targetReq = req || currentRequest
    const overrides = targetReq?.constantOverrides || {}

    // 1. Replace from custom constants (request-level overrides take precedence over global currentValue)
    for (const c of constants) {
      if (c.name) {
        const effectiveVal = overrides[c.name] !== undefined ? overrides[c.name] : c.currentValue
        if (effectiveVal) {
          result = result.replaceAll('{{' + c.name + '}}', effectiveVal)
        }
      }
    }

    // 2. Replace from active environment variables
    if (activeEnvId) {
      const env = environments.find((e) => e.id === activeEnvId)
      if (env) {
        for (const v of env.variables) {
          if (v.enabled && v.key.trim()) {
            result = result.replaceAll('{{' + v.key.trim() + '}}', v.value)
          }
        }
      }
    }
    return result
  }

  // Send Request
  const handleSend = async () => {
    if (!currentRequest.url.trim() || isLoading) return
    setIsLoading(true)

    const processedUrl = interpolate(currentRequest.url.trim())
    const processedHeaders = (currentRequest.headers || []).map((h) => ({
      ...h,
      key: interpolate(h.key),
      value: interpolate(h.value)
    }))
    const processedParams = (currentRequest.params || []).map((p) => ({
      ...p,
      key: interpolate(p.key),
      value: interpolate(p.value)
    }))
    const processedBodyRaw = interpolate(currentRequest.bodyRaw || '')

    const payload = {
      method: currentRequest.method,
      url: processedUrl,
      headers: processedHeaders,
      params: processedParams,
      bodyType: currentRequest.bodyType,
      bodyRaw: processedBodyRaw,
      bodyUrlEncoded: currentRequest.bodyUrlEncoded,
      bodyFormData: currentRequest.bodyFormData,
      timeout: settings.timeout || 30000,
      rejectUnauthorized: settings.sslVerify !== false
    }

    const maxRuns = settings.maxResponsesPerRequest || 5
    const reqId = currentRequest.id

    try {
      const res = await window.electronAPI.sendRequest(payload)
      setResponse(res)

      // Add to per-request response runs
      const newRun: ResponseRun = {
        id: 'run-' + Date.now(),
        timestamp: Date.now(),
        method: currentRequest.method,
        url: processedUrl,
        response: res
      }
      setResponseHistoryMap((prev) => {
        const currentRuns = prev[reqId] || []
        const updatedRuns = [newRun, ...currentRuns].slice(0, maxRuns)
        const updatedMap = { ...prev, [reqId]: updatedRuns }
        persist({ responseHistoryMap: updatedMap })
        return updatedMap
      })
      setSelectedRunIdMap((prev) => ({ ...prev, [reqId]: newRun.id }))

      // Append to global history
      const newHistoryItem: HistoryItem = {
        id: 'hist-' + Date.now(),
        request: JSON.parse(JSON.stringify(currentRequest)),
        status: res.status,
        time: res.time,
        timestamp: Date.now()
      }
      const nextHistory = [newHistoryItem, ...history.slice(0, 49)]
      setHistory(nextHistory)
      persist({ history: nextHistory })
    } catch (err: any) {
      const errRes: ResponseData = {
        status: 0,
        statusText: 'Client Error',
        headers: {},
        data: null,
        size: 0,
        time: 0,
        contentType: '',
        error: err.message || 'Unknown error occurred'
      }
      setResponse(errRes)

      const errRun: ResponseRun = {
        id: 'run-' + Date.now(),
        timestamp: Date.now(),
        method: currentRequest.method,
        url: processedUrl,
        response: errRes
      }
      setResponseHistoryMap((prev) => {
        const currentRuns = prev[reqId] || []
        const updatedRuns = [errRun, ...currentRuns].slice(0, maxRuns)
        const updatedMap = { ...prev, [reqId]: updatedRuns }
        persist({ responseHistoryMap: updatedMap })
        return updatedMap
      })
      setSelectedRunIdMap((prev) => ({ ...prev, [reqId]: errRun.id }))
    } finally {
      setIsLoading(false)
    }
  }

  // Save Request explicitly (Non-blocking, clears dirty state)
  const handleSave = () => {
    let found = false
    const nextCols = collections.map((col) => {
      const reqIndex = col.requests.findIndex((r) => r.id === currentRequest.id)
      if (reqIndex !== -1) {
        found = true
        const nextReqs = [...col.requests]
        nextReqs[reqIndex] = JSON.parse(JSON.stringify(currentRequest))
        return { ...col, requests: nextReqs }
      }
      return col
    })

    if (found) {
      setCollections(nextCols)
      persist({ collections: nextCols })
      // Clear dirty flag
      setDirtyIds((prev) => {
        const next = new Set(prev)
        next.delete(currentRequest.id)
        return next
      })
      addToast('Request saved successfully!', 'success')
    } else {
      if (collections.length === 0) {
        const newCol: CollectionItem = {
          id: 'col-' + Date.now(),
          name: 'My Collection',
          requests: [JSON.parse(JSON.stringify(currentRequest))]
        }
        const updated = [newCol]
        setCollections(updated)
        persist({ collections: updated })
        setDirtyIds((prev) => {
          const next = new Set(prev)
          next.delete(currentRequest.id)
          return next
        })
        addToast('Saved to new collection "My Collection"!', 'success')
      } else {
        const target = collections[0]
        const updated = collections.map((c) =>
          c.id === target.id
            ? { ...c, requests: [...c.requests, JSON.parse(JSON.stringify(currentRequest))] }
            : c
        )
        setCollections(updated)
        persist({ collections: updated })
        setDirtyIds((prev) => {
          const next = new Set(prev)
          next.delete(currentRequest.id)
          return next
        })
        addToast('Saved to collection "' + target.name + '"!', 'success')
      }
    }
  }

  // Rename Collection
  const handleRenameCollection = (colId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const next = collections.map((c) => (c.id === colId ? { ...c, name: trimmed } : c))
    setCollections(next)
    persist({ collections: next })
    addToast(`Renamed collection to "${trimmed}"`, 'success')
  }

  // Duplicate Collection
  const handleDuplicateCollection = (colId: string) => {
    const col = collections.find((c) => c.id === colId)
    if (!col) return
    const newCol: CollectionItem = {
      id: 'col-' + Date.now(),
      name: col.name + ' (Copy)',
      requests: col.requests.map((r) => ({
        ...JSON.parse(JSON.stringify(r)),
        id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
      }))
    }
    const next = [...collections, newCol]
    setCollections(next)
    persist({ collections: next })
    addToast(`Duplicated collection "${col.name}"`, 'success')
  }

  // Add new request into specific collection
  const handleNewRequestInCollection = (colId: string, name = 'New Request') => {
    const newReq: RequestItem = {
      ...defaultNewRequest,
      id: 'req-' + Date.now(),
      name
    }
    const next = collections.map((c) =>
      c.id === colId ? { ...c, requests: [...c.requests, newReq] } : c
    )
    setCollections(next)
    persist({ collections: next })
    setCurrentRequest(newReq)
    setResponse(null)
    addToast(`Added request to collection`, 'success')
  }

  // Rename Request
  const handleRenameRequest = (colId: string, reqId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const next = collections.map((c) => {
      if (c.id !== colId) return c
      return {
        ...c,
        requests: c.requests.map((r) => (r.id === reqId ? { ...r, name: trimmed } : r))
      }
    })
    setCollections(next)
    persist({ collections: next })
    if (currentRequest.id === reqId) {
      setCurrentRequest((prev) => ({ ...prev, name: trimmed }))
    }
    addToast(`Renamed request to "${trimmed}"`, 'success')
  }

  // Duplicate Request
  const handleDuplicateRequest = (colId: string, reqId: string) => {
    let duplicatedReq: RequestItem | null = null
    const next = collections.map((c) => {
      if (c.id !== colId) return c
      const idx = c.requests.findIndex((r) => r.id === reqId)
      if (idx === -1) return c
      const original = c.requests[idx]
      duplicatedReq = {
        ...JSON.parse(JSON.stringify(original)),
        id: 'req-' + Date.now(),
        name: original.name + ' (Copy)'
      }
      const newReqs = [...c.requests]
      newReqs.splice(idx + 1, 0, duplicatedReq)
      return { ...c, requests: newReqs }
    })
    if (duplicatedReq) {
      setCollections(next)
      persist({ collections: next })
      setCurrentRequest(duplicatedReq)
      addToast(`Duplicated request`, 'success')
    }
  }

  // Move Request (supports moving to another collection or reordering within the same collection)
  const handleMoveRequest = (
    sourceColId: string,
    targetColId: string,
    reqId: string,
    targetIndex?: number
  ) => {
    let itemToMove: RequestItem | null = null
    for (const c of collections) {
      const found = c.requests.find((r) => r.id === reqId)
      if (found) {
        itemToMove = found
        break
      }
    }
    if (!itemToMove) return

    // Reordering within the same collection
    if (sourceColId === targetColId) {
      const col = collections.find((c) => c.id === sourceColId)
      if (!col) return
      const currentIdx = col.requests.findIndex((r) => r.id === reqId)
      if (currentIdx === -1 || targetIndex === undefined || currentIdx === targetIndex) return

      const nextReqs = [...col.requests]
      const [removed] = nextReqs.splice(currentIdx, 1)
      nextReqs.splice(targetIndex, 0, removed)

      const next = collections.map((c) => (c.id === sourceColId ? { ...c, requests: nextReqs } : c))
      setCollections(next)
      persist({ collections: next })
      return
    }

    // Moving across different collections
    const next = collections.map((c) => {
      if (c.id === sourceColId) {
        return { ...c, requests: c.requests.filter((r) => r.id !== reqId) }
      }
      if (c.id === targetColId) {
        const nextReqs = [...c.requests]
        if (targetIndex !== undefined && targetIndex >= 0) {
          nextReqs.splice(targetIndex, 0, itemToMove!)
        } else {
          nextReqs.push(itemToMove!)
        }
        return { ...c, requests: nextReqs }
      }
      return c
    })

    setCollections(next)
    persist({ collections: next })
    const targetCol = collections.find((c) => c.id === targetColId)
    addToast(`Moved request to "${targetCol?.name || 'Collection'}"`, 'success')
  }

  // Quick copy request as cURL
  const handleCopyRequestCurl = (req: RequestItem) => {
    let curl = `curl --location --request ${req.method} '${interpolate(req.url, req)}'`
    if (req.headers && req.headers.length > 0) {
      req.headers.forEach((h) => {
        if (h.enabled && h.key) {
          curl += ` \\\n  --header '${interpolate(h.key, req)}: ${interpolate(h.value, req)}'`
        }
      })
    }
    if (req.bodyType === 'json' && req.bodyRaw) {
      curl += ` \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '${interpolate(req.bodyRaw, req).replace(/'/g, "'\\''")}'`
    }
    navigator.clipboard.writeText(curl)
    addToast('Copied cURL command to clipboard!', 'success')
  }

  // Quick copy URL
  const handleCopyUrl = (url: string) => {
    if (!url) return
    navigator.clipboard.writeText(interpolate(url))
    addToast('Copied URL to clipboard!', 'success')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentRequest, collections])

  // Mouse drag handler for split
  const handleMouseDown = () => {
    isDraggingRef.current = true
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const container = document.getElementById('split-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      if (ratio > 0.25 && ratio < 0.75) {
        setSplitRatio(ratio)
      }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const isCurrentDirty = dirtyIds.has(currentRequest.id)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Sidebar */}
      <Sidebar
        collections={collections}
        history={history}
        environments={environments}
        constants={constants}
        activeEnvId={activeEnvId}
        selectedRequestId={currentRequest.id}
        dirtyIds={dirtyIds}
        onSelectRequest={handleSelectRequest}
        onNewRequest={() => {
          const newReq = {
            ...defaultNewRequest,
            id: 'req-' + Date.now(),
            name: 'New Request'
          }
          setCurrentRequest(newReq)
          setResponse(null)
        }}
        onCreateCollection={(name, id) => {
          const newId = id || ('col-' + Date.now())
          const next = [...collections, { id: newId, name, requests: [] }]
          setCollections(next)
          persist({ collections: next })
          addToast('Collection created: ' + name, 'success')
        }}
        onRenameCollection={handleRenameCollection}
        onDuplicateCollection={handleDuplicateCollection}
        onDeleteCollection={(id) => {
          const next = collections.filter((c) => c.id !== id)
          setCollections(next)
          persist({ collections: next })
          addToast('Collection deleted', 'info')
        }}
        onNewRequestInCollection={handleNewRequestInCollection}
        onRenameRequest={handleRenameRequest}
        onDuplicateRequest={handleDuplicateRequest}
        onDeleteRequest={(colId, reqId) => {
          const next = collections.map((c) =>
            c.id === colId ? { ...c, requests: c.requests.filter((r) => r.id !== reqId) } : c
          )
          setCollections(next)
          persist({ collections: next })
          addToast('Request deleted', 'info')
        }}
        onMoveRequest={handleMoveRequest}
        onCopyRequestCurl={handleCopyRequestCurl}
        onCopyUrl={handleCopyUrl}
        onClearHistory={() => {
          setHistory([])
          persist({ history: [] })
          addToast('History cleared', 'info')
        }}
        onOpenEnvModal={() => setIsEnvModalOpen(true)}
        onOpenCurlModal={() => setCurlModalState({ isOpen: true, mode: 'import' })}
        onOpenConstantModal={() => setIsConstantModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onSelectEnv={(id) => {
          setActiveEnvId(id || undefined)
          persist({ activeEnvironmentId: id || undefined })
        }}
        onSwitchConstant={handleSwitchConstant}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900/50">
        {/* Workspace Top Status Bar */}
        <div className="h-8 border-b border-slate-800/80 flex items-center justify-between px-3 text-xs text-slate-500 bg-slate-950/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-400">Relay</span>
            <span className="text-slate-600">/</span>
            <span className="truncate max-w-xs text-slate-300 font-medium">{currentRequest.name}</span>
            {isCurrentDirty && !settings.autoSave && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                Draft / Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Ctrl+Enter</kbd> to send
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400 ml-1">Ctrl+S</kbd> to save
          </div>
        </div>

        {/* Request Header Bar */}
        <RequestHeader
          request={currentRequest}
          onChange={handleRequestChange}
          onSend={handleSend}
          onSave={handleSave}
          onExportCurl={() => setCurlModalState({ isOpen: true, mode: 'export' })}
          isLoading={isLoading}
          constants={constants}
          onSwitchConstant={handleSwitchConstant}
          onRequestSwitchConstant={handleRequestSwitchConstant}
          onOpenManageConstants={() => setIsConstantModalOpen(true)}
          isDirty={isCurrentDirty}
          autoSave={settings.autoSave}
          onToggleAutoSave={() => handleUpdateSettings({ autoSave: !settings.autoSave })}
          resolvedUrl={interpolate(currentRequest.url, currentRequest)}
        />

        {/* Split Container for Request & Response */}
        <div id="split-container" className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Left / Top: Request Editor */}
          <div style={{ width: (splitRatio * 100) + '%' }} className="h-full flex flex-col min-w-[280px]">
            <RequestEditor
              request={currentRequest}
              onChange={handleRequestChange}
            />
          </div>

          {/* Draggable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className="w-1.5 hover:w-1.5 bg-slate-800 hover:bg-sky-500 cursor-col-resize flex items-center justify-center transition-colors group select-none shrink-0 z-10"
          >
            <div className="w-0.5 h-6 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />
          </div>

          {/* Right / Bottom: Response Viewer */}
          <div style={{ width: ((1 - splitRatio) * 100) + '%' }} className="h-full flex flex-col min-w-[280px]">
            <ResponseViewer
              response={response}
              isLoading={isLoading}
              runs={responseHistoryMap[currentRequest.id] || []}
              selectedRunId={selectedRunIdMap[currentRequest.id]}
              onSelectRun={(runId) => setSelectedRunIdMap((prev) => ({ ...prev, [currentRequest.id]: runId }))}
              onOpenUrlInRelay={handleOpenUrlInRelay}
              requestUrl={interpolate(currentRequest.url)}
              requestMethod={currentRequest.method}
              requestName={currentRequest.name}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {isConstantModalOpen && (
        <ConstantManagerModal
          isOpen={isConstantModalOpen}
          constants={constants}
          onClose={() => setIsConstantModalOpen(false)}
          onSave={handleSaveConstants}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          settings={settings}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {isEnvModalOpen && (
        <EnvironmentModal
          isOpen={isEnvModalOpen}
          environments={environments}
          activeEnvId={activeEnvId}
          onClose={() => setIsEnvModalOpen(false)}
          onSave={(envs, activeId) => {
            setEnvironments(envs)
            setActiveEnvId(activeId)
            persist({ environments: envs, activeEnvironmentId: activeId })
            addToast('Environment settings saved', 'success')
          }}
        />
      )}

      {curlModalState.isOpen && (
        <CurlModal
          isOpen={curlModalState.isOpen}
          mode={curlModalState.mode}
          currentRequest={{
            ...currentRequest,
            url: interpolate(currentRequest.url, currentRequest)
          }}
          onClose={() => setCurlModalState({ isOpen: false, mode: 'import' })}
          onImport={(parsed) => {
            const next = {
              ...currentRequest,
              ...parsed,
              name: parsed.url ? 'cURL: ' + parsed.url.slice(0, 30) : currentRequest.name
            }
            handleRequestChange(next)
            addToast('cURL imported successfully!', 'success')
          }}
        />
      )}
    </div>
  )
}