import { CollectionItem, RequestItem } from '../types'

/**
 * Recursively find a collection by ID anywhere in the collection tree
 */
export function findCollectionInTree(
  cols: CollectionItem[],
  id: string
): CollectionItem | null {
  for (const col of cols) {
    if (col.id === id) return col
    if (col.children && col.children.length > 0) {
      const found = findCollectionInTree(col.children, id)
      if (found) return found
    }
  }
  return null
}

/**
 * Recursively find parent collection of a given collection ID (returns null if at root)
 */
export function findParentCollection(
  cols: CollectionItem[],
  childId: string
): CollectionItem | null {
  for (const col of cols) {
    if (col.children && col.children.some((c) => c.id === childId)) {
      return col
    }
    if (col.children && col.children.length > 0) {
      const parent = findParentCollection(col.children, childId)
      if (parent) return parent
    }
  }
  return null
}

/**
 * Recursively find a request by ID anywhere in the collection tree
 */
export function findRequestInTree(
  cols: CollectionItem[],
  reqId: string
): { request: RequestItem; col: CollectionItem } | null {
  for (const col of cols) {
    const foundReq = col.requests.find((r) => r.id === reqId)
    if (foundReq) {
      return { request: foundReq, col }
    }
    if (col.children && col.children.length > 0) {
      const nested = findRequestInTree(col.children, reqId)
      if (nested) return nested
    }
  }
  return null
}

/** Return the collection path for a request, from root collection to its direct parent. */
export function findRequestCollectionPath(
  cols: CollectionItem[],
  reqId: string,
  parents: string[] = []
): string[] | null {
  for (const col of cols) {
    if (col.requests.some((request) => request.id === reqId)) return [...parents, col.name]
    if (col.children && col.children.length > 0) {
      const nested = findRequestCollectionPath(col.children, reqId, [...parents, col.name])
      if (nested) return nested
    }
  }
  return null
}

/**
 * Immutably update a request in the collection tree
 */
export function updateRequestInTree(
  cols: CollectionItem[],
  req: RequestItem
): { updated: CollectionItem[]; found: boolean } {
  let found = false

  const recurse = (list: CollectionItem[]): CollectionItem[] => {
    return list.map((c) => {
      let nextReqs = c.requests
      const reqIdx = c.requests.findIndex((r) => r.id === req.id)
      if (reqIdx !== -1) {
        found = true
        nextReqs = [...c.requests]
        nextReqs[reqIdx] = JSON.parse(JSON.stringify(req))
      }

      let nextChildren = c.children
      if (c.children && c.children.length > 0) {
        nextChildren = recurse(c.children)
      }

      if (nextReqs !== c.requests || nextChildren !== c.children) {
        return {
          ...c,
          requests: nextReqs,
          ...(nextChildren ? { children: nextChildren } : {})
        }
      }
      return c
    })
  }

  const updated = recurse(cols)
  return { updated, found }
}

/**
 * Immutably add a request to a collection or sub-collection
 */
export function addRequestToCollection(
  cols: CollectionItem[],
  colId: string,
  req: RequestItem
): CollectionItem[] {
  return cols.map((c) => {
    if (c.id === colId) {
      return {
        ...c,
        requests: [...c.requests, req]
      }
    }
    if (c.children && c.children.length > 0) {
      return {
        ...c,
        children: addRequestToCollection(c.children, colId, req)
      }
    }
    return c
  })
}

/**
 * Immutably delete a request from a collection or sub-collection
 */
export function deleteRequestFromTree(
  cols: CollectionItem[],
  colId: string,
  reqId: string
): CollectionItem[] {
  return cols.map((c) => {
    if (c.id === colId) {
      return {
        ...c,
        requests: c.requests.filter((r) => r.id !== reqId)
      }
    }
    if (c.children && c.children.length > 0) {
      return {
        ...c,
        children: deleteRequestFromTree(c.children, colId, reqId)
      }
    }
    return c
  })
}

/**
 * Immutably rename a request in the collection tree
 */
export function renameRequestInTree(
  cols: CollectionItem[],
  colId: string,
  reqId: string,
  newName: string
): CollectionItem[] {
  return cols.map((c) => {
    if (c.id === colId) {
      return {
        ...c,
        requests: c.requests.map((r) => (r.id === reqId ? { ...r, name: newName } : r))
      }
    }
    if (c.children && c.children.length > 0) {
      return {
        ...c,
        children: renameRequestInTree(c.children, colId, reqId, newName)
      }
    }
    return c
  })
}

/**
 * Immutably duplicate a request in the collection tree
 */
export function duplicateRequestInTree(
  cols: CollectionItem[],
  colId: string,
  reqId: string
): { updated: CollectionItem[]; duplicatedReq: RequestItem | null } {
  let duplicatedReq: RequestItem | null = null

  const recurse = (list: CollectionItem[]): CollectionItem[] => {
    return list.map((c) => {
      if (c.id === colId) {
        const idx = c.requests.findIndex((r) => r.id === reqId)
        if (idx !== -1) {
          const original = c.requests[idx]
          const newReq: RequestItem = {
            ...JSON.parse(JSON.stringify(original)),
            id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            name: original.name + ' (Copy)'
          }
          duplicatedReq = newReq
          const nextReqs = [...c.requests]
          nextReqs.splice(idx + 1, 0, newReq)
          return { ...c, requests: nextReqs }
        }
      }
      if (c.children && c.children.length > 0) {
        return { ...c, children: recurse(c.children) }
      }
      return c
    })
  }

  const updated = recurse(cols)
  return { updated, duplicatedReq }
}

/**
 * Immutably add a sub-collection into a parent collection
 */
export function addSubCollection(
  cols: CollectionItem[],
  parentColId: string,
  newCol: CollectionItem
): CollectionItem[] {
  return cols.map((c) => {
    if (c.id === parentColId) {
      return {
        ...c,
        children: [...(c.children || []), newCol]
      }
    }
    if (c.children && c.children.length > 0) {
      return {
        ...c,
        children: addSubCollection(c.children, parentColId, newCol)
      }
    }
    return c
  })
}

/**
 * Immutably rename a collection or sub-collection
 */
export function renameCollectionInTree(
  cols: CollectionItem[],
  colId: string,
  newName: string
): CollectionItem[] {
  return cols.map((c) => {
    if (c.id === colId) {
      return { ...c, name: newName }
    }
    if (c.children && c.children.length > 0) {
      return {
        ...c,
        children: renameCollectionInTree(c.children, colId, newName)
      }
    }
    return c
  })
}

/**
 * Immutably delete a collection or sub-collection from the tree
 */
export function deleteCollectionFromTree(
  cols: CollectionItem[],
  colId: string
): CollectionItem[] {
  return cols
    .filter((c) => c.id !== colId)
    .map((c) => {
      if (c.children && c.children.length > 0) {
        return {
          ...c,
          children: deleteCollectionFromTree(c.children, colId)
        }
      }
      return c
    })
}

/**
 * Deeply clone a collection tree with fresh IDs
 */
function deepCloneCollection(col: CollectionItem, isRoot = false): CollectionItem {
  return {
    id: 'col-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: isRoot ? col.name + ' (Copy)' : col.name,
    requests: (col.requests || []).map((r) => ({
      ...JSON.parse(JSON.stringify(r)),
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    })),
    children: (col.children || []).map((child) => deepCloneCollection(child, false))
  }
}

/**
 * Immutably duplicate a collection or sub-collection
 */
export function duplicateCollectionInTree(
  cols: CollectionItem[],
  colId: string
): CollectionItem[] {
  const result: CollectionItem[] = []
  for (const c of cols) {
    result.push(c)
    if (c.id === colId) {
      result.push(deepCloneCollection(c, true))
    } else if (c.children && c.children.length > 0) {
      c.children = duplicateCollectionInTree(c.children, colId)
    }
  }
  return result
}

/**
 * Check if targetId is an ancestor or descendant of parentId to prevent cycles
 */
export function isDescendant(
  cols: CollectionItem[],
  parentId: string,
  targetId: string | null
): boolean {
  if (!targetId || parentId === targetId) return true
  const parent = findCollectionInTree(cols, parentId)
  if (!parent || !parent.children) return false
  return !!findCollectionInTree(parent.children, targetId)
}

/**
 * Remove a collection from anywhere in the tree and return it along with new tree
 */
function extractCollection(
  cols: CollectionItem[],
  id: string
): { item: CollectionItem | null; tree: CollectionItem[] } {
  let item: CollectionItem | null = null

  const recurse = (list: CollectionItem[]): CollectionItem[] => {
    const next: CollectionItem[] = []
    for (const c of list) {
      if (c.id === id) {
        item = c
      } else {
        if (c.children && c.children.length > 0) {
          next.push({
            ...c,
            children: recurse(c.children)
          })
        } else {
          next.push(c)
        }
      }
    }
    return next
  }

  const tree = recurse(cols)
  return { item, tree }
}

/**
 * Immutably move a collection within the tree (reorder before/after, or nest inside)
 */
export function moveCollectionInTree(
  cols: CollectionItem[],
  sourceId: string,
  targetId: string | null,
  position: 'before' | 'after' | 'inside'
): CollectionItem[] {
  // Guard against invalid moves or moving into self/descendant
  if (sourceId === targetId) return cols
  if (targetId && isDescendant(cols, sourceId, targetId)) return cols

  // 1. Extract source collection
  const { item: sourceCol, tree: remainingTree } = extractCollection(cols, sourceId)
  if (!sourceCol) return cols

  // 2. Target is root or null
  if (!targetId) {
    if (position === 'before') {
      return [sourceCol, ...remainingTree]
    }
    return [...remainingTree, sourceCol]
  }

  // 3. Move inside target collection
  if (position === 'inside') {
    const insertInside = (list: CollectionItem[]): CollectionItem[] => {
      return list.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            children: [...(c.children || []), sourceCol]
          }
        }
        if (c.children && c.children.length > 0) {
          return {
            ...c,
            children: insertInside(c.children)
          }
        }
        return c
      })
    }
    return insertInside(remainingTree)
  }

  // 4. Move before or after sibling target collection
  const insertRelative = (list: CollectionItem[]): { list: CollectionItem[]; inserted: boolean } => {
    const targetIdx = list.findIndex((c) => c.id === targetId)
    if (targetIdx !== -1) {
      const nextList = [...list]
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1
      nextList.splice(insertAt, 0, sourceCol)
      return { list: nextList, inserted: true }
    }

    let anyInserted = false
    const nextList = list.map((c) => {
      if (c.children && c.children.length > 0) {
        const sub = insertRelative(c.children)
        if (sub.inserted) {
          anyInserted = true
          return { ...c, children: sub.list }
        }
      }
      return c
    })
    return { list: nextList, inserted: anyInserted }
  }

  const { list: result } = insertRelative(remainingTree)
  return result
}

/**
 * Immutably move a request across collections or within the same collection
 */
export function moveRequestInTree(
  cols: CollectionItem[],
  sourceColId: string,
  targetColId: string,
  reqId: string,
  targetIndex?: number
): CollectionItem[] {
  // 1. Find the request to move
  const found = findRequestInTree(cols, reqId)
  if (!found) return cols
  const itemToMove = found.request

  // 2. Same collection reordering
  if (sourceColId === targetColId) {
    const reorderInCol = (list: CollectionItem[]): CollectionItem[] => {
      return list.map((c) => {
        if (c.id === sourceColId) {
          const currentIdx = c.requests.findIndex((r) => r.id === reqId)
          if (currentIdx === -1 || targetIndex === undefined || currentIdx === targetIndex) {
            return c
          }
          const nextReqs = [...c.requests]
          const [removed] = nextReqs.splice(currentIdx, 1)
          nextReqs.splice(targetIndex, 0, removed)
          return { ...c, requests: nextReqs }
        }
        if (c.children && c.children.length > 0) {
          return { ...c, children: reorderInCol(c.children) }
        }
        return c
      })
    }
    return reorderInCol(cols)
  }

  // 3. Different collections: remove from source, add to target
  const moveCrossCols = (list: CollectionItem[]): CollectionItem[] => {
    return list.map((c) => {
      let nextReqs = c.requests
      if (c.id === sourceColId) {
        nextReqs = c.requests.filter((r) => r.id !== reqId)
      } else if (c.id === targetColId) {
        nextReqs = [...c.requests]
        if (targetIndex !== undefined && targetIndex >= 0) {
          nextReqs.splice(targetIndex, 0, itemToMove)
        } else {
          nextReqs.push(itemToMove)
        }
      }

      let nextChildren = c.children
      if (c.children && c.children.length > 0) {
        nextChildren = moveCrossCols(c.children)
      }

      return {
        ...c,
        requests: nextReqs,
        ...(nextChildren ? { children: nextChildren } : {})
      }
    })
  }

  return moveCrossCols(cols)
}

/**
 * Count total number of requests inside a collection and all its descendants
 */
export function countAllRequests(col: CollectionItem): number {
  const selfCount = col.requests ? col.requests.length : 0
  const subCount = (col.children || []).reduce((acc, c) => acc + countAllRequests(c), 0)
  return selfCount + subCount
}

/**
 * Count total number of sub-collections inside a collection and all its descendants
 */
export function countAllSubCollections(col: CollectionItem): number {
  const directChildren = col.children ? col.children.length : 0
  const nestedCount = (col.children || []).reduce((acc, c) => acc + countAllSubCollections(c), 0)
  return directChildren + nestedCount
}

/**
 * Filter collection tree by search query (returns tree with matching nodes and their ancestors)
 */
export function filterCollectionTree(cols: CollectionItem[], query: string): CollectionItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return cols

  const filterNode = (col: CollectionItem): CollectionItem | null => {
    const nameMatches = col.name.toLowerCase().includes(q)
    const matchingRequests = col.requests.filter(
      (r) => r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q)
    )

    const matchingChildren: CollectionItem[] = []
    if (col.children && col.children.length > 0) {
      for (const child of col.children) {
        const filteredChild = filterNode(child)
        if (filteredChild) {
          matchingChildren.push(filteredChild)
        }
      }
    }

    // Retain node if it matches, or any of its requests match, or any of its children match
    if (nameMatches || matchingRequests.length > 0 || matchingChildren.length > 0) {
      return {
        ...col,
        requests: nameMatches ? col.requests : matchingRequests,
        children: matchingChildren
      }
    }

    return null
  }

  const result: CollectionItem[] = []
  for (const c of cols) {
    const filtered = filterNode(c)
    if (filtered) result.push(filtered)
  }
  return result
}

/**
 * Collect all collection IDs in the tree
 */
export function collectAllCollectionIds(cols: CollectionItem[]): string[] {
  const ids: string[] = []
  const recurse = (list: CollectionItem[]) => {
    for (const c of list) {
      ids.push(c.id)
      if (c.children && c.children.length > 0) {
        recurse(c.children)
      }
    }
  }
  recurse(cols)
  return ids
}

/**
 * Recursively collect all requests inside a collection and its child collections
 */
export function collectAllRequests(col: CollectionItem): RequestItem[] {
  let list: RequestItem[] = [...(col.requests || [])]
  if (col.children && col.children.length > 0) {
    for (const child of col.children) {
      list = list.concat(collectAllRequests(child))
    }
  }
  return list
}
