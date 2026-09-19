/** Resolve a practical JSONPath subset: $.data.token, [0], ['token'], and *. */
export function queryJsonPath(value: any, expression: string): any {
  if (!expression?.trim()) return value
  const normalized = expression.trim().replace(/^\$\.?/, '')
  if (!normalized) return value
  const tokens = normalized.match(/(?:[^.[\]]+|\[(?:\d+|['"][^'"]+['"]|\*)\])/g) || []
  let values = [value]
  for (const token of tokens) {
    const key = token.replace(/^\[(['"]?)(.*?)\1\]$/, '$2')
    const next: any[] = []
    for (const item of values) {
      if (key === '*') {
        if (Array.isArray(item)) next.push(...item)
        else if (item && typeof item === 'object') next.push(...Object.values(item))
      } else if (item !== null && item !== undefined) {
        const child = item[key]
        if (child !== undefined) next.push(child)
      }
    }
    values = next
  }
  return values.length === 0 ? undefined : values.length === 1 ? values[0] : values
}
