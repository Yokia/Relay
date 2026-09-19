import { CollectionItem, RequestItem, HttpMethod } from '../types'

export interface DocExportOptions {
  title?: string
  description?: string
  collections: CollectionItem[]
  includeCurl?: boolean
  includeScripts?: boolean
  theme?: 'dark' | 'light'
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a cURL snippet from RequestItem
 */
export function generateCurlSnippet(req: RequestItem): string {
  const method = req.method || 'GET'
  const url = req.url || 'http://localhost'
  let cmd = `curl --location --request ${method} '${url}'`

  if (req.headers && req.headers.length > 0) {
    for (const h of req.headers) {
      if (h.enabled && h.key) {
        cmd += ` \\\n  --header '${h.key}: ${h.value || ''}'`
      }
    }
  }

  if (req.bodyType === 'json' && req.bodyRaw) {
    try {
      const parsed = JSON.parse(req.bodyRaw)
      const compact = JSON.stringify(parsed)
      cmd += ` \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '${compact.replace(/'/g, "'\\''")}'`
    } catch {
      cmd += ` \\\n  --header 'Content-Type: application/json' \\\n  --data-raw '${req.bodyRaw.replace(/'/g, "'\\''")}'`
    }
  } else if (req.bodyType === 'form-data' && req.bodyFormData) {
    for (const item of req.bodyFormData) {
      if (item.enabled && item.key) {
        cmd += ` \\\n  --form '${item.key}=${item.value || ''}'`
      }
    }
  } else if (req.bodyType === 'x-www-form-urlencoded' && req.bodyUrlEncoded) {
    for (const item of req.bodyUrlEncoded) {
      if (item.enabled && item.key) {
        cmd += ` \\\n  --data-urlencode '${item.key}=${item.value || ''}'`
      }
    }
  } else if (req.bodyType === 'raw' && req.bodyRaw) {
    cmd += ` \\\n  --data-raw '${req.bodyRaw.replace(/'/g, "'\\''")}'`
  }

  return cmd
}

/**
 * Flattens the collection tree with hierarchical folder names
 */
export interface FlatDocSection {
  folderPath: string
  collectionName: string
  requests: RequestItem[]
}

export function flattenDocTree(collections: CollectionItem[], parentPath = ''): FlatDocSection[] {
  let sections: FlatDocSection[] = []
  if (!Array.isArray(collections)) return sections

  for (const col of collections) {
    if (!col) continue
    const colName = col.name || 'Unnamed Collection'
    const currentPath = parentPath ? `${parentPath} / ${colName}` : colName
    const reqs = Array.isArray(col.requests) ? col.requests : []
    const children = Array.isArray(col.children) ? col.children : []

    if (reqs.length > 0) {
      sections.push({
        folderPath: currentPath,
        collectionName: colName,
        requests: reqs
      })
    }
    if (children.length > 0) {
      sections = sections.concat(flattenDocTree(children, currentPath))
    }
  }

  return sections
}

/**
 * Generate Markdown Document from collections
 */
export function generateMarkdownDoc(options: DocExportOptions): string {
  try {
    const { title = 'API Documentation', description = '', collections = [], includeCurl = true, includeScripts = false } = options || {}
    const sections = flattenDocTree(collections || [])
    const timestamp = new Date().toLocaleString()

    const lines: string[] = []

    // Document Title & Meta
    lines.push(`# ${title || 'API Documentation'}`)
    lines.push('')
    if (description) {
      lines.push(`> ${description}`)
      lines.push('')
    }
    lines.push(`_Exported on: ${timestamp} via Relay API Client_`)
    lines.push('')

    if (sections.length === 0) {
      lines.push('*(该集合中暂未添加任何接口请求)*')
      lines.push('')
      return lines.join('\n')
    }

    // Table of Contents
    lines.push(`## 📑 目录 (Table of Contents)`)
    lines.push('')
    let reqIndex = 1
    for (const section of sections) {
      lines.push(`- **${section.folderPath}**`)
      for (const req of section.requests || []) {
        if (!req) continue
        const method = req.method || 'GET'
        const reqName = req.name || 'Untitled Request'
        const anchor = `req-${req.id || reqIndex}`
        lines.push(`  - [${method}] [${reqName}](#${anchor})`)
        reqIndex++
      }
    }
    lines.push('')
    lines.push('---')
    lines.push('')

  // Document Body
  reqIndex = 1
  for (const section of sections) {
    lines.push(`## 📁 ${section.folderPath}`)
    lines.push('')

    for (const req of section.requests) {
      const anchor = `req-${req.id || reqIndex}`
      lines.push(`### <a id="${anchor}"></a>\`${req.method}\` ${req.name || 'Untitled Request'}`)
      lines.push('')
      lines.push(`**URL:** \`${req.url || '-'}\``)
      lines.push('')

      // Query Parameters
      const enabledParams = req.params?.filter((p) => p.enabled && p.key) || []
      if (enabledParams.length > 0) {
        lines.push(`#### 📌 Query Parameters`)
        lines.push('')
        lines.push(`| 参数名 (Key) | 参数值 (Value) | 说明 (Description) |`)
        lines.push(`| :--- | :--- | :--- |`)
        for (const p of enabledParams) {
          lines.push(`| \`${p.key}\` | \`${p.value || ''}\` | ${p.description || '-'} |`)
        }
        lines.push('')
      }

      // Headers
      const enabledHeaders = req.headers?.filter((h) => h.enabled && h.key) || []
      if (enabledHeaders.length > 0) {
        lines.push(`#### 🏷️ Request Headers`)
        lines.push('')
        lines.push(`| Header | Value | 说明 (Description) |`)
        lines.push(`| :--- | :--- | :--- |`)
        for (const h of enabledHeaders) {
          lines.push(`| \`${h.key}\` | \`${h.value || ''}\` | ${h.description || '-'} |`)
        }
        lines.push('')
      }

      // Request Body
      if (req.bodyType && req.bodyType !== 'none') {
        lines.push(`#### 📦 Request Body (\`${req.bodyType}\`)`)
        lines.push('')
        if (req.bodyType === 'json' && req.bodyRaw) {
          let prettyJson = req.bodyRaw
          try {
            prettyJson = JSON.stringify(JSON.parse(req.bodyRaw), null, 2)
          } catch {
            // keep raw
          }
          lines.push('```json')
          lines.push(prettyJson)
          lines.push('```')
          lines.push('')
        } else if (req.bodyType === 'form-data' && req.bodyFormData?.length) {
          lines.push(`| Key | Value | Type |`)
          lines.push(`| :--- | :--- | :--- |`)
          for (const item of req.bodyFormData.filter((i) => i.enabled && i.key)) {
            lines.push(`| \`${item.key}\` | \`${item.value || ''}\` | text |`)
          }
          lines.push('')
        } else if (req.bodyType === 'x-www-form-urlencoded' && req.bodyUrlEncoded?.length) {
          lines.push(`| Key | Value |`)
          lines.push(`| :--- | :--- |`)
          for (const item of req.bodyUrlEncoded.filter((i) => i.enabled && i.key)) {
            lines.push(`| \`${item.key}\` | \`${item.value || ''}\` |`)
          }
          lines.push('')
        } else if (req.bodyRaw) {
          lines.push('```text')
          lines.push(req.bodyRaw)
          lines.push('```')
          lines.push('')
        }
      }

      // cURL Example
      if (includeCurl) {
        lines.push(`#### 💻 cURL 示例`)
        lines.push('')
        lines.push('```bash')
        lines.push(generateCurlSnippet(req))
        lines.push('```')
        lines.push('')
      }

      // Scripts
      if (includeScripts && (req.preRequestScript || req.testScript)) {
        if (req.preRequestScript) {
          lines.push(`#### ⚡ Pre-request Script`)
          lines.push('')
          lines.push('```javascript')
          lines.push(req.preRequestScript)
          lines.push('```')
          lines.push('')
        }
        if (req.testScript) {
          lines.push(`#### 🧪 Tests Script`)
          lines.push('')
          lines.push('```javascript')
          lines.push(req.testScript)
          lines.push('```')
          lines.push('')
        }
      }

      lines.push('---')
      lines.push('')
      reqIndex++
    }
  }

  return lines.join('\n')
  } catch (err) {
    console.error('generateMarkdownDoc failed:', err)
    return `# API Documentation\n\n> 导出文档发生错误: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Generate Standalone Offline HTML Document
 */
export function generateHtmlDoc(options: DocExportOptions): string {
  try {
    const { title = 'API Documentation', description = '', collections = [], includeCurl = true, includeScripts = false } = options || {}
    const sections = flattenDocTree(collections || [])
    const timestamp = new Date().toLocaleString()

    // Collect stats
    let totalRequests = 0
    for (const s of sections) {
      totalRequests += (s.requests || []).length
    }

    // Generate request cards HTML
    let cardsHtml = ''
    let navItemsHtml = ''
    let reqIndex = 1

    if (sections.length === 0) {
      cardsHtml = `
        <div style="padding: 48px 24px; text-align: center; color: var(--text-muted); background: var(--bg-card); border: 1px dashed var(--border-color); border-radius: 12px; margin-top: 24px;">
          <div style="font-size: 32px; margin-bottom: 12px;">📭</div>
          <div style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">该集合中暂无任何接口请求</div>
          <div style="font-size: 12px;">可在 Relay 客户端中为此集合添加接口后重新导出离线文档。</div>
        </div>
      `
      navItemsHtml = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-sub); font-size: 12px;">
          暂无接口条目
        </div>
      `
    }

    const methodColors: Record<HttpMethod, { bg: string; text: string; border: string }> = {
      GET: { bg: '#059669', text: '#ecfdf5', border: '#10b981' },
      POST: { bg: '#d97706', text: '#fffbeb', border: '#f59e0b' },
    PUT: { bg: '#2563eb', text: '#eff6ff', border: '#3b82f6' },
    DELETE: { bg: '#e11d48', text: '#fff1f2', border: '#f43f5e' },
    PATCH: { bg: '#7c3aed', text: '#f5f3ff', border: '#8b5cf6' },
    HEAD: { bg: '#0891b2', text: '#ecfeff', border: '#06b6d4' },
    OPTIONS: { bg: '#475569', text: '#f8fafc', border: '#64748b' }
  }

  for (const section of sections) {
    const sectionId = `sec-${reqIndex}`
    navItemsHtml += `
      <div class="nav-section">
        <div class="nav-section-title" title="${escapeHtml(section.folderPath)}">
          <svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span>${escapeHtml(section.folderPath)}</span>
        </div>
        <div class="nav-section-items">
    `

    for (const req of section.requests) {
      const anchor = `req-${req.id || reqIndex}`
      const mCol = methodColors[req.method] || methodColors.GET
      navItemsHtml += `
        <a href="#${anchor}" class="nav-link" data-method="${req.method}" data-name="${escapeHtml((req.name || '').toLowerCase())}" data-url="${escapeHtml((req.url || '').toLowerCase())}">
          <span class="method-badge method-${req.method}">${req.method}</span>
          <span class="nav-req-name">${escapeHtml(req.name || 'Untitled Request')}</span>
        </a>
      `

      // Request Card
      const curl = generateCurlSnippet(req)
      const enabledParams = req.params?.filter((p) => p.enabled && p.key) || []
      const enabledHeaders = req.headers?.filter((h) => h.enabled && h.key) || []

      let paramsTableHtml = ''
      if (enabledParams.length > 0) {
        paramsTableHtml = `
          <div class="card-table-wrap">
            <h4 class="card-table-title">Query Parameters (${enabledParams.length})</h4>
            <table class="data-table">
              <thead><tr><th>Key</th><th>Value</th><th>Description</th></tr></thead>
              <tbody>
                ${enabledParams
                  .map(
                    (p) => `<tr>
                      <td class="cell-key"><code>${escapeHtml(p.key)}</code></td>
                      <td class="cell-val"><code>${escapeHtml(p.value || '')}</code></td>
                      <td class="cell-desc">${escapeHtml(p.description || '-')}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
      }

      let headersTableHtml = ''
      if (enabledHeaders.length > 0) {
        headersTableHtml = `
          <div class="card-table-wrap">
            <h4 class="card-table-title">Request Headers (${enabledHeaders.length})</h4>
            <table class="data-table">
              <thead><tr><th>Header</th><th>Value</th><th>Description</th></tr></thead>
              <tbody>
                ${enabledHeaders
                  .map(
                    (h) => `<tr>
                      <td class="cell-key"><code>${escapeHtml(h.key)}</code></td>
                      <td class="cell-val"><code>${escapeHtml(h.value || '')}</code></td>
                      <td class="cell-desc">${escapeHtml(h.description || '-')}</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
      }

      let bodyHtml = ''
      if (req.bodyType && req.bodyType !== 'none') {
        let contentHtml = ''
        if (req.bodyType === 'json' && req.bodyRaw) {
          let pretty = req.bodyRaw
          try {
            pretty = JSON.stringify(JSON.parse(req.bodyRaw), null, 2)
          } catch {}
          contentHtml = `<pre class="code-block"><code>${escapeHtml(pretty)}</code></pre>`
        } else if (req.bodyType === 'form-data' && req.bodyFormData?.length) {
          contentHtml = `
            <table class="data-table">
              <thead><tr><th>Field</th><th>Value</th></tr></thead>
              <tbody>
                ${req.bodyFormData
                  .filter((i) => i.enabled && i.key)
                  .map(
                    (i) => `<tr>
                      <td class="cell-key"><code>${escapeHtml(i.key)}</code></td>
                      <td class="cell-val"><code>${escapeHtml(i.value || '')}</code></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          `
        } else if (req.bodyType === 'x-www-form-urlencoded' && req.bodyUrlEncoded?.length) {
          contentHtml = `
            <table class="data-table">
              <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
              <tbody>
                ${req.bodyUrlEncoded
                  .filter((i) => i.enabled && i.key)
                  .map(
                    (i) => `<tr>
                      <td class="cell-key"><code>${escapeHtml(i.key)}</code></td>
                      <td class="cell-val"><code>${escapeHtml(i.value || '')}</code></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          `
        } else if (req.bodyRaw) {
          contentHtml = `<pre class="code-block"><code>${escapeHtml(req.bodyRaw)}</code></pre>`
        }

        if (contentHtml) {
          bodyHtml = `
            <div class="card-table-wrap">
              <div class="body-header">
                <h4 class="card-table-title">Request Body</h4>
                <span class="badge-tag">${req.bodyType}</span>
              </div>
              ${contentHtml}
            </div>
          `
        }
      }

      let curlHtml = ''
      if (includeCurl) {
        curlHtml = `
          <div class="card-table-wrap">
            <div class="body-header">
              <h4 class="card-table-title">cURL Command</h4>
              <button type="button" class="btn-copy" onclick="copyCode(this)">
                <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
            </div>
            <pre class="code-block curl-block"><code>${escapeHtml(curl)}</code></pre>
          </div>
        `
      }

      let scriptsHtml = ''
      if (includeScripts && (req.preRequestScript || req.testScript)) {
        scriptsHtml = `
          <div class="card-table-wrap">
            <h4 class="card-table-title">Scripts</h4>
            ${
              req.preRequestScript
                ? `<div style="margin-bottom: 8px;"><div class="script-title">Pre-request Script</div><pre class="code-block"><code>${escapeHtml(
                    req.preRequestScript
                  )}</code></pre></div>`
                : ''
            }
            ${
              req.testScript
                ? `<div><div class="script-title">Tests Script</div><pre class="code-block"><code>${escapeHtml(
                    req.testScript
                  )}</code></pre></div>`
                : ''
            }
          </div>
        `
      }

      cardsHtml += `
        <div id="${anchor}" class="api-card">
          <div class="card-header">
            <span class="method-badge method-${req.method}">${req.method}</span>
            <div class="card-header-main">
              <h3 class="card-title">${escapeHtml(req.name || 'Untitled Request')}</h3>
              <div class="url-bar">
                <span class="url-text" title="${escapeHtml(req.url)}">${escapeHtml(req.url || '/')}</span>
                <button type="button" class="url-copy-btn" onclick="copyText('${escapeHtml(req.url)}', this)" title="Copy URL">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>
          </div>
          <div class="card-content">
            ${paramsTableHtml}
            ${headersTableHtml}
            ${bodyHtml}
            ${curlHtml}
            ${scriptsHtml}
          </div>
        </div>
      `
      reqIndex++
    }

    navItemsHtml += `
        </div>
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg-main: #0b1120;
      --bg-sidebar: #0f172a;
      --bg-card: #1e293b;
      --bg-code: #020617;
      --border-color: #334155;
      --border-light: #1e293b;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-sub: #64748b;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --accent-bg: rgba(56, 189, 248, 0.1);
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
    }
    [data-theme="light"] {
      --bg-main: #f8fafc;
      --bg-sidebar: #ffffff;
      --bg-card: #ffffff;
      --bg-code: #f1f5f9;
      --border-color: #e2e8f0;
      --border-light: #f1f5f9;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-sub: #94a3b8;
      --accent: #0284c7;
      --accent-hover: #0369a1;
      --accent-bg: rgba(2, 132, 199, 0.08);
      --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg-main);
      color: var(--text-main);
      display: flex;
      height: 100vh;
      overflow: hidden;
      line-height: 1.5;
    }
    /* Sidebar */
    .sidebar {
      width: 320px;
      min-width: 260px;
      max-width: 400px;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      height: 100%;
    }
    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }
    .app-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 16px;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .doc-meta {
      font-size: 11px;
      color: var(--text-sub);
    }
    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }
    .search-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-main);
      color: var(--text-main);
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
    }
    .nav-section {
      margin-bottom: 14px;
    }
    .nav-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-sub);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .folder-icon {
      width: 13px;
      height: 13px;
      stroke: #f59e0b;
      flex-shrink: 0;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 12px;
      transition: background 0.15s, color 0.15s;
      margin-top: 1px;
    }
    .nav-link:hover {
      background: var(--accent-bg);
      color: var(--accent);
    }
    .nav-req-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Method Badges */
    .method-badge {
      font-size: 9px;
      font-weight: 700;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      min-width: 42px;
      text-align: center;
      display: inline-block;
      letter-spacing: 0.5px;
    }
    .method-GET { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-POST { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .method-PUT { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
    .method-DELETE { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); }
    .method-PATCH { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); }
    .method-HEAD { background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); }
    .method-OPTIONS { background: rgba(100, 116, 139, 0.15); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3); }

    /* Main Container */
    .main-content {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .top-toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-color);
      padding: 12px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .top-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }
    .theme-toggle-btn {
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s, color 0.15s;
    }
    .theme-toggle-btn:hover {
      color: var(--text-main);
      border-color: var(--accent);
    }

    .doc-container {
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      padding: 28px 28px 80px 28px;
    }

    .doc-hero {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }
    .doc-hero-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 8px;
    }
    .doc-hero-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .doc-hero-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-sub);
    }

    /* API Cards */
    .api-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      margin-bottom: 24px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      scroll-margin-top: 70px;
    }
    .card-header {
      padding: 16px 20px;
      background: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .card-header-main {
      flex: 1;
      min-width: 0;
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 6px;
    }
    .url-bar {
      display: flex;
      align-items: center;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 4px 8px;
      gap: 8px;
    }
    .url-text {
      font-family: monospace;
      font-size: 12px;
      color: var(--accent);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .url-copy-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 4px;
    }
    .url-copy-btn:hover {
      color: var(--accent);
    }
    .url-copy-btn svg {
      width: 14px;
      height: 14px;
    }

    .card-content {
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .card-table-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-table-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .body-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .badge-tag {
      font-size: 10px;
      background: var(--accent-bg);
      color: var(--accent);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .btn-copy {
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .btn-copy:hover {
      color: var(--accent);
      border-color: var(--accent);
    }
    .btn-copy svg {
      width: 12px;
      height: 12px;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    .data-table th {
      background: var(--bg-main);
      color: var(--text-muted);
      font-weight: 600;
      padding: 6px 12px;
      border: 1px solid var(--border-color);
      font-size: 11px;
    }
    .data-table td {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      color: var(--text-main);
    }
    .cell-key {
      font-weight: 600;
      color: var(--accent);
      width: 25%;
    }
    .cell-val {
      font-family: monospace;
      color: var(--text-muted);
      width: 35%;
    }
    .cell-desc {
      color: var(--text-muted);
    }

    /* Code Blocks */
    .code-block {
      background: var(--bg-code);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 12px;
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 12px;
      color: #38bdf8;
      overflow-x: auto;
      white-space: pre;
      line-height: 1.4;
    }
    .curl-block {
      color: #34d399;
    }
    .script-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-sub);
      margin-bottom: 4px;
    }

    /* Toast Notification */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0284c7;
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      transform: translateY(8px);
      z-index: 100;
    }
    #toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="app-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>Relay API Docs</span>
      </div>
      <div class="doc-meta">Generated by Relay • ${escapeHtml(timestamp)}</div>
    </div>
    <div class="search-box">
      <input type="text" id="searchInput" class="search-input" placeholder="🔍 搜索接口名、URL 或 Method..." oninput="filterNav()">
    </div>
    <nav class="sidebar-nav" id="sidebarNav">
      ${navItemsHtml}
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <div class="top-toolbar">
      <span class="top-title">${escapeHtml(title)}</span>
      <button type="button" class="theme-toggle-btn" onclick="toggleTheme()">
        <span id="themeBtnText">☀️ 浅色主题</span>
      </button>
    </div>

    <div class="doc-container">
      <div class="doc-hero">
        <h1 class="doc-hero-title">${escapeHtml(title)}</h1>
        ${description ? `<p class="doc-hero-desc">${escapeHtml(description)}</p>` : ''}
        <div class="doc-hero-stats">
          <span>📦 集合分组: <strong>${sections.length}</strong></span>
          <span>⚡ 接口总数: <strong>${totalRequests}</strong></span>
          <span>🕒 导出时间: <strong>${escapeHtml(timestamp)}</strong></span>
        </div>
      </div>

      <div id="cardsContainer">
        ${cardsHtml}
      </div>
    </div>
  </main>

  <div id="toast">Copied to clipboard!</div>

  <script>
    // Copy text utility
    function copyText(text, btn) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        showToast('URL 已复制到剪贴板');
      });
    }

    // Copy code utility
    function copyCode(btn) {
      const codeBlock = btn.closest('.card-table-wrap').querySelector('code');
      if (!codeBlock) return;
      navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        showToast('代码已复制到剪贴板');
      });
    }

    // Show Toast
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => {
        t.classList.remove('show');
      }, 2000);
    }

    // Toggle Theme
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      document.getElementById('themeBtnText').innerText = next === 'dark' ? '☀️ 浅色主题' : '🌙 深色主题';
    }

    // Filter Search
    function filterNav() {
      const query = document.getElementById('searchInput').value.trim().toLowerCase();
      const links = document.querySelectorAll('.nav-link');
      const sections = document.querySelectorAll('.nav-section');

      links.forEach(link => {
        const name = link.getAttribute('data-name') || '';
        const url = link.getAttribute('data-url') || '';
        const method = (link.getAttribute('data-method') || '').toLowerCase();
        const match = !query || name.includes(query) || url.includes(query) || method.includes(query);
        link.style.display = match ? 'flex' : 'none';
      });

      sections.forEach(sec => {
        const visibleLinks = sec.querySelectorAll('.nav-link[style="display: flex;"]');
        sec.style.display = (query && visibleLinks.length === 0) ? 'none' : 'block';
      });
    }
  </script>
</body>
</html>`
  } catch (err) {
    console.error('generateHtmlDoc failed:', err)
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Error</title></head><body style="font-family:sans-serif;padding:32px;background:#0b1120;color:#f1f5f9;"><h2>生成文档出错</h2><p>${escapeHtml(
      err instanceof Error ? err.message : String(err)
    )}</p></body></html>`
  }
}
