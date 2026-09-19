import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { RequestHeader } from './components/RequestHeader'
import { RequestEditor } from './components/RequestEditor'
import { ResponseViewer } from './components/ResponseViewer'
import { EnvironmentModal } from './components/EnvironmentModal'
import { CurlModal } from './components/CurlModal'
import { ConstantManagerModal } from './components/ConstantManagerModal'
import { SettingsModal, AppSettings } from './components/SettingsModal'
import { DataTransferModal } from './components/DataTransferModal'
import { TabBar } from './components/TabBar'
import { CommandPaletteModal } from './components/CommandPaletteModal'
import { CodeSnippetModal } from './components/CodeSnippetModal'
import { CollectionRunnerModal } from './components/CollectionRunnerModal'
import { ToastContainer, ToastMessage } from './components/Toast'
import { RequestItem, CollectionItem, HistoryItem, Environment, ResponseData, ConstantItem, ResponseRun, Language, Theme, WorkspaceTab } from './types'
import { stripJsonComments } from './utils/jsonUtils'
import { mergeCollections, mergeConstants, mergeEnvironments, ParsedImportData } from './utils/dataTransferUtils'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './theme'
import { Sun, Moon } from 'lucide-react'
import {
  findCollectionInTree,
  findRequestInTree,
  updateRequestInTree,
  addRequestToCollection,
  deleteRequestFromTree,
  renameRequestInTree,
  duplicateRequestInTree,
  addSubCollection,
  renameCollectionInTree,
  deleteCollectionFromTree,
  duplicateCollectionInTree,
  moveCollectionInTree,
  moveRequestInTree,
  collectAllRequests
} from './utils/collectionTree'

const initialConstants: ConstantItem[] = [
  {
    id: 'c-server',
    name: 'server',
    currentValue: 'http://localhost',
    options: ['http://localhost', 'http://127.0.0.1', 'http://192.168.1.100', 'https://api.dev.local'],
    optionNotes: {
      'http://localhost': '本地',
      'http://127.0.0.1': '回环地址',
      'http://192.168.1.100': '局域网测试',
      'https://api.dev.local': '开发域名'
    },
    description: 'Target server host/IP'
  },
  {
    id: 'c-port',
    name: 'port',
    currentValue: '8080',
    options: ['3000', '8080', '8000', '5000', '9000'],
    optionNotes: {
      '3000': '前端开发端口',
      '8080': '默认后台端口',
      '8000': '网关端口'
    },
    description: 'Server listening port'
  },
  {
    id: 'c-baseurl',
    name: 'baseUrl',
    currentValue: 'https://jsonplaceholder.typicode.com',
    options: ['https://jsonplaceholder.typicode.com', 'https://api.github.com'],
    optionNotes: {
      'https://jsonplaceholder.typicode.com': '测试API',
      'https://api.github.com': 'GitHub开放API'
    },
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
  maxResponsesPerRequest: 5,
  language: 'zh-CN',
  theme: 'dark',
  enableMultiTabs: true
}

function MainApp({
  onLanguageChange,
  onThemeChange
}: {
  onLanguageChange: (lang: Language) => void
  onThemeChange: (theme: Theme) => void
}) {
  const { t } = useI18n()
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

  // Multi-Tabs State
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    {
      id: 'tab-' + defaultNewRequest.id,
      requestId: defaultNewRequest.id,
      name: defaultNewRequest.name,
      method: defaultNewRequest.method,
      isDirty: false
    }
  ])
  const [activeTabId, setActiveTabId] = useState<string>('tab-' + defaultNewRequest.id)

  // Per-request response runs history (Preserves responses across switching APIs and app restarts)
  const [responseHistoryMap, setResponseHistoryMap] = useState<Record<string, ResponseRun[]>>({})
  const [selectedRunIdMap, setSelectedRunIdMap] = useState<Record<string, string>>({})

  // Modals
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false)
  const [isConstantModalOpen, setIsConstantModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isCodeSnippetOpen, setIsCodeSnippetOpen] = useState(false)
  const [curlModalState, setCurlModalState] = useState<{ isOpen: boolean; mode: 'import' | 'export' }>({
    isOpen: false,
    mode: 'import'
  })
  const [dataTransferState, setDataTransferState] = useState<{
    isOpen: boolean
    initialTab: 'export' | 'import'
    targetColId?: string
  }>({
    isOpen: false,
    initialTab: 'export'
  })
  const [runnerState, setRunnerState] = useState<{
    isOpen: boolean
    title: string
    requests: RequestItem[]
  }>({
    isOpen: false,
    title: '',
    requests: []
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
            if (data.settings.language) {
              onLanguageChange(data.settings.language)
            }
            if (data.settings.theme) {
              onThemeChange(data.settings.theme)
            }
          }
          if (data.activeEnvironmentId) setActiveEnvId(data.activeEnvironmentId)
          if (data.responseHistoryMap) {
            setResponseHistoryMap(data.responseHistoryMap)
          }
          if (data.collections?.[0]?.requests?.[0]) {
            const initialReq = JSON.parse(JSON.stringify(data.collections[0].requests[0]))
            setCurrentRequest(initialReq)
            const initialTab: WorkspaceTab = {
              id: 'tab-' + initialReq.id,
              requestId: initialReq.id,
              name: initialReq.name,
              method: initialReq.method,
              isDirty: false
            }
            setTabs([initialTab])
            setActiveTabId(initialTab.id)
            if (data.responseHistoryMap?.[initialReq.id]?.[0]) {
              setResponse(data.responseHistoryMap[initialReq.id][0].response)
            }
          }
        }
      })
    }
  }, [])

  // Keep active tab in sync with currentRequest
  useEffect(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              requestId: currentRequest.id,
              name: currentRequest.name,
              method: currentRequest.method,
              isDirty: dirtyIds.has(currentRequest.id)
            }
          : t
      )
    )
  }, [currentRequest.id, currentRequest.name, currentRequest.method, dirtyIds, activeTabId])

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
      const { updated, found } = updateRequestInTree(prevCols, req)
      if (found) {
        persist({ collections: updated })
        return updated
      }
      return prevCols
    })
  }

  // Switching APIs from Sidebar or Command Palette (Preserves all unsaved modifications via drafts & retains response history)
  const handleSelectRequest = (targetReq: RequestItem) => {
    // If there is an unsaved working draft for this request, load the draft!
    const reqToLoad = drafts[targetReq.id] || targetReq
    setCurrentRequest(JSON.parse(JSON.stringify(reqToLoad)))

    // Load active response for this request if any
    const existingRuns = responseHistoryMap[targetReq.id] || []
    const selectedRunId = selectedRunIdMap[targetReq.id]
    const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
    setResponse(activeRun ? activeRun.response : null)

    // Manage Multi-Tabs
    if (settings.enableMultiTabs !== false) {
      setTabs((prev) => {
        const existingTab = prev.find((t) => t.requestId === targetReq.id)
        if (existingTab) {
          setActiveTabId(existingTab.id)
          return prev
        }
        const newTab: WorkspaceTab = {
          id: 'tab-' + targetReq.id + '-' + Date.now(),
          requestId: targetReq.id,
          name: targetReq.name,
          method: targetReq.method,
          isDirty: dirtyIds.has(targetReq.id)
        }
        setActiveTabId(newTab.id)
        return [...prev, newTab]
      })
    }
  }

  // Multi-Tab Handlers
  const handleSelectTab = (tabId: string) => {
    const targetTab = tabs.find((t) => t.id === tabId)
    if (!targetTab) return
    setActiveTabId(tabId)

    if (drafts[targetTab.requestId]) {
      setCurrentRequest(JSON.parse(JSON.stringify(drafts[targetTab.requestId])))
      return
    }

    const found = findRequestInTree(collections, targetTab.requestId)
    if (found) {
      setCurrentRequest(JSON.parse(JSON.stringify(found.request)))
      const existingRuns = responseHistoryMap[found.request.id] || []
      const selectedRunId = selectedRunIdMap[found.request.id]
      const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
      setResponse(activeRun ? activeRun.response : null)
    }
  }

  const handleCloseTab = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId)
    if (tabIndex === -1) return

    const remaining = tabs.filter((t) => t.id !== tabId)
    if (remaining.length === 0) {
      const freshReq: RequestItem = {
        ...defaultNewRequest,
        id: 'req-' + Date.now(),
        name: 'New Request'
      }
      const freshTab: WorkspaceTab = {
        id: 'tab-' + freshReq.id,
        requestId: freshReq.id,
        name: freshReq.name,
        method: freshReq.method
      }
      setTabs([freshTab])
      setActiveTabId(freshTab.id)
      setCurrentRequest(freshReq)
      setResponse(null)
      return
    }

    setTabs(remaining)
    if (activeTabId === tabId) {
      const nextTab = remaining[Math.min(tabIndex, remaining.length - 1)]
      setActiveTabId(nextTab.id)
      handleSelectTab(nextTab.id)
    }
  }

  const handleCloseOtherTabs = (tabId: string) => {
    const current = tabs.find((t) => t.id === tabId)
    if (!current) return
    setTabs([current])
    setActiveTabId(current.id)
    handleSelectTab(current.id)
  }

  const handleCloseTabsToRight = (tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId)
    if (idx === -1) return
    const remaining = tabs.slice(0, idx + 1)
    setTabs(remaining)
    if (!remaining.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabId)
      handleSelectTab(tabId)
    }
  }

  const handleCloseAllTabs = () => {
    const freshReq: RequestItem = {
      ...defaultNewRequest,
      id: 'req-' + Date.now(),
      name: 'New Request'
    }
    const freshTab: WorkspaceTab = {
      id: 'tab-' + freshReq.id,
      requestId: freshReq.id,
      name: freshReq.name,
      method: freshReq.method
    }
    setTabs([freshTab])
    setActiveTabId(freshTab.id)
    setCurrentRequest(freshReq)
    setResponse(null)
  }

  const handleNewTab = () => {
    const newReq: RequestItem = {
      ...defaultNewRequest,
      id: 'req-' + Date.now(),
      name: 'New Request'
    }
    const newTab: WorkspaceTab = {
      id: 'tab-' + newReq.id,
      requestId: newReq.id,
      name: newReq.name,
      method: newReq.method
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
    setCurrentRequest(newReq)
    setResponse(null)
  }

  // Switch constant current value directly (Global)
  const handleSwitchConstant = (name: string, value: string) => {
    const next = constants.map((c) => (c.name === name ? { ...c, currentValue: value } : c))
    setConstants(next)
    persist({ constants: next })
    addToast(t('sidebar.switchActiveValue') + ` {{${name}}} -> ${value}`, 'info')
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
      addToast(`{{${name}}} -> ${t('header.followGlobalDefault')}`, 'info')
    } else {
      addToast(`{{${name}}} = ${value} (${t('header.exclusiveValue')})`, 'success')
    }
  }

  // Save updated constants from modal
  const handleSaveConstants = (updated: ConstantItem[]) => {
    setConstants(updated)
    persist({ constants: updated })
    addToast(t('toast.constantsUpdated'), 'success')
  }

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const next = { ...settings, ...newSettings }
    setSettings(next)
    if (newSettings.language) {
      onLanguageChange(newSettings.language)
    }
    if (newSettings.theme) {
      onThemeChange(newSettings.theme)
    }

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

    if ((newSettings.language || newSettings.theme) && Object.keys(newSettings).length === 1) {
      addToast(t('toast.settingsSaved'), 'success')
      return
    }

    if (next.autoSave) {
      // When turning on auto-save, automatically save current dirty requests
      if (dirtyIds.has(currentRequest.id)) {
        syncToCollections(currentRequest)
        setDirtyIds(new Set())
      }
      addToast(t('toast.autoSaveOn'), 'success')
    } else {
      addToast(t('toast.autoSaveOff'), 'info')
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

  // Open Collection Runner for entire collection (and its children)
  const handleRunCollection = (col: CollectionItem) => {
    const allReqs = collectAllRequests(col)
    if (allReqs.length === 0) {
      addToast(t('runner.noRequests'), 'info')
      return
    }
    setRunnerState({
      isOpen: true,
      title: col.name,
      requests: allReqs
    })
  }

  // Open Runner for selected requests
  const handleRunSelectedRequests = (reqs: RequestItem[], title: string) => {
    if (reqs.length === 0) return
    setRunnerState({
      isOpen: true,
      title: title || `${reqs.length} Requests`,
      requests: reqs
    })
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

    const processedUrl = interpolate(currentRequest.url.trim(), currentRequest)
    const processedHeaders = (currentRequest.headers || []).map((h) => ({
      ...h,
      key: interpolate(h.key, currentRequest),
      value: interpolate(h.value, currentRequest)
    }))
    const processedParams = (currentRequest.params || []).map((p) => ({
      ...p,
      key: interpolate(p.key, currentRequest),
      value: interpolate(p.value, currentRequest)
    }))
    const processedBodyRaw = interpolate(currentRequest.bodyRaw || '', currentRequest)

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
    const { updated, found } = updateRequestInTree(collections, currentRequest)
    if (found) {
      setCollections(updated)
      persist({ collections: updated })
      // Clear dirty flag
      setDirtyIds((prev) => {
        const next = new Set(prev)
        next.delete(currentRequest.id)
        return next
      })
      addToast(t('toast.requestSaved'), 'success')
    } else {
      if (collections.length === 0) {
        const newCol: CollectionItem = {
          id: 'col-' + Date.now(),
          name: 'My Collection',
          requests: [JSON.parse(JSON.stringify(currentRequest))],
          children: []
        }
        const updatedCols = [newCol]
        setCollections(updatedCols)
        persist({ collections: updatedCols })
        setDirtyIds((prev) => {
          const next = new Set(prev)
          next.delete(currentRequest.id)
          return next
        })
        addToast(t('toast.collectionCreated', { name: 'My Collection' }), 'success')
      } else {
        const target = collections[0]
        const updatedCols = addRequestToCollection(
          collections,
          target.id,
          JSON.parse(JSON.stringify(currentRequest))
        )
        setCollections(updatedCols)
        persist({ collections: updatedCols })
        setDirtyIds((prev) => {
          const next = new Set(prev)
          next.delete(currentRequest.id)
          return next
        })
        addToast(t('toast.requestSaved'), 'success')
      }
    }
  }

  // Rename Collection or Sub-collection
  const handleRenameCollection = (colId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const next = renameCollectionInTree(collections, colId, trimmed)
    setCollections(next)
    persist({ collections: next })
    addToast(t('toast.collectionRenamed', { name: trimmed }), 'success')
  }

  // Duplicate Collection or Sub-collection
  const handleDuplicateCollection = (colId: string) => {
    const target = findCollectionInTree(collections, colId)
    if (!target) return
    const next = duplicateCollectionInTree(collections, colId)
    setCollections(next)
    persist({ collections: next })
    addToast(t('toast.collectionDuplicated'), 'success')
  }

  // Delete Collection or Sub-collection
  const handleDeleteCollection = (colId: string) => {
    const next = deleteCollectionFromTree(collections, colId)
    setCollections(next)
    persist({ collections: next })
    addToast(t('toast.collectionDeleted'), 'info')
  }

  // Add new request into specific collection or sub-collection
  const handleNewRequestInCollection = (colId: string, name = 'New Request') => {
    const newReq: RequestItem = {
      ...defaultNewRequest,
      id: 'req-' + Date.now(),
      name
    }
    const next = addRequestToCollection(collections, colId, newReq)
    setCollections(next)
    persist({ collections: next })
    setCurrentRequest(newReq)
    setResponse(null)
    addToast(t('toast.requestAdded'), 'success')
  }

  // Add new sub-collection into a parent collection
  const handleCreateSubCollection = (parentColId: string, name = 'New Sub-collection') => {
    const newSubCol: CollectionItem = {
      id: 'col-' + Date.now(),
      name,
      requests: [],
      children: []
    }
    const next = addSubCollection(collections, parentColId, newSubCol)
    setCollections(next)
    persist({ collections: next })
    addToast(t('toast.subCollectionCreated', { name }), 'success')
  }

  // Rename Request in any collection/sub-collection
  const handleRenameRequest = (colId: string, reqId: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const next = renameRequestInTree(collections, colId, reqId, trimmed)
    setCollections(next)
    persist({ collections: next })
    if (currentRequest.id === reqId) {
      setCurrentRequest((prev) => ({ ...prev, name: trimmed }))
    }
    addToast(t('toast.requestRenamed', { name: trimmed }), 'success')
  }

  // Duplicate Request in any collection/sub-collection
  const handleDuplicateRequest = (colId: string, reqId: string) => {
    const { updated, duplicatedReq } = duplicateRequestInTree(collections, colId, reqId)
    if (duplicatedReq) {
      setCollections(updated)
      persist({ collections: updated })
      setCurrentRequest(duplicatedReq)
      addToast(t('toast.requestDuplicated'), 'success')
    }
  }

  // Delete Request from any collection/sub-collection
  const handleDeleteRequest = (colId: string, reqId: string) => {
    const next = deleteRequestFromTree(collections, colId, reqId)
    setCollections(next)
    persist({ collections: next })
    addToast(t('toast.requestDeleted'), 'info')
  }

  // Move Request (supports moving across any collections/sub-collections or reordering within the same collection)
  const handleMoveRequest = (
    sourceColId: string,
    targetColId: string,
    reqId: string,
    targetIndex?: number
  ) => {
    const next = moveRequestInTree(collections, sourceColId, targetColId, reqId, targetIndex)
    setCollections(next)
    persist({ collections: next })
    const targetCol = findCollectionInTree(collections, targetColId)
    if (sourceColId !== targetColId && targetCol) {
      addToast(t('toast.requestMoved', { name: targetCol.name }), 'success')
    }
  }

  // Move Collection (supports reordering before/after, or nesting inside another collection as sub-collection)
  const handleMoveCollection = (
    sourceColId: string,
    targetColId: string | null,
    position: 'before' | 'after' | 'inside'
  ) => {
    const sourceCol = findCollectionInTree(collections, sourceColId)
    if (!sourceCol) return
    const next = moveCollectionInTree(collections, sourceColId, targetColId, position)
    setCollections(next)
    persist({ collections: next })
    if (targetColId && position === 'inside') {
      const targetCol = findCollectionInTree(collections, targetColId)
      addToast(t('toast.collectionMoved', { name: sourceCol.name, target: targetCol?.name || 'Collection' }), 'success')
    } else {
      addToast(t('toast.collectionReordered', { name: sourceCol.name }), 'success')
    }
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
      const cleanJson = stripJsonComments(interpolate(req.bodyRaw, req))
      curl += ` \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '${cleanJson.replace(/'/g, "'\\''")}'`
    }
    navigator.clipboard.writeText(curl)
    addToast(t('toast.curlCopied'), 'success')
  }

  // Quick copy URL
  const handleCopyUrl = (url: string) => {
    if (!url) return
    navigator.clipboard.writeText(interpolate(url))
    addToast(t('toast.urlCopied'), 'success')
  }

  // Import Data Handler (Merge or Overwrite)
  const handleImportData = (parsed: ParsedImportData, mode: 'merge' | 'overwrite') => {
    if (mode === 'overwrite') {
      const updates: any = {}
      if (parsed.collections) {
        setCollections(parsed.collections)
        updates.collections = parsed.collections
        if (parsed.collections[0]?.requests?.[0]) {
          const req = JSON.parse(JSON.stringify(parsed.collections[0].requests[0]))
          setCurrentRequest(req)
          setResponse(null)
        }
      }
      if (parsed.constants && parsed.constants.length > 0) {
        setConstants(parsed.constants)
        updates.constants = parsed.constants
      }
      if (parsed.environments) {
        setEnvironments(parsed.environments)
        updates.environments = parsed.environments
      }
      if (parsed.settings) {
        setSettings((prev) => ({ ...prev, ...parsed.settings }))
        updates.settings = parsed.settings
        if (parsed.settings.language) {
          onLanguageChange(parsed.settings.language)
        }
        if (parsed.settings.theme) {
          onThemeChange(parsed.settings.theme)
        }
      }
      persist(updates)
      addToast(t('toast.dataImported'), 'success')
      return
    }

    // Merge Mode
    const updates: any = {}
    if (parsed.collections && parsed.collections.length > 0) {
      const nextCols = mergeCollections(collections, parsed.collections)
      setCollections(nextCols)
      updates.collections = nextCols
      // If current request was empty, load the first imported request
      if (!currentRequest.url && parsed.collections[0]?.requests?.[0]) {
        setCurrentRequest(JSON.parse(JSON.stringify(parsed.collections[0].requests[0])))
      }
    }
    if (parsed.constants && parsed.constants.length > 0) {
      const nextConstants = mergeConstants(constants, parsed.constants)
      setConstants(nextConstants)
      updates.constants = nextConstants
    }
    if (parsed.environments && parsed.environments.length > 0) {
      const nextEnvs = mergeEnvironments(environments, parsed.environments)
      setEnvironments(nextEnvs)
      updates.environments = nextEnvs
    }
    persist(updates)
    addToast(t('toast.dataImported'), 'success')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+P: Quick Open Command Palette
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
      // Ctrl+D: Duplicate current request
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const found = findRequestInTree(collections, currentRequest.id)
        if (found) {
          handleDuplicateRequest(found.col.id, currentRequest.id)
        } else {
          const cloned: RequestItem = {
            ...currentRequest,
            id: 'req-' + Date.now(),
            name: currentRequest.name + ' (Copy)'
          }
          setCurrentRequest(cloned)
          if (settings.enableMultiTabs !== false) {
            const newTab: WorkspaceTab = {
              id: 'tab-' + cloned.id,
              requestId: cloned.id,
              name: cloned.name,
              method: cloned.method
            }
            setTabs((prev) => [...prev, newTab])
            setActiveTabId(newTab.id)
          }
          addToast(t('toast.requestDuplicatedViaShortcut'), 'success')
        }
      }
      // Ctrl+T: New Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault()
        handleNewTab()
      }
      // Ctrl+W: Close Active Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (settings.enableMultiTabs !== false) {
          handleCloseTab(activeTabId)
        }
      }
      // Ctrl+,: Open Settings Modal
      else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsModalOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentRequest, collections, activeTabId, settings.enableMultiTabs])

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
          addToast(t('toast.collectionCreated', { name }), 'success')
        }}
        onRenameCollection={handleRenameCollection}
        onDuplicateCollection={handleDuplicateCollection}
        onDeleteCollection={handleDeleteCollection}
        onCreateSubCollection={handleCreateSubCollection}
        onMoveCollection={handleMoveCollection}
        onNewRequestInCollection={handleNewRequestInCollection}
        onRenameRequest={handleRenameRequest}
        onDuplicateRequest={handleDuplicateRequest}
        onDeleteRequest={handleDeleteRequest}
        onMoveRequest={handleMoveRequest}
        onCopyRequestCurl={handleCopyRequestCurl}
        onCopyUrl={handleCopyUrl}
        onClearHistory={() => {
          setHistory([])
          persist({ history: [] })
          addToast(t('toast.historyCleared'), 'info')
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
        onOpenDataTransfer={(tab, colId) =>
          setDataTransferState({
            isOpen: true,
            initialTab: tab || 'export',
            targetColId: colId
          })
        }
        onRunCollection={handleRunCollection}
        onRunRequests={handleRunSelectedRequests}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900/50">
        {/* Workspace Top Bar (Multi-Tabs or Breadcrumb Status) */}
        {settings.enableMultiTabs !== false ? (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onCloseOtherTabs={handleCloseOtherTabs}
            onCloseTabsToRight={handleCloseTabsToRight}
            onCloseAllTabs={handleCloseAllTabs}
            onNewTab={handleNewTab}
            extraRight={
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={() => handleUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors"
                  title={t('common.toggleTheme')}
                >
                  {settings.theme === 'light' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-medium">{t('settings.themeLight')}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-[10px] font-medium">{t('settings.themeDark')}</span>
                    </>
                  )}
                </button>
                <span className="text-slate-700">|</span>
                <kbd
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 hover:text-sky-300 cursor-pointer rounded border border-slate-700 font-mono text-slate-400 transition-colors"
                  title={t('shortcuts.quickOpen')}
                >
                  Ctrl+P
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Ctrl+Enter</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Ctrl+S</kbd>
              </div>
            }
          />
        ) : (
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
              <button
                type="button"
                onClick={() => handleUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 transition-colors"
                title={t('common.toggleTheme')}
              >
                {settings.theme === 'light' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-medium">{t('settings.themeLight')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px] font-medium">{t('settings.themeDark')}</span>
                  </>
                )}
              </button>
              <span className="text-slate-700">|</span>
              <kbd
                onClick={() => setIsCommandPaletteOpen(true)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 hover:text-sky-300 cursor-pointer rounded border border-slate-700 font-mono text-slate-400 transition-colors"
                title={t('shortcuts.quickOpen')}
              >
                Ctrl+P
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Ctrl+Enter</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400 ml-1">Ctrl+S</kbd>
            </div>
          </div>
        )}

        {/* Request Header Bar */}
        <RequestHeader
          request={currentRequest}
          onChange={handleRequestChange}
          onSend={handleSend}
          onSave={handleSave}
          onExportCurl={() => setCurlModalState({ isOpen: true, mode: 'export' })}
          onOpenCodeSnippet={() => setIsCodeSnippetOpen(true)}
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
          onOpenDataTransfer={() =>
            setDataTransferState({
              isOpen: true,
              initialTab: 'export'
            })
          }
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
            addToast(t('toast.envSaved'), 'success')
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
            addToast(t('toast.curlImported'), 'success')
          }}
        />
      )}

      {dataTransferState.isOpen && (
        <DataTransferModal
          isOpen={dataTransferState.isOpen}
          initialTab={dataTransferState.initialTab}
          selectedCollectionId={dataTransferState.targetColId}
          collections={collections}
          constants={constants}
          environments={environments}
          settings={settings}
          onClose={() => setDataTransferState((prev) => ({ ...prev, isOpen: false }))}
          onImport={handleImportData}
          onExportToast={(msg) => addToast(msg, 'success')}
        />
      )}

      {isCommandPaletteOpen && (
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          collections={collections}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectRequest={handleSelectRequest}
        />
      )}

      {isCodeSnippetOpen && (
        <CodeSnippetModal
          isOpen={isCodeSnippetOpen}
          request={currentRequest}
          resolvedUrl={interpolate(currentRequest.url, currentRequest)}
          onClose={() => setIsCodeSnippetOpen(false)}
          onToast={(msg) => addToast(msg, 'success')}
        />
      )}

      {runnerState.isOpen && (
        <CollectionRunnerModal
          isOpen={runnerState.isOpen}
          title={runnerState.title}
          requests={runnerState.requests}
          constants={constants}
          environments={environments}
          activeEnvId={activeEnvId}
          settings={settings}
          onClose={() => setRunnerState((prev) => ({ ...prev, isOpen: false }))}
          onToast={(msg, type) => addToast(msg, type || 'success')}
        />
      )}
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useState<Language>('zh-CN')
  const [theme, setTheme] = useState<Theme>('dark')

  return (
    <I18nProvider language={language} onLanguageChange={setLanguage}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <MainApp onLanguageChange={setLanguage} onThemeChange={setTheme} />
      </ThemeProvider>
    </I18nProvider>
  )
}