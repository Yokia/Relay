import { HelpDocSchema } from './types'

export const helpDocEn: HelpDocSchema = {
  overview: {
    title: '1. Quick Start & UI Overview',
    tag: 'Getting Started',
    keywords: ['intro', 'overview', 'quickstart', 'layout', 'send request', 'lightweight', 'startup', 'api', 'interface'],
    bannerTitle: 'Welcome to Relay — High-Performance API Client for Developers',
    bannerDesc: 'Relay is crafted to leave behind the bloat, slowness, and mandatory logins of traditional API tools like Postman. Featuring millisecond-level cold start, 100% local data storage, zero CORS restrictions, bi-directional resizable split panes, dynamic constant pools, automatic multi-tab state restoration, and batch smoke testing.',
    panelsTitle: 'Three Core Workspace Panels',
    leftNavTitle: 'Left Navigation Bar',
    leftNavDesc: 'Manage request collections (with multi-level nested drag-and-drop), environment variables, full workspace data import/export (cURL / JSON), preferences, and resizable sidebar width.',
    centerEditorTitle: 'Center Request Editor',
    centerEditorDesc: 'HTTP method switching, live parameterized URL preview, Query parameters, Headers, JSON/UrlEncoded Body with // comments support, and multi-language code generation.',
    rightPanelTitle: 'Right Response Panel',
    rightPanelDesc: 'Multi-run execution history (Runs switcher), status code, latency, payload size, Pretty/Raw syntax highlighting, one-click copy, and popout window view.',
    firstRequestTitle: 'Sending Your First Request',
    step1Prefix: 'Click the',
    step1Btn: '+ (New Request)',
    step1Or: 'button at the top of the left sidebar, or press',
    step2Prefix: 'Enter the target URL in the address bar, for example',
    step3Prefix: 'Click the prominent blue',
    step3Btn: 'Send',
    step3Or: 'button on the right, or press',
    step4: 'The response panel on the right will immediately display the returned JSON payload, response headers, and latency metrics!'
  },
  requestBuilder: {
    title: '2. Request Builder & Dynamic Variables',
    tag: 'Key Feature',
    keywords: ['constants', 'variables', 'override', 'url', 'dynamic variables', 'json comments', 'body', 'query', 'params', 'headers'],
    constantsTitle: 'Dynamic Constant Pool & Per-Request Overrides (Unique Feature)',
    constantsDesc: 'Relay offers a powerful global dynamic constant system. Reference variables dynamically in URLs, Query parameters, Headers, or Request Bodies using the {{variableName}} placeholder syntax.',
    urlExampleComment: '// URL Example',
    previewExampleComment: '// Live preview of resolved actual URL:',
    presetCandidatesTitle: 'Preset Candidate Values & Descriptive Notes',
    presetCandidatesDesc: 'Each constant can have multiple preset candidate values (e.g. Local 127.0.0.1, Dev 192.168.1.100, Production domain) with descriptive notes. Click the constant pill in the URL bar to switch values with one click!',
    overrideTitle: 'Per-Request Custom Overrides (Per-Request Override)',
    overrideDesc: 'When a specific endpoint requires a fixed port like 8008 or a unique Auth Token, you can define a per-request override. It won\'t pollute the global constant pool and is clearly highlighted on the variable pill.',
    jsonCommentsTitle: 'Native Support for JSON Comments & Auto-Formatting',
    jsonCommentsDesc: 'When debugging complex JSON payloads, developers often need to temporarily comment out fields or leave troubleshooting notes. Relay\'s code editor natively supports both',
    singleLineComment: '// Single-line comment',
    multiLineComment: '/* Multi-line comment */',
    smartProtectionTip: 'Smart Request Protection: When sending requests, the underlying engine automatically strips all comments and converts the payload into RFC-compliant strict JSON for network transmission, keeping your original comments completely intact in the editor.'
  },
  multiTabs: {
    title: '3. Multi-Tab Workflow & State Restoration',
    tag: 'Productivity',
    keywords: ['tabs', 'multi-tab', 'close tab', 'restore', 'draft', 'persistence', 'ctrl+w', 'ctrl+t'],
    heading: 'Modern Browser-Grade Multi-Tab Experience',
    desc: 'Relay supports opening multiple API tabs simultaneously with zero switching latency and completely isolated editing states.',
    newTabTitle: 'New Tab (Ctrl+T)',
    newTabDesc: 'Instantly open a blank request tab for quick experimentation without overwriting your current work.',
    closeTabTitle: 'Close Tab (Ctrl+W)',
    closeTabDesc: 'Close the active tab; closing the last remaining tab resets it to a fresh, ready-to-use request.',
    contextMenuTitle: 'Right-Click Context Menu',
    contextMenuDesc: 'Right-click any tab to access "Close Others", "Close Tabs to the Right", and "Close All Tabs".',
    unsavedTitle: 'Unsaved Indicators & Draft Protection',
    unsavedDesc: 'When tab content is modified without saving, an amber indicator dot appears beside the request name. Unsaved drafts are preserved when switching tabs.',
    stateRestorationTitle: '✨ Automatic State Restoration across Restarts',
    stateRestorationDesc: 'Even if the app is closed abruptly or the system reboots, Relay automatically restores all open tabs, active tab selection, and unsaved draft content on next launch—no need to search and reopen requests from the collection tree!'
  },
  collectionRunner: {
    title: '4. Smoke Testing & Collection Runner',
    tag: 'Testing',
    keywords: ['runner', 'batch run', 'smoke test', 'test report', 'automation', 'collection test', 'multi-select'],
    heading: 'One-Click Smoke & Regression Testing',
    desc: 'Before releases, environment migrations, or deployments, use the Collection Runner to run automated serial regression tests across all requests in a collection or a cherry-picked subset.',
    method1Title: 'Method 1: Run Entire Folder / Collection',
    method1Desc: 'Hover over any collection name in the left sidebar and click the green ▶ Run button (or right-click and choose "Run Collection") to load all requests from the collection and sub-collections into the execution queue.',
    method2Title: 'Method 2: Multi-Select Cherry Pick',
    method2Desc: 'Hold Ctrl or Shift to select multiple key requests across the tree, then right-click and choose "Run Selected Requests (N)" for fast, targeted verification!',
    reportsHeading: 'Test Reports & Metric Inspection',
    itemDashboardTitle: 'Real-Time Dashboard',
    itemDashboardDesc: 'Visual dashboard showing total requests, passed (2xx), failed, total time, average latency, and status code distribution histogram.',
    itemStopOnErrorTitle: 'Stop on Error & Delay',
    itemStopOnErrorDesc: 'Configure request interval delay (ms) and toggle the "Stop on Error" fail-fast protection mechanism.',
    itemPopoutTitle: 'Full-Screen Popout Inspection',
    itemPopoutDesc: 'Each result item in the list provides an "Open in New Window" button to inspect response bodies and headers in a spacious popout window.',
    itemExportTitle: 'Export Reports',
    itemExportDesc: 'Export comprehensive test reports in standard JSON format for archival or sharing with teammates.'
  },
  historyPopout: {
    title: '5. Request History & Popout Windows',
    tag: 'Multi-Window',
    keywords: ['history', 'popout', 'new window', 'snapshot', 'response snapshot', 'multi-window'],
    heading: 'Persistent History & Response Snapshots',
    desc: 'Relay automatically logs details for every executed request, persisting up to the 50 most recent records. Each record preserves the resolved effective URL, query params, headers, body, and the real server response snapshot captured at that exact moment.',
    popoutHeading: 'Multi-Window Popout Viewing (Popout Window)',
    popoutDesc: 'Click "History (with count badge)" at the top right of the request panel to launch the history viewer in a separate window:',
    filterCardTitle: 'Multi-Filter Search',
    filterCardDesc: 'Filter dynamically in milliseconds by URL path, HTTP method (GET/POST/PUT...), and status code category (2xx success / 4xx, 5xx error).',
    restoreCardTitle: 'Restore to Main Workspace',
    restoreCardDesc: 'Locate a history record and click "Open in Main Window" in the top right—Relay automatically opens a new tab with all parameters and URL prefilled!'
  },
  commandPalette: {
    title: '6. Command Palette & Quick Open',
    tag: 'Quick Action',
    keywords: ['command palette', 'ctrl+p', 'quick open', 'fuzzy search', 'search requests'],
    heading: 'Press Ctrl+P to Jump to Any Request Instantly',
    desc: 'When your workspace contains dozens or hundreds of requests nested deep in folders, manual browsing is slow. Relay includes a VS Code-style Quick Open Command Palette:',
    triggerDesc: 'Trigger the centered global search modal anytime, anywhere in the app',
    fuzzyDesc: 'Search by request name, URL keywords, HTTP method, or parent collection folder name',
    keyboardDesc: 'Use Up/Down arrow keys to navigate, press',
    keyboardAction: 'to open instantly, and press',
    keyboardEsc: 'to dismiss'
  },
  codeAndData: {
    title: '7. Code Generation & Data Migration',
    tag: 'Collaboration',
    keywords: ['code snippets', 'code generation', 'curl', 'data migration', 'export', 'import', 'backup', 'axios', 'fetch', 'python'],
    codeHeading: 'Multi-Language Client Code Generation (Code Snippets)',
    codeDesc: 'Click the "Code" button on the request action bar to instantly convert the current request into production-ready client code snippets:',
    languages: ['cURL (Command Line)', 'JavaScript (Fetch)', 'JavaScript (Axios)', 'Python (Requests)', 'Go (net/http)', 'Java (OkHttp)'],
    dataHeading: 'Configuration & Data Migration (Data Transfer)',
    dataDesc: 'Click the bi-directional arrow icon at the top of the left sidebar to access flexible import and export capabilities:',
    backupTitle: 'Full Workspace Backup (Recommended)',
    backupDesc: 'Export a single JSON file containing collections, environment variables, constant pools, and app settings for seamless one-click restoration on a new computer.',
    collectionOnlyTitle: 'Export Collections Only',
    collectionOnlyDesc: 'Export only specific or all request collections to share easily with team members or import into other tools.',
    curlImportTitle: 'One-Click cURL Import',
    curlImportDesc: 'Click the sidebar terminal icon to paste cURL commands copied directly from browser DevTools; Relay automatically parses them into structured requests.'
  },
  layoutCustomization: {
    title: '8. UI & Layout Customization',
    tag: 'Customization',
    keywords: ['layout', 'split pane', 'sidebar width', 'theme', 'dark', 'light', 'drag resize', 'layout memory'],
    heading: 'High-Flexibility Bi-Directional Resizing & Memory',
    sidebarResizeTitle: 'Sidebar Width Adjustment',
    sidebarResizeDesc: 'Hover over the border between the sidebar and editor to grab the horizontal resize handle. Freely drag between 180px and 600px to accommodate lengthy collection or request names.',
    splitPaneResizeTitle: 'Split Pane Ratio Adjustment',
    splitPaneResizeDesc: 'Drag the vertical splitter between the request editor and response panel to allocate visual space according to your debugging needs.',
    globalMemoryTitle: 'Global Dimensions Memory',
    globalMemoryDesc: 'Window dimensions, screen position, maximized state, sidebar width, and split ratio are all saved automatically and restored seamlessly on next launch.',
    dualThemeTitle: 'Dual Dark & Light Themes',
    dualThemeDesc: 'Supports eye-friendly Dark Mode and crisp Light Mode. Toggle anytime via the sun/moon icon in the top right header.'
  },
  shortcutsCheatSheet: {
    title: '9. Keyboard Shortcuts Cheat Sheet',
    tag: 'Essential',
    keywords: ['shortcuts', 'hotkeys', 'cheat sheet', 'ctrl+s', 'ctrl+p', 'ctrl+enter', 'ctrl+d', 'ctrl+t', 'ctrl+w'],
    heading: 'Common Shortcuts Overview',
    thShortcut: 'Shortcut',
    thFunction: 'Function',
    thContext: 'Context / Usage',
    shortcuts: [
      { key: 'Ctrl + Enter', func: 'Send Current Request', context: 'Trigger network request immediately from any input field' },
      { key: 'Ctrl + S', func: 'Save Current Request', context: 'Save current changes back into the collection tree' },
      { key: 'Ctrl + P', func: 'Global Quick Open', context: 'Fuzzy search request names, URLs, or parent collections' },
      { key: 'Ctrl + D', func: 'Duplicate Request', context: 'Clone current request with all configurations in one click' },
      { key: 'Ctrl + T', func: 'New Request Tab', context: 'Open a brand new ready-to-test blank request tab' },
      { key: 'Ctrl + W', func: 'Close Current Tab', context: 'Close the active request tab' },
      { key: 'Ctrl + ,', func: 'Preferences & Settings', context: 'Quickly launch the application settings modal' }
    ]
  },
  faq: {
    title: '10. FAQ & Troubleshooting Guide',
    tag: 'Troubleshooting',
    keywords: ['faq', 'troubleshooting', 'cors', 'certificate', 'ssl', 'self-signed', 'timeout', 'error'],
    heading: 'Frequently Asked Questions',
    items: [
      {
        q: 'Q: Will I encounter browser CORS cross-origin restrictions?',
        a: 'Not at all. Relay uses Electron\'s native Node.js/HTTP network sockets directly, completely bypassing browser Same-Origin Policy restrictions. No CORS browser extensions or backend CORS header configurations are needed.'
      },
      {
        q: 'Q: How to handle self-signed HTTPS certificate errors in local/dev environments?',
        a: 'Click the gear Settings icon at the bottom of the left sidebar (or press Ctrl+,), switch to "Network & Security", and toggle off the "SSL Verification (SSL Verify)" switch.'
      },
      {
        q: 'Q: Why wasn\'t my constant variable replaced correctly?',
        a: 'Ensure variable names match exactly with the constant manager (case-sensitive) and are wrapped in double curly braces, e.g. {{server}}, rather than single braces or full-width symbols.'
      }
    ]
  },
  footerHint: 'Relay · Fast & Modern API Client'
}
