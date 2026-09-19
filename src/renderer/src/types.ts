export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface KeyValueItem {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface RequestItem {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  bodyType: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw'
  bodyRaw: string
  bodyFormData?: KeyValueItem[]
  bodyUrlEncoded?: KeyValueItem[]
  constantOverrides?: Record<string, string>
}

export interface CollectionItem {
  id: string
  name: string
  requests: RequestItem[]
  children?: CollectionItem[]
}

export interface HistoryItem {
  id: string
  request: RequestItem
  status: number
  time: number
  timestamp: number
}

export interface EnvVariable {
  key: string
  value: string
  enabled: boolean
  options?: string[]
}

export interface ConstantItem {
  id: string
  name: string
  currentValue: string
  options: string[]
  optionNotes?: Record<string, string>
  description?: string
}

export interface Environment {
  id: string
  name: string
  variables: EnvVariable[]
}

export interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  size: number
  time: number
  contentType: string
  error?: string
}

export interface ResponseRun {
  id: string
  timestamp: number
  method: string
  url: string
  response: ResponseData
}

export type Language = 'zh-CN' | 'en-US'

export type Theme = 'dark' | 'light'

export interface AppSettings {
  autoSave: boolean
  timeout: number
  sslVerify: boolean
  maxResponsesPerRequest?: number
  language?: Language
  theme?: Theme
  enableMultiTabs?: boolean
}

export interface WorkspaceTab {
  id: string
  requestId: string
  name: string
  method: HttpMethod
  isDirty?: boolean
}

export interface RunnerRequestResult {
  id: string
  requestId: string
  requestName: string
  method: HttpMethod
  url: string
  status: number
  statusText: string
  time: number
  size: number
  error?: string
  responseBody?: any
  responseHeaders?: Record<string, string>
  requestHeaders?: Record<string, string>
  requestParams?: Record<string, string>
  requestBody?: any
  timestamp: number
}

export interface RunnerReport {
  title: string
  startTime: number
  endTime: number
  totalDuration: number
  totalCount: number
  passedCount: number
  failedCount: number
  statusCodeDistribution: Record<string, number>
  results: RunnerRequestResult[]
}
