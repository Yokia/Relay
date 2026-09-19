import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface StorageData {
  history: any[]
  collections: any[]
  environments: any[]
  constants?: any[]
  settings?: any
  activeEnvironmentId?: string
  responseHistoryMap?: Record<string, any>
  tabs?: any[]
  activeTabId?: string
  drafts?: Record<string, any>
  dirtyIds?: string[]
  windowBounds?: {
    width: number
    height: number
    x?: number
    y?: number
    isMaximized?: boolean
  }
  sidebarWidth?: number
  splitRatio?: number
}

type StorageBucket = 'collections' | 'settings' | 'responses'

const STORAGE_VERSION = 1
const INLINE_RESPONSE_LIMIT = 256 * 1024
const DEFAULT_RESPONSE_STORAGE_LIMIT_MB = 100

const defaultData: StorageData = {
  history: [],
  settings: {
    autoSave: false,
    timeout: 30000,
    sslVerify: true,
    language: 'zh-CN',
    theme: 'dark',
    responseStorageLimitMB: DEFAULT_RESPONSE_STORAGE_LIMIT_MB
  },
  constants: [
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
  ],
  collections: [
    {
      id: 'default-col',
      name: 'Sample Collection',
      requests: [
        {
          id: 'req-sample-1',
          name: 'Get Users List',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users',
          headers: [],
          params: [{ key: 'page', value: '1', enabled: true }],
          bodyType: 'none',
          bodyRaw: ''
        },
        {
          id: 'req-sample-2',
          name: 'Create Post',
          method: 'POST',
          url: 'https://jsonplaceholder.typicode.com/posts',
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          params: [],
          bodyType: 'json',
          bodyRaw: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2)
        }
      ]
    }
  ],
  environments: [
    {
      id: 'env-default',
      name: 'Development',
      variables: [
        {
          key: 'server',
          value: 'http://localhost',
          enabled: true,
          options: ['http://localhost', 'http://127.0.0.1', 'http://192.168.1.100', 'https://api.dev.local']
        },
        {
          key: 'port',
          value: '3000',
          enabled: true,
          options: ['3000', '8080', '8000', '5000', '9000']
        },
        {
          key: 'baseUrl',
          value: 'https://jsonplaceholder.typicode.com',
          enabled: true,
          options: ['https://jsonplaceholder.typicode.com', 'https://api.github.com']
        }
      ]
    }
  ],
  activeEnvironmentId: 'env-default'
}

function compactLargeMediaRuns(data: StorageData): { data: StorageData; changed: boolean } {
  if (!data.responseHistoryMap || typeof data.responseHistoryMap !== 'object') return { data, changed: false }
  let changed = false
  const responseHistoryMap: Record<string, any[]> = {}
  Object.entries(data.responseHistoryMap).forEach(([requestId, runs]) => {
    const safeRuns = Array.isArray(runs) ? runs : []
    responseHistoryMap[requestId] = safeRuns.map((run: any) => {
      const contentType = String(run?.response?.contentType || '').toLowerCase().split(';')[0]
      const isMedia = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/') || contentType === 'application/pdf'
      const isLarge = isMedia && typeof run?.response?.data === 'string' && run.response.data.length > 1024 * 1024
      if (!isLarge) return run
      changed = true
      return { ...run, response: { ...run.response, data: null } }
    })
  })
  return { data: { ...data, responseHistoryMap }, changed }
}

function getResponseDataSize(data: any): number {
  if (typeof data === 'string') return Buffer.byteLength(data, 'utf8')
  if (data === undefined || data === null) return 0
  try {
    return Buffer.byteLength(JSON.stringify(data), 'utf8')
  } catch {
    return 0
  }
}

export class StorageService {
  private legacyFilePath: string
  private filePaths: Record<StorageBucket, string>
  private blobDir: string
  private cache: StorageData

  constructor() {
    const userDataPath = app.getPath('userData')
    this.legacyFilePath = path.join(userDataPath, 'relay-data.json')
    this.filePaths = {
      collections: path.join(userDataPath, 'relay-collections.json'),
      settings: path.join(userDataPath, 'relay-settings.json'),
      responses: path.join(userDataPath, 'relay-responses.json')
    }
    this.blobDir = path.join(userDataPath, 'response-blobs')
    this.cache = this.load()
  }

  private readJson(filePath: string): Record<string, any> | null {
    try {
      if (!fs.existsSync(filePath)) return null
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch (e) {
      console.error(`Failed to read storage file ${filePath}:`, e)
      return null
    }
  }

  private writeJson(bucket: StorageBucket, data: Record<string, any>): void {
    const filePath = this.filePaths[bucket]
    const tempPath = `${filePath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify({ version: STORAGE_VERSION, ...data }, null, 2), 'utf-8')
    fs.renameSync(tempPath, filePath)
  }

  private writeResponseBlob(blobId: string, data: any): void {
    fs.mkdirSync(this.blobDir, { recursive: true })
    const filePath = path.join(this.blobDir, `${blobId}.json`)
    const tempPath = `${filePath}.tmp`
    fs.writeFileSync(tempPath, JSON.stringify({ data }), 'utf-8')
    fs.renameSync(tempPath, filePath)
  }

  private externalizeResponseMap(responseHistoryMap: Record<string, any>): Record<string, any[]> {
    const result: Record<string, any[]> = {}
    Object.entries(responseHistoryMap || {}).forEach(([requestId, runs]) => {
      result[requestId] = (Array.isArray(runs) ? runs : []).map((run: any) => {
        const response = run?.response
        if (!response || response.data === undefined || response.data === null || response.blobId || getResponseDataSize(response.data) <= INLINE_RESPONSE_LIMIT) {
          return run
        }
        const blobId = `response-${run.id || `${requestId}-${run.timestamp || Date.now()}`}`
        this.writeResponseBlob(blobId, response.data)
        return { ...run, response: { ...response, data: null, blobId } }
      })
    })
    return result
  }

  private enforceResponseStorageLimit(responseHistoryMap: Record<string, any[]>): Record<string, any[]> {
    const limitMB = Number(this.cache.settings?.responseStorageLimitMB) || DEFAULT_RESPONSE_STORAGE_LIMIT_MB
    const maxBytes = Math.max(1, limitMB) * 1024 * 1024
    const referencedBlobIds = new Set<string>()
    const entries: Array<{ blobId: string; timestamp: number; size: number; requestId: string; runId: string }> = []
    Object.entries(responseHistoryMap).forEach(([requestId, runs]) => {
      runs.forEach((run: any) => {
        const blobId = run?.response?.blobId
        if (!blobId) return
        referencedBlobIds.add(blobId)
        const filePath = path.join(this.blobDir, `${blobId}.json`)
        if (!fs.existsSync(filePath)) return
        entries.push({ blobId, timestamp: Number(run.timestamp) || 0, size: fs.statSync(filePath).size, requestId, runId: run.id })
      })
    })
    if (fs.existsSync(this.blobDir)) {
      for (const fileName of fs.readdirSync(this.blobDir)) {
        if (fileName.endsWith('.json') && !referencedBlobIds.has(fileName.slice(0, -5))) {
          fs.rmSync(path.join(this.blobDir, fileName), { force: true })
        }
      }
    }
    let totalBytes = entries.reduce((total, entry) => total + entry.size, 0)
    if (totalBytes <= maxBytes) return responseHistoryMap
    const nextMap = { ...responseHistoryMap }
    entries.sort((a, b) => a.timestamp - b.timestamp)
    for (const entry of entries) {
      if (totalBytes <= maxBytes) break
      try {
        fs.rmSync(path.join(this.blobDir, `${entry.blobId}.json`), { force: true })
      } catch {
        continue
      }
      totalBytes -= entry.size
      nextMap[entry.requestId] = (nextMap[entry.requestId] || []).map((run: any) =>
        run.id === entry.runId ? { ...run, response: { ...run.response, data: null, blobId: undefined } } : run
      )
    }
    return nextMap
  }

  public getResponseBlob(blobId: string): any {
    if (!blobId || !/^[a-zA-Z0-9_-]+$/.test(blobId)) return null
    const filePath = path.join(this.blobDir, `${blobId}.json`)
    try {
      if (!fs.existsSync(filePath)) return null
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')).data ?? null
    } catch (e) {
      console.error('Failed to read response blob:', e)
      return null
    }
  }

  private writeAll(data: StorageData): void {
    this.writeJson('collections', { collections: data.collections })
    this.writeJson('settings', {
      settings: data.settings,
      environments: data.environments,
      constants: data.constants,
      activeEnvironmentId: data.activeEnvironmentId,
      tabs: data.tabs,
      activeTabId: data.activeTabId,
      drafts: data.drafts,
      dirtyIds: data.dirtyIds,
      windowBounds: data.windowBounds,
      sidebarWidth: data.sidebarWidth,
      splitRatio: data.splitRatio
    })
    this.writeJson('responses', {
      history: data.history,
      responseHistoryMap: data.responseHistoryMap
    })
  }

  private load(): StorageData {
    try {
      const collectionsData = this.readJson(this.filePaths.collections)
      const settingsData = this.readJson(this.filePaths.settings)
      const responsesData = this.readJson(this.filePaths.responses)
      const hasLegacyData = fs.existsSync(this.legacyFilePath)
      const hasCompleteSplitStorage = Object.values(this.filePaths).every((filePath) => fs.existsSync(filePath))

      if (hasCompleteSplitStorage && collectionsData && settingsData && responsesData) {
        const loaded: StorageData = {
          ...defaultData,
          ...(collectionsData || {}),
          ...(settingsData || {}),
          ...(responsesData || {})
        }
        const compacted = compactLargeMediaRuns(loaded)
        this.cache = compacted.data
        const externalized = this.externalizeResponseMap(compacted.data.responseHistoryMap || {})
        const limited = this.enforceResponseStorageLimit(externalized)
        const normalized = { ...compacted.data, responseHistoryMap: limited }
        if (compacted.changed || JSON.stringify(externalized) !== JSON.stringify(compacted.data.responseHistoryMap) || JSON.stringify(limited) !== JSON.stringify(externalized)) {
          this.writeJson('responses', { history: normalized.history, responseHistoryMap: normalized.responseHistoryMap })
        }
        return normalized
      }

      if (hasLegacyData) {
        const loaded = { ...defaultData, ...JSON.parse(fs.readFileSync(this.legacyFilePath, 'utf-8')) }
        const compacted = compactLargeMediaRuns(loaded)
        this.cache = compacted.data
        const responseHistoryMap = this.enforceResponseStorageLimit(this.externalizeResponseMap(compacted.data.responseHistoryMap || {}))
        const normalized = { ...compacted.data, responseHistoryMap }
        this.writeAll(normalized)
        return normalized
      }

      if (collectionsData || settingsData || responsesData) {
        return {
          ...defaultData,
          ...(collectionsData || {}),
          ...(settingsData || {}),
          ...(responsesData || {})
        }
      }
    } catch (e) {
      console.error('Failed to load storage data:', e)
    }
    return defaultData
  }

  public getData(): StorageData {
    return this.cache
  }

  public saveData(data: Partial<StorageData>): StorageData {
    this.cache = { ...this.cache, ...data }
    try {
      if (Object.prototype.hasOwnProperty.call(data, 'collections')) {
        this.writeJson('collections', { collections: this.cache.collections })
      }
      const settingsKeys: Array<keyof StorageData> = [
        'settings',
        'environments',
        'constants',
        'activeEnvironmentId',
        'tabs',
        'activeTabId',
        'drafts',
        'dirtyIds',
        'windowBounds',
        'sidebarWidth',
        'splitRatio'
      ]
      if (settingsKeys.some((key) => Object.prototype.hasOwnProperty.call(data, key))) {
        this.writeJson('settings', {
          settings: this.cache.settings,
          environments: this.cache.environments,
          constants: this.cache.constants,
          activeEnvironmentId: this.cache.activeEnvironmentId,
          tabs: this.cache.tabs,
          activeTabId: this.cache.activeTabId,
          drafts: this.cache.drafts,
          dirtyIds: this.cache.dirtyIds,
          windowBounds: this.cache.windowBounds,
          sidebarWidth: this.cache.sidebarWidth,
          splitRatio: this.cache.splitRatio
        })
        if (Object.prototype.hasOwnProperty.call(data, 'settings') && this.cache.responseHistoryMap) {
          const limited = this.enforceResponseStorageLimit(this.cache.responseHistoryMap)
          this.cache = { ...this.cache, responseHistoryMap: limited }
          this.writeJson('responses', { history: this.cache.history, responseHistoryMap: limited })
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'history') || Object.prototype.hasOwnProperty.call(data, 'responseHistoryMap')) {
        const responseHistoryMap = this.externalizeResponseMap(this.cache.responseHistoryMap || {})
        this.cache = { ...this.cache, responseHistoryMap: this.enforceResponseStorageLimit(responseHistoryMap) }
        this.writeJson('responses', {
          history: this.cache.history,
          responseHistoryMap: this.cache.responseHistoryMap
        })
      }
    } catch (e) {
      console.error('Failed to save storage data:', e)
    }
    return this.cache
  }
}
