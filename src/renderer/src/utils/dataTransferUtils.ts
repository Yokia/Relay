import { CollectionItem, RequestItem, ConstantItem, Environment, AppSettings, HttpMethod, KeyValueItem } from '../types'

export interface RelayBackupData {
  type: 'relay-backup'
  version: 1
  exportedAt: string
  collections?: CollectionItem[]
  constants?: ConstantItem[]
  environments?: Environment[]
  settings?: Partial<AppSettings>
}

export interface RelayCollectionsData {
  type: 'relay-collections'
  version: 1
  exportedAt: string
  collections: CollectionItem[]
}

export interface RelayEnvConstantsData {
  type: 'relay-env-constants'
  version: 1
  exportedAt: string
  constants: ConstantItem[]
  environments: Environment[]
}

export interface ParsedImportData {
  kind: 'backup' | 'collections' | 'env-constants' | 'postman' | 'custom'
  collections?: CollectionItem[]
  constants?: ConstantItem[]
  environments?: Environment[]
  settings?: Partial<AppSettings>
  stats: {
    collectionsCount: number
    requestsCount: number
    constantsCount: number
    environmentsCount: number
  }
}

// Recursively count requests in collection tree
export function countRequestsInTree(collections: CollectionItem[]): number {
  let count = 0
  for (const c of collections) {
    count += (c.requests || []).length
    if (c.children && c.children.length > 0) {
      count += countRequestsInTree(c.children)
    }
  }
  return count
}

// Recursively count total collections (including sub-collections)
export function countCollectionsInTree(collections: CollectionItem[]): number {
  let count = collections.length
  for (const c of collections) {
    if (c.children && c.children.length > 0) {
      count += countCollectionsInTree(c.children)
    }
  }
  return count
}

// Helper to convert Postman items to Relay CollectionItem
function parsePostmanItems(items: any[]): { requests: RequestItem[]; children: CollectionItem[] } {
  const requests: RequestItem[] = []
  const children: CollectionItem[] = []

  for (const item of items) {
    if (!item) continue

    // Folder
    if (Array.isArray(item.item)) {
      const parsed = parsePostmanItems(item.item)
      children.push({
        id: 'col-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: item.name || 'Folder',
        requests: parsed.requests,
        children: parsed.children
      })
      continue
    }

    // Request
    if (item.request) {
      const postmanReq = item.request
      let urlStr = ''
      const params: KeyValueItem[] = []

      if (typeof postmanReq.url === 'string') {
        urlStr = postmanReq.url
      } else if (postmanReq.url && typeof postmanReq.url === 'object') {
        urlStr = postmanReq.url.raw || ''
        if (Array.isArray(postmanReq.url.query)) {
          for (const q of postmanReq.url.query) {
            params.push({
              key: q.key || '',
              value: q.value || '',
              enabled: q.disabled !== true,
              description: q.description
            })
          }
        }
      }

      const headers: KeyValueItem[] = []
      if (Array.isArray(postmanReq.header)) {
        for (const h of postmanReq.header) {
          headers.push({
            key: h.key || '',
            value: h.value || '',
            enabled: h.disabled !== true,
            description: h.description
          })
        }
      }

      let bodyType: RequestItem['bodyType'] = 'none'
      let bodyRaw = ''
      let bodyFormData: KeyValueItem[] | undefined = undefined
      let bodyUrlEncoded: KeyValueItem[] | undefined = undefined

      if (postmanReq.body) {
        const mode = postmanReq.body.mode
        if (mode === 'raw') {
          bodyType = 'json'
          bodyRaw = postmanReq.body.raw || ''
        } else if (mode === 'urlencoded' && Array.isArray(postmanReq.body.urlencoded)) {
          bodyType = 'x-www-form-urlencoded'
          bodyUrlEncoded = postmanReq.body.urlencoded.map((u: any) => ({
            key: u.key || '',
            value: u.value || '',
            enabled: u.disabled !== true,
            description: u.description
          }))
        } else if (mode === 'formdata' && Array.isArray(postmanReq.body.formdata)) {
          bodyType = 'form-data'
          bodyFormData = postmanReq.body.formdata.map((f: any) => ({
            key: f.key || '',
            value: f.value || '',
            enabled: f.disabled !== true,
            description: f.description
          }))
        }
      }

      const method = (typeof postmanReq.method === 'string' ? postmanReq.method.toUpperCase() : 'GET') as HttpMethod

      requests.push({
        id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name: item.name || 'Request',
        method,
        url: urlStr,
        params,
        headers,
        bodyType,
        bodyRaw,
        bodyFormData,
        bodyUrlEncoded
      })
    }
  }

  return { requests, children }
}

// Parse and validate imported content (supports Relay Backup, Relay Collections, Postman Collections, or raw data)
export function parseImportData(raw: string): { success: true; data: ParsedImportData } | { success: false; error: string } {
  if (!raw || !raw.trim()) {
    return { success: false, error: 'Empty content' }
  }

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch (e: any) {
    return { success: false, error: 'Invalid JSON: ' + e.message }
  }

  // 1. Check Postman Collection v2 / v2.1
  if (parsed && (parsed.info?.schema?.includes('postman') || (parsed.info?.name && Array.isArray(parsed.item)))) {
    const { requests, children } = parsePostmanItems(parsed.item || [])
    const rootCollection: CollectionItem = {
      id: 'col-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: parsed.info?.name || 'Imported Postman Collection',
      requests,
      children
    }
    const collections = [rootCollection]
    return {
      success: true,
      data: {
        kind: 'postman',
        collections,
        stats: {
          collectionsCount: countCollectionsInTree(collections),
          requestsCount: countRequestsInTree(collections),
          constantsCount: 0,
          environmentsCount: 0
        }
      }
    }
  }

  // 2. Relay Full Backup
  if (parsed && parsed.type === 'relay-backup') {
    const collections = Array.isArray(parsed.collections) ? parsed.collections : []
    const constants = Array.isArray(parsed.constants) ? parsed.constants : []
    const environments = Array.isArray(parsed.environments) ? parsed.environments : []
    const settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : undefined

    return {
      success: true,
      data: {
        kind: 'backup',
        collections,
        constants,
        environments,
        settings,
        stats: {
          collectionsCount: countCollectionsInTree(collections),
          requestsCount: countRequestsInTree(collections),
          constantsCount: constants.length,
          environmentsCount: environments.length
        }
      }
    }
  }

  // 3. Relay Collections Only
  if (parsed && (parsed.type === 'relay-collections' || (Array.isArray(parsed.collections) && !parsed.constants))) {
    const collections = Array.isArray(parsed.collections) ? parsed.collections : []
    return {
      success: true,
      data: {
        kind: 'collections',
        collections,
        stats: {
          collectionsCount: countCollectionsInTree(collections),
          requestsCount: countRequestsInTree(collections),
          constantsCount: 0,
          environmentsCount: 0
        }
      }
    }
  }

  // 4. Relay Env & Constants Only
  if (parsed && (parsed.type === 'relay-env-constants' || (Array.isArray(parsed.constants) && !parsed.collections))) {
    const constants = Array.isArray(parsed.constants) ? parsed.constants : []
    const environments = Array.isArray(parsed.environments) ? parsed.environments : []
    return {
      success: true,
      data: {
        kind: 'env-constants',
        constants,
        environments,
        stats: {
          collectionsCount: 0,
          requestsCount: 0,
          constantsCount: constants.length,
          environmentsCount: environments.length
        }
      }
    }
  }

  // 5. Raw Array of Collections or single Collection item
  if (Array.isArray(parsed)) {
    // Check if looks like collections
    const isCollections = parsed.some((item) => item && typeof item === 'object' && ('requests' in item || 'children' in item))
    if (isCollections) {
      return {
        success: true,
        data: {
          kind: 'collections',
          collections: parsed as CollectionItem[],
          stats: {
            collectionsCount: countCollectionsInTree(parsed),
            requestsCount: countRequestsInTree(parsed),
            constantsCount: 0,
            environmentsCount: 0
          }
        }
      }
    }
  } else if (parsed && typeof parsed === 'object' && ('requests' in parsed || 'children' in parsed)) {
    // Single collection item
    const collections = [parsed as CollectionItem]
    return {
      success: true,
      data: {
        kind: 'collections',
        collections,
        stats: {
          collectionsCount: countCollectionsInTree(collections),
          requestsCount: countRequestsInTree(collections),
          constantsCount: 0,
          environmentsCount: 0
        }
      }
    }
  }

  return { success: false, error: 'Unrecognized format' }
}

// Regenerate IDs for a collection tree to prevent collisions
export function reIdCollectionTree(cols: CollectionItem[]): CollectionItem[] {
  return cols.map((col) => {
    const newColId = 'col-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    const newRequests = (col.requests || []).map((req) => ({
      ...req,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    }))
    const newChildren = col.children && col.children.length > 0 ? reIdCollectionTree(col.children) : []
    return {
      ...col,
      id: newColId,
      requests: newRequests,
      children: newChildren
    }
  })
}

// Collect existing IDs in collection tree
function collectIds(cols: CollectionItem[], idSet: Set<string>) {
  for (const c of cols) {
    idSet.add(c.id)
    for (const r of c.requests || []) {
      idSet.add(r.id)
    }
    if (c.children && c.children.length > 0) {
      collectIds(c.children, idSet)
    }
  }
}

// Merge collections: if conflict, re-id incoming item
export function mergeCollections(current: CollectionItem[], incoming: CollectionItem[]): CollectionItem[] {
  const existingIds = new Set<string>()
  collectIds(current, existingIds)

  // Check if incoming has conflicts
  const incomingIds = new Set<string>()
  collectIds(incoming, incomingIds)

  let hasConflict = false
  for (const id of incomingIds) {
    if (existingIds.has(id)) {
      hasConflict = true
      break
    }
  }

  const processedIncoming = hasConflict ? reIdCollectionTree(incoming) : incoming
  return [...current, ...processedIncoming]
}

// Merge constants: merge options and notes for existing constant names, append new ones
export function mergeConstants(current: ConstantItem[], incoming: ConstantItem[]): ConstantItem[] {
  const result: ConstantItem[] = current.map((c) => ({
    ...c,
    options: [...c.options],
    optionNotes: c.optionNotes ? { ...c.optionNotes } : {}
  }))

  for (const inc of incoming) {
    const found = result.find((c) => c.name.trim().toLowerCase() === inc.name.trim().toLowerCase())
    if (found) {
      // Merge options (keeping unique values)
      const optionsSet = new Set(found.options)
      for (const opt of inc.options || []) {
        if (!optionsSet.has(opt)) {
          found.options.push(opt)
          optionsSet.add(opt)
        }
      }
      // Merge optionNotes
      if (inc.optionNotes) {
        found.optionNotes = {
          ...found.optionNotes,
          ...inc.optionNotes
        }
      }
    } else {
      result.push({
        ...inc,
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        options: [...(inc.options || [])],
        optionNotes: inc.optionNotes ? { ...inc.optionNotes } : {}
      })
    }
  }

  return result
}

// Merge environments
export function mergeEnvironments(current: Environment[], incoming: Environment[]): Environment[] {
  const result: Environment[] = current.map((e) => ({
    ...e,
    variables: [...e.variables]
  }))

  for (const inc of incoming) {
    const found = result.find((e) => e.name.trim().toLowerCase() === inc.name.trim().toLowerCase())
    if (found) {
      // Merge variables by key
      const varMap = new Map(found.variables.map((v) => [v.key, v]))
      for (const v of inc.variables || []) {
        varMap.set(v.key, v)
      }
      found.variables = Array.from(varMap.values())
    } else {
      result.push({
        ...inc,
        id: 'env-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        variables: [...(inc.variables || [])]
      })
    }
  }

  return result
}
