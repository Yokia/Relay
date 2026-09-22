import React, { useState, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { RequestHeader } from './components/RequestHeader'
import { RequestEditor } from './components/RequestEditor'
import { ResponseViewer } from './components/ResponseViewer'
import { EnvironmentModal } from './components/EnvironmentModal'
import { CurlModal } from './components/CurlModal'
import { ConstantManagerModal } from './components/ConstantManagerModal'
import { SettingsModal, AppSettings, SettingCategory } from './components/SettingsModal'
import { DataTransferModal } from './components/DataTransferModal'
import { TabBar } from './components/TabBar'
import { CommandPaletteModal } from './components/CommandPaletteModal'
import { CodeSnippetModal } from './components/CodeSnippetModal'
import { CollectionRunnerModal } from './components/CollectionRunnerModal'
import { DevToysModal } from './components/DevToysModal'
import { ChangelogModal } from './components/ChangelogModal'
import { UpdateModal } from './components/UpdateModal'
import { APP_VERSION } from './data/changelog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer, ToastMessage } from './components/Toast'
import { RequestItem, CollectionItem, HistoryItem, Environment, ResponseData, ConstantItem, ResponseRun, Language, Theme, WorkspaceTab, UpdateCheckResult } from './types'
import { stripJsonComments } from './utils/jsonUtils'
import { mergeCollections, mergeConstants, mergeEnvironments, ParsedImportData } from './utils/dataTransferUtils'
import { executePreRequestScript, executeTestScript } from './utils/scriptEngine'
import { queryJsonPath } from './utils/jsonPath'
import { parseUrlToParams, buildUrlWithParams, areParamsEquivalent } from './utils/urlParamsUtils'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './theme'
import { createDefaultHeaders } from './utils/headerConstants'
import { Sun, Moon, Search, History, Zap, HelpCircle, Sparkles } from 'lucide-react'
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
  moveRequestsInTree,
  collectAllRequests,
  findRequestCollectionPath
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
  headers: createDefaultHeaders(),
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
  enableMultiTabs: true,
  responseStorageLimitMB: 100
}

const stripLargeMediaFromResponseRuns = (runsMap: Record<string, ResponseRun[]>): Record<string, ResponseRun[]> => {
  const result: Record<string, ResponseRun[]> = {}
  if (!runsMap || typeof runsMap !== 'object') return result
  Object.entries(runsMap).forEach(([requestId, runs]) => {
    const safeRuns = Array.isArray(runs) ? runs : []
    result[requestId] = safeRuns.map((run) => {
      const contentType = (run?.response?.contentType || '').toLowerCase().split(';')[0]
      const isMedia = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/') || contentType === 'application/pdf'
      const isLarge = isMedia && typeof run?.response?.data === 'string' && run.response.data.length > 1024 * 1024
      return isLarge ? { ...run, response: { ...run.response, data: null } } : run
    })
  })
  return result
}

// Helper to ensure clean, non-circular request clone
const cloneCleanRequest = (r: RequestItem): RequestItem => {
  let params = Array.isArray(r.params)
    ? r.params.map((p) => ({
        key: String(p.key || ''),
        value: String(p.value || ''),
        enabled: Boolean(p.enabled),
        description: p.description
      }))
    : []

  if (r.url && r.url.includes('?') && params.length === 0) {
    params = parseUrlToParams(r.url, params)
  }

  return {
    id: r.id || ('req-' + Date.now()),
    name: r.name || 'Request',
    method: r.method || 'GET',
    url: r.url || '',
    params,
    headers: Array.isArray(r.headers) ? r.headers.map((h) => ({ key: String(h.key || ''), value: String(h.value || ''), enabled: Boolean(h.enabled), description: h.description })) : [],
    bodyType: r.bodyType || 'none',
    bodyRaw: typeof r.bodyRaw === 'string' ? r.bodyRaw : '',
    bodyFormData: Array.isArray(r.bodyFormData) ? r.bodyFormData : undefined,
    bodyUrlEncoded: Array.isArray(r.bodyUrlEncoded) ? r.bodyUrlEncoded : undefined,
    auth: r.auth ? { ...r.auth } : undefined,
    preRequestScript: r.preRequestScript || '',
    testScript: r.testScript || '',
    responseExtractions: Array.isArray(r.responseExtractions) ? r.responseExtractions : undefined,
    constantOverrides: r.constantOverrides ? { ...r.constantOverrides } : undefined
  }
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
  const [drafts, setDrafts] = useState<Record<string, RequestItem>>({
    [defaultNewRequest.id]: defaultNewRequest
  })
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())

  const [currentRequest, setCurrentRequest] = useState<RequestItem>(defaultNewRequest)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const restoreStoredResponse = (storedResponse: ResponseData | null) => {
    setResponse(storedResponse)
    const blobId = storedResponse?.blobId
    if (!blobId || !window.electronAPI?.getResponseBlob) return
    window.electronAPI.getResponseBlob(blobId).then((data: any) => {
      setResponse((current) => current?.blobId === blobId ? { ...current, data, blobId: undefined } : current)
    }).catch((err: any) => {
      console.error('Failed to load response blob:', err)
    })
  }

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
  // Keep a ref that always mirrors `tabs` — avoids stale closure bugs in event handlers
  const tabsRef = useRef<WorkspaceTab[]>(tabs)

  // Per-request response runs history (Preserves responses across switching APIs and app restarts)
  const [responseHistoryMap, setResponseHistoryMap] = useState<Record<string, ResponseRun[]>>({})
  const [selectedRunIdMap, setSelectedRunIdMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const runs = responseHistoryMap[currentRequest.id] || []
    const selectedRunId = selectedRunIdMap[currentRequest.id]
    const activeRun = runs.find((run) => run.id === selectedRunId) || runs[0]
    const blobId = activeRun?.response?.blobId
    if (!blobId || !window.electronAPI?.getResponseBlob) return
    window.electronAPI.getResponseBlob(blobId).then((data: any) => {
      setResponseHistoryMap((prev) => ({
        ...prev,
        [currentRequest.id]: (prev[currentRequest.id] || []).map((run) =>
          run.id === activeRun.id ? { ...run, response: { ...run.response, data, blobId: undefined } } : run
        )
      }))
    }).catch((err: any) => {
      console.error('Failed to load response history blob:', err)
    })
  }, [currentRequest.id, responseHistoryMap, selectedRunIdMap])

  const getTabDisplayName = (requestId: string, fallbackName: string) => {
    if (!settings.showCollectionPath) return fallbackName
    const path = findRequestCollectionPath(collections, requestId)
    return path && path.length > 0 ? `${path.join(' - ')} - ${fallbackName}` : fallbackName
  }

  // Modals
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false)
  const [isConstantModalOpen, setIsConstantModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState<SettingCategory | undefined>(undefined)

  // Auto-display changelog on version update
  useEffect(() => {
    try {
      const lastSeenVersion = localStorage.getItem('relay_last_seen_version')
      if (lastSeenVersion !== APP_VERSION) {
        setIsChangelogOpen(true)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleCloseChangelog = () => {
    setIsChangelogOpen(false)
    try {
      localStorage.setItem('relay_last_seen_version', APP_VERSION)
    } catch {
      // ignore
    }
  }
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isCodeSnippetOpen, setIsCodeSnippetOpen] = useState(false)
  const [curlModalState, setCurlModalState] = useState<{ isOpen: boolean; mode: 'import' | 'export' }>({
    isOpen: false,
    mode: 'import'
  })
  const [dataTransferState, setDataTransferState] = useState<{
    isOpen: boolean
    initialTab: 'export' | 'import'
    initialFormat?: 'json' | 'html' | 'markdown'
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
  const [isDevToysOpen, setIsDevToysOpen] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)

  // Toast Notification System
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  // Resizable split pane & sidebar
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('relay_split_ratio')
    return saved ? Math.max(0.2, Math.min(0.8, Number(saved))) : 0.5
  })
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('relay_sidebar_width')
    return saved ? Math.max(180, Math.min(600, Number(saved))) : 256
  })
  const splitRatioRef = useRef(splitRatio)
  const sidebarWidthRef = useRef(sidebarWidth)
  const isDraggingSplitRef = useRef(false)
  const isDraggingSidebarRef = useRef(false)
  const isLoadedRef = useRef(false)

  useEffect(() => {
    splitRatioRef.current = splitRatio
  }, [splitRatio])

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  // Load initial data from electron storage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI
        .getData()
        .then((data: any) => {
          if (data) {
            const normalizedResponseHistoryMap = data.responseHistoryMap
              ? stripLargeMediaFromResponseRuns(data.responseHistoryMap)
              : undefined
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
            if (normalizedResponseHistoryMap) {
              setResponseHistoryMap(normalizedResponseHistoryMap)
            }
            if (data.dirtyIds && Array.isArray(data.dirtyIds)) {
              setDirtyIds(new Set(data.dirtyIds))
            }
            if (typeof data.sidebarWidth === 'number' && data.sidebarWidth >= 180 && data.sidebarWidth <= 600) {
              setSidebarWidth(data.sidebarWidth)
              sidebarWidthRef.current = data.sidebarWidth
              localStorage.setItem('relay_sidebar_width', String(data.sidebarWidth))
            }
            if (typeof data.splitRatio === 'number' && data.splitRatio >= 0.2 && data.splitRatio <= 0.8) {
              setSplitRatio(data.splitRatio)
              splitRatioRef.current = data.splitRatio
              localStorage.setItem('relay_split_ratio', String(data.splitRatio))
            }

            const savedDrafts = data.drafts || {}
            if (data.drafts) {
              setDrafts(data.drafts)
            }

            // Restore previously opened tabs or fallback to default collection item
            const validTabs = (data.tabs && Array.isArray(data.tabs))
              ? data.tabs.filter((t: any) => t && t.id && t.requestId && t.requestId !== 'undefined')
              : []
            if (validTabs.length > 0) {
              setTabs(validTabs)
              const targetActiveTabId =
                data.activeTabId && validTabs.some((t: any) => t.id === data.activeTabId)
                  ? data.activeTabId
                  : validTabs[0].id
              setActiveTabId(targetActiveTabId)

              const targetTab = validTabs.find((t: any) => t.id === targetActiveTabId) || validTabs[0]
              let reqToLoad: RequestItem | undefined = savedDrafts[targetTab.requestId]

              if (!reqToLoad && data.collections) {
                const found = findRequestInTree(data.collections, targetTab.requestId)
                if (found) {
                  reqToLoad = found.request
                }
              }

              if (!reqToLoad) {
                reqToLoad = {
                  ...defaultNewRequest,
                  id: targetTab.requestId,
                  name: targetTab.name || 'New Request',
                  method: targetTab.method || 'GET'
                }
              }

              const cloned = cloneCleanRequest(reqToLoad)
              setCurrentRequest(cloned)
              setDrafts((prev) => ({ ...prev, [cloned.id]: cloned }))

              if (normalizedResponseHistoryMap?.[cloned.id]?.[0]) {
                restoreStoredResponse(normalizedResponseHistoryMap[cloned.id][0].response)
              } else {
                setResponse(null)
              }
            } else if (data.collections?.[0]?.requests?.[0]) {
              const initialReq = cloneCleanRequest(data.collections[0].requests[0])
              setCurrentRequest(initialReq)
              setDrafts({ [initialReq.id]: initialReq })
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
                restoreStoredResponse(data.responseHistoryMap[initialReq.id][0].response)
              }
            }
          }
          isLoadedRef.current = true
          setIsDataLoaded(true)
        })
        .catch((err: any) => {
          console.error('Failed to load initial data:', err)
          isLoadedRef.current = true
          setIsDataLoaded(true)
        })
    } else {
      isLoadedRef.current = true
      setIsDataLoaded(true)
    }
  }, [])

  // Debounced auto-persistence for tabs, activeTabId, drafts, dirty states, and layout areas
  useEffect(() => {
    if (!isLoadedRef.current) return

    const timer = setTimeout(() => {
      persist({
        tabs,
        activeTabId,
        drafts,
        dirtyIds: Array.from(dirtyIds),
        sidebarWidth,
        splitRatio
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [tabs, activeTabId, drafts, dirtyIds, sidebarWidth, splitRatio])

  // Save on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoadedRef.current && window.electronAPI) {
        window.electronAPI.saveData({
          tabs,
          activeTabId,
          drafts,
          dirtyIds: Array.from(dirtyIds),
          sidebarWidth: sidebarWidthRef.current,
          splitRatio: splitRatioRef.current
        })
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabs, activeTabId, drafts, dirtyIds])

  // Keep tab metadata (name, method, dirty state) in sync when a request is edited
  useEffect(() => {
    setTabs((prev) =>
      prev.map((t) =>
        (() => {
          const tabRequest = findRequestInTree(collections, t.requestId)?.request
          const isCurrent = t.requestId === currentRequest.id
          const baseName = tabRequest?.name || (isCurrent ? currentRequest.name : t.requestName || t.name)
          return {
            ...t,
            name: getTabDisplayName(t.requestId, baseName),
            requestName: baseName,
            method: tabRequest?.method || (isCurrent ? currentRequest.method : t.method),
            isDirty: dirtyIds.has(t.requestId)
          }
        })()
      )
    )
  }, [currentRequest.id, currentRequest.name, currentRequest.method, dirtyIds, collections, settings.showCollectionPath])

  // Keep tabsRef in sync with the latest tabs state
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  // Persist helper
  const persist = (updates: any) => {
    if (window.electronAPI) {
      window.electronAPI.saveData(updates)
    }
  }

  // Update request handler with draft and auto-save support, with bi-directional URL <-> Params synchronization
  const handleRequestChange = (updates: Partial<RequestItem>) => {
    if (!updates || typeof updates !== 'object' || 'nativeEvent' in (updates as any) || '_reactName' in (updates as any) || 'target' in (updates as any)) {
      return
    }
    setCurrentRequest((prev) => {
      let finalUpdates = { ...updates }

      // 1. Bi-directional sync: URL changed directly -> sync query string into params
      if (finalUpdates.url !== undefined && finalUpdates.params === undefined) {
        const syncedParams = parseUrlToParams(finalUpdates.url, prev.params || [])
        if (!areParamsEquivalent(prev.params || [], syncedParams)) {
          finalUpdates.params = syncedParams
        }
      }
      // 2. Bi-directional sync: Params changed directly -> sync params into URL
      else if (finalUpdates.params !== undefined && finalUpdates.url === undefined) {
        const syncedUrl = buildUrlWithParams(prev.url || '', finalUpdates.params)
        if (syncedUrl !== prev.url) {
          finalUpdates.url = syncedUrl
        }
      }

      const next = { ...prev, ...finalUpdates }
      // Record draft in memory immediately so switching APIs preserves it
      if (next.id) {
        setDrafts((prevDrafts) => ({ ...prevDrafts, [next.id]: next }))
      }

      if (settings.autoSave) {
        // Auto Save ON: write directly to collections and persist
        syncToCollections(next)
      } else if (next.id) {
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
    // 1. Save currently active request into drafts before switching
    if (currentRequest.id) {
      setDrafts((prev) => ({ ...prev, [currentRequest.id]: JSON.parse(JSON.stringify(currentRequest)) }))
    }

    // 2. If there is an unsaved working draft for this request, load the draft!
    const reqToLoad = drafts[targetReq.id] || targetReq
    const cloned = cloneCleanRequest(reqToLoad)
    setCurrentRequest(cloned)
    setDrafts((prev) => ({ ...prev, [cloned.id]: cloned }))

    // 3. Load active response for this request if any
    const existingRuns = responseHistoryMap[targetReq.id] || []
    const selectedRunId = selectedRunIdMap[targetReq.id]
    const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
    restoreStoredResponse(activeRun ? activeRun.response : null)

    // 4. Manage Multi-Tabs
    if (settings.enableMultiTabs !== false) {
      const currentTabs = tabsRef.current
      const existingTab = currentTabs.find((t) => t.requestId === targetReq.id)
      if (existingTab) {
        setActiveTabId(existingTab.id)
      } else {
        const newTab: WorkspaceTab = {
          id: 'tab-' + targetReq.id + '-' + Date.now(),
          requestId: targetReq.id,
          name: targetReq.name,
          method: targetReq.method,
          isDirty: dirtyIds.has(targetReq.id)
        }
        setTabs((prev) => [...prev, newTab])
        setActiveTabId(newTab.id)
      }
    } else {
      const singleTab: WorkspaceTab = {
        id: 'tab-' + targetReq.id,
        requestId: targetReq.id,
        name: targetReq.name,
        method: targetReq.method,
        isDirty: dirtyIds.has(targetReq.id)
      }
      setTabs([singleTab])
      setActiveTabId(singleTab.id)
    }
  }

  // Listen for requests and history sync from History Window
  useEffect(() => {
    if (window.electronAPI) {
      let unsub1: (() => void) | undefined
      let unsub2: (() => void) | undefined

      if (window.electronAPI.onLoadRequestFromHistory) {
        unsub1 = window.electronAPI.onLoadRequestFromHistory((req: RequestItem) => {
          if (req) {
            handleSelectRequest(req)
            addToast(t('historyWindow.loadedIntoWorkspace'), 'success')
          }
        })
      }

      if (window.electronAPI.onHistoryUpdated) {
        unsub2 = window.electronAPI.onHistoryUpdated((newHist: HistoryItem[]) => {
          if (Array.isArray(newHist)) {
            setHistory(newHist)
          }
        })
      }

      return () => {
        if (unsub1) unsub1()
        if (unsub2) unsub2()
      }
    }
  }, [handleSelectRequest, t])

  // Check for updates
  const handleCheckForUpdates = async (manual = false) => {
    if (!window.electronAPI?.checkForUpdates) return
    setIsCheckingUpdates(true)
    try {
      const res = await window.electronAPI.checkForUpdates()
      if (res && res.success) {
        if (res.updateAvailable) {
          setUpdateInfo(res)
          setIsUpdateModalOpen(true)
        } else if (manual) {
          addToast(t('updater.upToDate'), 'info')
        }
      } else if (manual) {
        addToast(res?.error || t('updater.downloadFailed'), 'error')
      }
    } catch (err: any) {
      if (manual) addToast(err.message || 'Check updates failed', 'error')
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  // Silent update check 3 seconds after app starts
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCheckForUpdates(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Multi-Tab Handlers
  const handleSelectTab = (tabId: string) => {
    const targetTab = tabsRef.current.find((t) => t.id === tabId)
    if (!targetTab) return

    // 1. Save currently active request into drafts before switching
    if (currentRequest.id) {
      setDrafts((prev) => ({ ...prev, [currentRequest.id]: JSON.parse(JSON.stringify(currentRequest)) }))
    }

    setActiveTabId(tabId)

    // 2. If present in drafts, load draft
    if (drafts[targetTab.requestId]) {
      const cloned = cloneCleanRequest(drafts[targetTab.requestId])
      setCurrentRequest(cloned)
      const existingRuns = responseHistoryMap[targetTab.requestId] || []
      const selectedRunId = selectedRunIdMap[targetTab.requestId]
      const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
      restoreStoredResponse(activeRun ? activeRun.response : null)
      return
    }

    // 3. Look up in collections tree
    const found = findRequestInTree(collections, targetTab.requestId)
    if (found) {
      const cloned = cloneCleanRequest(found.request)
      setCurrentRequest(cloned)
      setDrafts((prev) => ({ ...prev, [cloned.id]: cloned }))
      const existingRuns = responseHistoryMap[found.request.id] || []
      const selectedRunId = selectedRunIdMap[found.request.id]
      const activeRun = existingRuns.find((r) => r.id === selectedRunId) || existingRuns[0]
      restoreStoredResponse(activeRun ? activeRun.response : null)
      return
    }

    // 4. Fallback if request is not found in tree or drafts (e.g. pristine new request tab)
    const fallbackReq: RequestItem = {
      ...defaultNewRequest,
      id: targetTab.requestId,
      name: targetTab.name,
      method: targetTab.method,
      headers: createDefaultHeaders()
    }
    setDrafts((prev) => ({ ...prev, [targetTab.requestId]: fallbackReq }))
    setCurrentRequest(fallbackReq)
    setResponse(null)
  }

  const handleCloseTab = (tabId: string) => {
    const currentTabs = tabsRef.current
    const tabIndex = currentTabs.findIndex((t) => t.id === tabId)
    if (tabIndex === -1) return

    const remaining = currentTabs.filter((t) => t.id !== tabId)
    if (remaining.length === 0) {
      handleNewTab()
      return
    }

    setTabs(remaining)
    if (activeTabId === tabId) {
      const nextTab = remaining[Math.min(tabIndex, remaining.length - 1)]
      handleSelectTab(nextTab.id)
    }
  }

  const handleCloseOtherTabs = (tabId: string) => {
    const current = tabsRef.current.find((t) => t.id === tabId)
    if (!current) return
    setTabs([current])
    setActiveTabId(current.id)
    handleSelectTab(current.id)
  }

  const handleCloseTabsToRight = (tabId: string) => {
    const idx = tabsRef.current.findIndex((t) => t.id === tabId)
    if (idx === -1) return
    const remaining = tabsRef.current.slice(0, idx + 1)
    setTabs(remaining)
    if (!remaining.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabId)
      handleSelectTab(tabId)
    }
  }

  const handleCloseAllTabs = () => {
    const freshReq: RequestItem = {
      ...defaultNewRequest,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: 'New Request',
      headers: createDefaultHeaders()
    }
    const freshTab: WorkspaceTab = {
      id: 'tab-' + freshReq.id,
      requestId: freshReq.id,
      name: freshReq.name,
      method: freshReq.method,
      isDirty: false
    }
    setDrafts({ [freshReq.id]: freshReq })
    setTabs([freshTab])
    setActiveTabId(freshTab.id)
    setCurrentRequest(freshReq)
    setResponse(null)
  }

  const handleNewTab = (customReq?: unknown) => {
    const isValidReq = Boolean(
      customReq &&
      typeof customReq === 'object' &&
      !('nativeEvent' in (customReq as any)) &&
      !('_reactName' in (customReq as any)) &&
      !('target' in (customReq as any)) &&
      typeof (customReq as any).id === 'string' &&
      typeof (customReq as any).method === 'string'
    )
    const validCustomReq = isValidReq ? (customReq as RequestItem) : undefined

    if (currentRequest.id) {
      setDrafts((prev) => ({ ...prev, [currentRequest.id]: cloneCleanRequest(currentRequest) }))
    }

    const newReq: RequestItem = validCustomReq ? cloneCleanRequest(validCustomReq) : {
      ...defaultNewRequest,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: 'New Request',
      headers: createDefaultHeaders()
    }
    const newTab: WorkspaceTab = {
      id: 'tab-' + newReq.id,
      requestId: newReq.id,
      name: newReq.name,
      method: newReq.method,
      isDirty: false
    }
    setDrafts((prev) => ({ ...prev, [newReq.id]: newReq }))
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
      headers: createDefaultHeaders(),
      bodyType: 'none',
      bodyRaw: ''
    }
    handleNewTab(newReq)
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

    // 1. Run Pre-request script if present
    const activeEnv = activeEnvId ? environments.find((e) => e.id === activeEnvId) : environments[0]
    let effectiveRequest = { ...currentRequest }

    if (currentRequest.preRequestScript && currentRequest.preRequestScript.trim()) {
      const preResult = executePreRequestScript(currentRequest.preRequestScript, {
        request: currentRequest,
        activeEnv
      })

      if (preResult.modifiedRequest) {
        effectiveRequest = {
          ...effectiveRequest,
          ...preResult.modifiedRequest
        }
      }

      if (preResult.envUpdates && preResult.envUpdates.length > 0 && activeEnv) {
        setEnvironments((prevEnvs) => {
          const nextEnvs = prevEnvs.map((env) => {
            if (env.id !== activeEnv.id) return env
            const updatedVars = [...env.variables]
            preResult.envUpdates?.forEach((update) => {
              const existing = updatedVars.find((v) => v.key === update.key)
              if (existing) {
                existing.value = update.value
                existing.enabled = true
              } else {
                updatedVars.push({ key: update.key, value: update.value, enabled: true })
              }
            })
            return { ...env, variables: updatedVars }
          })
          persist({ environments: nextEnvs })
          return nextEnvs
        })
      }
    }

    const processedUrl = interpolate(effectiveRequest.url.trim(), effectiveRequest)
    const processedHeaders = (effectiveRequest.headers || []).map((h) => ({
      ...h,
      key: interpolate(h.key, effectiveRequest),
      value: interpolate(h.value, effectiveRequest)
    }))
    const processedParams = (effectiveRequest.params || []).map((p) => ({
      ...p,
      key: interpolate(p.key, effectiveRequest),
      value: interpolate(p.value, effectiveRequest)
    }))
    const processedBodyRaw = interpolate(effectiveRequest.bodyRaw || '', effectiveRequest)
    const processedAuth = effectiveRequest.auth
      ? {
          ...effectiveRequest.auth,
          token: interpolate(effectiveRequest.auth.token || '', effectiveRequest),
          username: interpolate(effectiveRequest.auth.username || '', effectiveRequest),
          password: interpolate(effectiveRequest.auth.password || '', effectiveRequest),
          key: interpolate(effectiveRequest.auth.key || '', effectiveRequest),
          value: interpolate(effectiveRequest.auth.value || '', effectiveRequest),
          tokenUrl: interpolate(effectiveRequest.auth.tokenUrl || '', effectiveRequest),
          clientId: interpolate(effectiveRequest.auth.clientId || '', effectiveRequest),
          clientSecret: interpolate(effectiveRequest.auth.clientSecret || '', effectiveRequest),
          scope: interpolate(effectiveRequest.auth.scope || '', effectiveRequest),
          accessToken: interpolate(effectiveRequest.auth.accessToken || '', effectiveRequest)
        }
      : undefined

    const payload = {
      method: effectiveRequest.method,
      url: processedUrl,
      headers: processedHeaders,
      params: processedParams,
      bodyType: effectiveRequest.bodyType,
      bodyRaw: processedBodyRaw,
      bodyUrlEncoded: effectiveRequest.bodyUrlEncoded,
      bodyFormData: effectiveRequest.bodyFormData,
      auth: processedAuth,
      timeout: settings.timeout || 30000,
      rejectUnauthorized: settings.sslVerify !== false
    }

    const maxRuns = settings.maxResponsesPerRequest || 5
    const reqId = currentRequest.id || ('req-' + Date.now())

    try {
      const res = await window.electronAPI.sendRequest(payload)
      const reqTimestamp = res.timestamp || Date.now()
      let fullRes: ResponseData = {
        ...res,
        timestamp: reqTimestamp
      }

      // Extract response values into the active environment for subsequent requests.
      if (effectiveRequest.responseExtractions?.length && activeEnv) {
        const extracted: { key: string; value: string }[] = []
        for (const rule of effectiveRequest.responseExtractions) {
          if (!rule.variable || !rule.path) continue
          const value = extractFromResponse(fullRes, rule.source, rule.path)
          if (value !== undefined && value !== null) extracted.push({ key: rule.variable, value: typeof value === 'string' ? value : JSON.stringify(value) })
        }
        if (extracted.length > 0) {
          setEnvironments((prevEnvs) => {
            const nextEnvs = prevEnvs.map((env) => {
              if (env.id !== activeEnv.id) return env
              const updatedVars = [...env.variables]
              for (const item of extracted) {
                const existing = updatedVars.find((v) => v.key === item.key)
                if (existing) {
                  existing.value = item.value
                  existing.enabled = true
                } else {
                  updatedVars.push({ key: item.key, value: item.value, enabled: true })
                }
              }
              return { ...env, variables: updatedVars }
            })
            persist({ environments: nextEnvs })
            return nextEnvs
          })
        }
      }

      // 2. Run Test script if present
      if (currentRequest.testScript && currentRequest.testScript.trim()) {
        const testResult = executeTestScript(currentRequest.testScript, {
          request: effectiveRequest,
          activeEnv,
          response: fullRes
        })

        fullRes = {
          ...fullRes,
          testResults: testResult.testResults
        }

        if (testResult.envUpdates && testResult.envUpdates.length > 0 && activeEnv) {
          setEnvironments((prevEnvs) => {
            const nextEnvs = prevEnvs.map((env) => {
              if (env.id !== activeEnv.id) return env
              const updatedVars = [...env.variables]
              testResult.envUpdates?.forEach((update) => {
                const existing = updatedVars.find((v) => v.key === update.key)
                if (existing) {
                  existing.value = update.value
                  existing.enabled = true
                } else {
                  updatedVars.push({ key: update.key, value: update.value, enabled: true })
                }
              })
              return { ...env, variables: updatedVars }
            })
            persist({ environments: nextEnvs })
            return nextEnvs
          })
        }
      }

      setResponse(fullRes)

      // Add to per-request response runs
      // Large response bodies are moved to response-blobs by the main process.
      // Keep the full response in memory for the current request and let storage
      // decide whether it should be externalized.
      const storedResponse = fullRes
      const newRun: ResponseRun = {
        id: 'run-' + reqTimestamp,
        timestamp: reqTimestamp,
        method: effectiveRequest.method,
        url: processedUrl,
        response: storedResponse
      }
      setResponseHistoryMap((prev) => {
        const currentRuns = prev[reqId] || []
        const updatedRuns = [newRun, ...currentRuns].slice(0, maxRuns)
        const updatedMap = { ...prev, [reqId]: updatedRuns }
        persist({ responseHistoryMap: updatedMap })
        return updatedMap
      })
      setSelectedRunIdMap((prev) => ({ ...prev, [reqId]: newRun.id }))

      // Append to global history with the original response structure. Large
      // response bodies are externalized by the main process instead of being
      // rewritten into a truncated preview object.
      const historyRequest: RequestItem = {
        ...cloneCleanRequest(effectiveRequest),
        url: processedUrl,
        headers: processedHeaders,
        params: processedParams,
        bodyRaw: processedBodyRaw
      }

      const newHistoryItem: HistoryItem = {
        id: 'hist-' + Date.now(),
        request: historyRequest,
        status: res.status,
        time: res.time,
        timestamp: Date.now(),
        response: res
      }
      const nextHistory = [newHistoryItem, ...history.slice(0, 49)]
      setHistory(nextHistory)
      persist({ history: nextHistory })
      if (window.electronAPI?.notifyHistoryUpdated) {
        window.electronAPI.notifyHistoryUpdated(nextHistory)
      }
    } catch (err: any) {
      const errTime = Date.now()
      const errRes: ResponseData = {
        status: 0,
        statusText: 'Client Error',
        headers: {},
        data: null,
        size: 0,
        time: 0,
        contentType: '',
        error: err.message || 'Unknown error occurred',
        timestamp: errTime
      }
      setResponse(errRes)

      const errRun: ResponseRun = {
        id: 'run-' + errTime,
        timestamp: errTime,
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

      const errHistoryItem: HistoryItem = {
        id: 'hist-' + Date.now(),
        request: {
          ...cloneCleanRequest(currentRequest),
          url: processedUrl,
          headers: processedHeaders,
          params: processedParams,
          bodyRaw: processedBodyRaw
        },
        status: 0,
        time: 0,
        timestamp: Date.now(),
        response: errRes
      }
      const nextHistory = [errHistoryItem, ...history.slice(0, 49)]
      setHistory(nextHistory)
      persist({ history: nextHistory })
      if (window.electronAPI?.notifyHistoryUpdated) {
        window.electronAPI.notifyHistoryUpdated(nextHistory)
      }
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
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name,
      headers: createDefaultHeaders()
    }
    const next = addRequestToCollection(collections, colId, newReq)
    setCollections(next)
    persist({ collections: next })
    handleSelectRequest(newReq)
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
    setTabs((prev) => prev.map((t) => (t.requestId === reqId ? { ...t, name: trimmed } : t)))
    addToast(t('toast.requestRenamed', { name: trimmed }), 'success')
  }

  // Duplicate Request in any collection/sub-collection
  const handleDuplicateRequest = (colId: string, reqId: string) => {
    const { updated, duplicatedReq } = duplicateRequestInTree(collections, colId, reqId)
    if (duplicatedReq) {
      setCollections(updated)
      persist({ collections: updated })
      handleSelectRequest(duplicatedReq)
      addToast(t('toast.requestDuplicated'), 'success')
    }
  }

  // Delete Request from any collection/sub-collection
  const handleDeleteRequest = (colId: string, reqId: string) => {
    const next = deleteRequestFromTree(collections, colId, reqId)
    setCollections(next)
    persist({ collections: next })
    const openTab = tabsRef.current.find((t) => t.requestId === reqId)
    if (openTab) {
      handleCloseTab(openTab.id)
    }
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

  // Move Multiple Requests (supports batch dragging or batch context menu move)
  const handleMoveRequests = (
    reqIds: string[],
    targetColId: string,
    targetIndex?: number
  ) => {
    if (!reqIds || reqIds.length === 0) return
    if (reqIds.length === 1) {
      const found = findRequestInTree(collections, reqIds[0])
      if (found) {
        handleMoveRequest(found.col.id, targetColId, reqIds[0], targetIndex)
      }
      return
    }
    const next = moveRequestsInTree(collections, reqIds, targetColId, targetIndex)
    setCollections(next)
    persist({ collections: next })
    const targetCol = findCollectionInTree(collections, targetColId)
    if (targetCol) {
      addToast(t('toast.requestsMoved', { count: reqIds.length, name: targetCol.name }), 'success')
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
          const req = cloneCleanRequest(parsed.collections[0].requests[0])
          setCurrentRequest(req)
          setResponse(null)
          const newTab: WorkspaceTab = {
            id: 'tab-' + req.id,
            requestId: req.id,
            name: req.name,
            method: req.method,
            isDirty: false
          }
          setTabs([newTab])
          setActiveTabId(newTab.id)
          setDrafts({ [req.id]: req })
          updates.tabs = [newTab]
          updates.activeTabId = newTab.id
          updates.drafts = { [req.id]: req }
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
        setCurrentRequest(cloneCleanRequest(parsed.collections[0].requests[0]))
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

  const handleSendRef = useRef(handleSend)
  handleSendRef.current = handleSend

  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Keyboard shortcuts
  const handleOpenDevToys = () => {
    if (window.electronAPI?.openDevToysWindow) {
      window.electronAPI.openDevToysWindow()
    } else {
      setIsDevToysOpen(true)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Check if target is inside CodeMirror or standard input/textarea
      const target = e.target as HTMLElement | null
      const isCodeEditorFocused = Boolean(
        target && (
          target.closest('.cm-editor') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA'
        )
      )

      const isModalOpen = Boolean(
        isSettingsModalOpen ||
        isConstantModalOpen ||
        isEnvModalOpen ||
        isChangelogOpen ||
        isCommandPaletteOpen ||
        isCodeSnippetOpen ||
        curlModalState.isOpen ||
        dataTransferState.isOpen ||
        runnerState.isOpen ||
        isDevToysOpen ||
        isUpdateModalOpen ||
        (target && (target.closest('.fixed.inset-0') || target.closest('[role="dialog"]')))
      )

      // Ctrl+Enter / Cmd+Enter: Send Request (when no modal dialog is open)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isModalOpen) {
          e.preventDefault()
          e.stopPropagation()
          handleSendRef.current()
        }
        return
      }

      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (!isModalOpen) {
          e.preventDefault()
          handleSaveRef.current()
        }
        return
      }
      // Ctrl+P: Quick Open Command Palette
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsCommandPaletteOpen(true)
      }
      // Ctrl+D: Duplicate current request
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (isCodeEditorFocused || isModalOpen) return
        e.preventDefault()
        const found = findRequestInTree(collections, currentRequest.id)
        if (found) {
          handleDuplicateRequest(found.col.id, currentRequest.id)
        } else {
          const cloned: RequestItem = {
            ...currentRequest,
            id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            name: currentRequest.name + ' (Copy)'
          }
          handleSelectRequest(cloned)
          addToast(t('toast.requestDuplicatedViaShortcut'), 'success')
        }
      }
      // Ctrl+Shift+T: Open DevToys / Scratchpad
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        handleOpenDevToys()
      }
      // Ctrl+T: New Tab
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 't') {
        if (isModalOpen) return
        e.preventDefault()
        handleNewTab()
      }
      // Ctrl+W: Close Active Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        if (isModalOpen) return
        e.preventDefault()
        if (settings.enableMultiTabs !== false) {
          handleCloseTab(activeTabId)
        }
      }
      // Ctrl+,: Open Settings Modal
      else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setSettingsCategory('general')
        setIsSettingsModalOpen(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [
    currentRequest,
    collections,
    activeTabId,
    settings.enableMultiTabs,
    isSettingsModalOpen,
    isConstantModalOpen,
    isEnvModalOpen,
    isChangelogOpen,
    isCommandPaletteOpen,
    isCodeSnippetOpen,
    curlModalState.isOpen,
    dataTransferState.isOpen,
    runnerState.isOpen,
    isDevToysOpen,
    isUpdateModalOpen
  ])

  // Mouse drag handlers for split & sidebar
  const handleSplitMouseDown = () => {
    isDraggingSplitRef.current = true
  }

  const handleSidebarMouseDown = () => {
    isDraggingSidebarRef.current = true
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebarRef.current) {
        const newWidth = Math.max(180, Math.min(600, e.clientX))
        setSidebarWidth(newWidth)
        sidebarWidthRef.current = newWidth
        return
      }

      if (!isDraggingSplitRef.current) return
      const container = document.getElementById('split-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      if (ratio > 0.2 && ratio < 0.8) {
        setSplitRatio(ratio)
        splitRatioRef.current = ratio
      }
    }

    const handleMouseUp = () => {
      if (isDraggingSidebarRef.current) {
        isDraggingSidebarRef.current = false
        localStorage.setItem('relay_sidebar_width', String(sidebarWidthRef.current))
        persist({ sidebarWidth: sidebarWidthRef.current })
      }
      if (isDraggingSplitRef.current) {
        isDraggingSplitRef.current = false
        localStorage.setItem('relay_split_ratio', String(splitRatioRef.current))
        persist({ splitRatio: splitRatioRef.current })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const isCurrentDirty = dirtyIds.has(currentRequest.id)

  const renderTopRightToolbar = () => (
    <div className="flex items-center gap-2 text-xs">
      {/* DevToys / Scratchpad Toolbox */}
      <button
        type="button"
        onClick={handleOpenDevToys}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-800/80 transition-colors cursor-pointer"
        title={`${t('devtoys.title')} (Ctrl+Shift+T)`}
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
        <span className="text-[11px] font-medium">{t('devtoys.title')}</span>
      </button>

      {/* Help / User Guide */}
      <button
        type="button"
        onClick={() => {
          if (window.electronAPI?.openHelpWindow) {
            window.electronAPI.openHelpWindow()
          }
        }}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 border border-slate-800/80 transition-colors cursor-pointer"
        title={t('help.title')}
      >
        <HelpCircle className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
        <span className="text-[11px] font-medium">{t('help.btnText')}</span>
      </button>

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={() => handleUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
        className={`flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 text-slate-400 ${
          settings.theme === 'light'
            ? 'hover:text-amber-600 dark:hover:text-amber-400'
            : 'hover:text-sky-500 dark:hover:text-sky-400'
        } border border-slate-800/80 hover:border-slate-700/80 transition-colors cursor-pointer`}
        title={t('common.toggleTheme')}
      >
        {settings.theme === 'light' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="text-[11px] font-medium">{t('settings.themeLight')}</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium">{t('settings.themeDark')}</span>
          </>
        )}
      </button>
    </div>
  )

  if (!isDataLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3 text-xs">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Sidebar */}
      <Sidebar
        width={sidebarWidth}
        collections={collections}
        history={history}
        environments={environments}
        constants={constants}
        activeEnvId={activeEnvId}
        selectedRequestId={currentRequest.id}
        dirtyIds={dirtyIds}
        onSelectRequest={handleSelectRequest}
        onNewRequest={() => {
          if (settings.enableMultiTabs !== false) {
            handleNewTab()
          } else {
            const newReq = {
              ...defaultNewRequest,
              id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              name: 'New Request'
            }
            const singleTab: WorkspaceTab = {
              id: 'tab-' + newReq.id,
              requestId: newReq.id,
              name: newReq.name,
              method: newReq.method,
              isDirty: false
            }
            setDrafts((prev) => ({ ...prev, [newReq.id]: newReq }))
            setTabs([singleTab])
            setActiveTabId(singleTab.id)
            setCurrentRequest(newReq)
            setResponse(null)
          }
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
        onMoveRequests={handleMoveRequests}
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
        onOpenSettings={(cat) => {
          setSettingsCategory(cat || 'general')
          setIsSettingsModalOpen(true)
        }}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onOpenDevToys={handleOpenDevToys}
        onSelectEnv={(id) => {
          setActiveEnvId(id || undefined)
          persist({ activeEnvironmentId: id || undefined })
        }}
        onSwitchConstant={handleSwitchConstant}
        onOpenDataTransfer={(tab, colId, format) =>
          setDataTransferState({
            isOpen: true,
            initialTab: tab || 'export',
            initialFormat: format || 'json',
            targetColId: colId
          })
        }
        onRunCollection={handleRunCollection}
        onRunRequests={handleRunSelectedRequests}
        updateAvailable={!!updateInfo?.updateAvailable}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* Sidebar Resizable Divider */}
      <div
        onMouseDown={handleSidebarMouseDown}
        className="w-1 hover:w-1.5 bg-slate-800 hover:bg-sky-500 cursor-col-resize flex items-center justify-center transition-colors group select-none shrink-0 z-20"
        title={t('common.resizeSidebar')}
      >
        <div className="w-0.5 h-6 bg-slate-600 group-hover:bg-white rounded-full transition-colors opacity-0 group-hover:opacity-100" />
      </div>

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
            onNewTab={() => handleNewTab()}
            extraRight={renderTopRightToolbar()}
          />
        ) : (
          <div className="h-9 border-b border-slate-800/80 flex items-center justify-between px-3 text-xs text-slate-500 bg-slate-950/30">
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
            {renderTopRightToolbar()}
          </div>
        )}

        {/* Request Header Bar */}
        <RequestHeader
          request={currentRequest}
          collectionPath={findRequestCollectionPath(collections, currentRequest.id)?.join(' / ')}
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
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenHistoryWindow={() => {
            if (window.electronAPI?.openHistoryWindow) {
              window.electronAPI.openHistoryWindow()
            }
          }}
          historyCount={history.length}
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
            onMouseDown={handleSplitMouseDown}
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
          initialCategory={settingsCategory}
          settings={settings}
          onClose={() => setIsSettingsModalOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          onOpenDataTransfer={() =>
            setDataTransferState({
              isOpen: true,
              initialTab: 'export'
            })
          }
          onOpenChangelog={() => setIsChangelogOpen(true)}
          onCheckUpdates={() => handleCheckForUpdates(true)}
          isCheckingUpdates={isCheckingUpdates}
        />
      )}

      {isChangelogOpen && (
        <ChangelogModal
          isOpen={isChangelogOpen}
          onClose={handleCloseChangelog}
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
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-200 flex flex-col gap-4">
                <h3 className="font-semibold text-rose-400 text-sm">打开导出窗口时遇到异常</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  当前集合数据可能包含不兼容格式，请检查集合结构。已自动阻止整屏崩溃。
                </p>
                <button
                  type="button"
                  onClick={() => setDataTransferState((prev) => ({ ...prev, isOpen: false }))}
                  className="self-end px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          }
        >
          <DataTransferModal
            isOpen={dataTransferState.isOpen}
            initialTab={dataTransferState.initialTab}
            initialExportFormat={dataTransferState.initialFormat}
            selectedCollectionId={dataTransferState.targetColId}
            collections={collections}
            constants={constants}
            environments={environments}
            activeEnvId={activeEnvId}
            settings={settings}
            onClose={() => setDataTransferState((prev) => ({ ...prev, isOpen: false }))}
            onImport={handleImportData}
            onExportToast={(msg) => addToast(msg, 'success')}
          />
        </ErrorBoundary>
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

      {isDevToysOpen && (
        <DevToysModal
          isOpen={isDevToysOpen}
          onClose={() => setIsDevToysOpen(false)}
          onToast={(msg, type) => addToast(msg, type || 'success')}
        />
      )}

      {isUpdateModalOpen && (
        <UpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
          onToast={(msg, type) => addToast(msg, type || 'success')}
        />
      )}
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('relay_language') as Language) || 'zh-CN')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('relay_theme') as Theme) || 'dark')

  return (
    <I18nProvider language={language} onLanguageChange={setLanguage}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <MainApp onLanguageChange={setLanguage} onThemeChange={setTheme} />
      </ThemeProvider>
    </I18nProvider>
  )
}
