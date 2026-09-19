export type DiffLineType = 'added' | 'removed' | 'unchanged'

export interface DiffLine {
  type: DiffLineType
  text: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface SideBySideLine {
  left?: {
    lineNumber: number
    text: string
    type: 'removed' | 'unchanged'
  }
  right?: {
    lineNumber: number
    text: string
    type: 'added' | 'unchanged'
  }
}

export interface DiffResult {
  lines: DiffLine[]
  sideBySide: SideBySideLine[]
  additions: number
  deletions: number
  isIdentical: boolean
}

/**
 * Standard Longest Common Subsequence (LCS) line diff algorithm
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  const oldLines = oldText.split(/\r?\n/)
  const newLines = newText.split(/\r?\n/)

  const n = oldLines.length
  const m = newLines.length

  // LCS dynamic programming table (matrix)
  // For practical response bodies (< 5000 lines), standard LCS is sub-10ms
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build line diff
  const rawDiff: { type: DiffLineType; text: string; oldIdx?: number; newIdx?: number }[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      rawDiff.unshift({
        type: 'unchanged',
        text: oldLines[i - 1],
        oldIdx: i,
        newIdx: j
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.unshift({
        type: 'added',
        text: newLines[j - 1],
        newIdx: j
      })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.unshift({
        type: 'removed',
        text: oldLines[i - 1],
        oldIdx: i
      })
      i--
    }
  }

  let additions = 0
  let deletions = 0
  const lines: DiffLine[] = rawDiff.map((d) => {
    if (d.type === 'added') additions++
    if (d.type === 'removed') deletions++
    return {
      type: d.type,
      text: d.text,
      oldLineNumber: d.oldIdx,
      newLineNumber: d.newIdx
    }
  })

  // Build Side-by-Side aligned pairs
  const sideBySide: SideBySideLine[] = []
  let k = 0
  while (k < rawDiff.length) {
    const item = rawDiff[k]
    if (item.type === 'unchanged') {
      sideBySide.push({
        left: { lineNumber: item.oldIdx!, text: item.text, type: 'unchanged' },
        right: { lineNumber: item.newIdx!, text: item.text, type: 'unchanged' }
      })
      k++
    } else {
      // Gather consecutive removals and additions to align side-by-side
      const removedBlock: typeof rawDiff = []
      const addedBlock: typeof rawDiff = []

      while (k < rawDiff.length && rawDiff[k].type !== 'unchanged') {
        if (rawDiff[k].type === 'removed') {
          removedBlock.push(rawDiff[k])
        } else {
          addedBlock.push(rawDiff[k])
        }
        k++
      }

      const maxLen = Math.max(removedBlock.length, addedBlock.length)
      for (let step = 0; step < maxLen; step++) {
        const rem = removedBlock[step]
        const add = addedBlock[step]
        sideBySide.push({
          left: rem ? { lineNumber: rem.oldIdx!, text: rem.text, type: 'removed' } : undefined,
          right: add ? { lineNumber: add.newIdx!, text: add.text, type: 'added' } : undefined
        })
      }
    }
  }

  return {
    lines,
    sideBySide,
    additions,
    deletions,
    isIdentical: additions === 0 && deletions === 0
  }
}
