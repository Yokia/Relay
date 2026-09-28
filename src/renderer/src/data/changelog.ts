export type ChangeType = 'feat' | 'fix' | 'perf'

export interface ChangeItem {
  type: ChangeType
  textZh: string
  textEn: string
}

export interface ReleaseNote {
  version: string
  date: string
  titleZh: string
  titleEn: string
  descriptionZh?: string
  descriptionEn?: string
  changes: ChangeItem[]
}

export const APP_VERSION = '1.3.0'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '1.3.0',
    date: '2026-09-28',
    titleZh: 'WebSocket 实时双向调试与消息过滤、轻量接口压测基准测试、自定义快捷键、加解密工具箱与标签管理升级',
    titleEn: 'WebSocket Realtime Debugger & Filtering, Benchmark Mode, Custom Shortcuts, Crypto Tools & Tab Pinning',
    descriptionZh: '本次 v1.3.0 重磅更新：新增 WebSocket (WS/WSS) 协议实时双向通信调试与智能参数消息屏蔽过滤、集合运行器全新引入压测基准测试模式（Benchmark Mode）、设置中心支持交互式自定义快捷键录制与冲突检测、DevToys 上线全能加解密工具箱，并全面升级多标签固定防误关与颜色标记。',
    descriptionEn: 'Major release v1.3.0 introduces real-time WebSocket (WS/WSS) debugging with custom parameter message filtering, Benchmark performance mode in Collection Runner, interactive custom shortcut recorder with conflict detection, comprehensive Crypto toolbox in DevToys, and tab pinning with 7-color badges.',
    changes: [
      {
        type: 'feat',
        textZh: '新增 WebSocket (WS / WSS) 实时双向调试功能，Node.js 原生主进程套接字内核，支持自定义握手请求头（Headers）、子协议与 SSL 证书校验',
        textEn: 'Added WebSocket (WS/WSS) real-time debugger backed by native Node.js socket engine with custom handshake headers, subprotocols, and SSL verification options'
      },
      {
        type: 'feat',
        textZh: 'WebSocket 支持实时消息流分类查看（全部/接收/发送/系统事件）、JSON 语法高亮与格式化、心跳保活探测、断线重连与常用消息预设模板',
        textEn: 'WebSocket message timeline supports directional filters, JSON formatting, configurable heartbeats (Ping/Pong), auto-reconnect, and reusable message presets'
      },
      {
        type: 'feat',
        textZh: 'WebSocket 支持消息自定义参数与关键词屏蔽过滤，支持子串与深层 JSON 键名智能匹配，提供快捷总开关与各规则独立勾选生效机制',
        textEn: 'Added WebSocket message blocking filter supporting custom parameters and keywords, deep JSON key matching, toolbar master switch, and per-rule checkboxes'
      },
      {
        type: 'feat',
        textZh: '集合测试器（Runner）新增压测与性能基准测试模式（Benchmark Mode），支持高并发请求模拟、按请求数或持续时长压测，实时统计 RPS、分位数（P50/P90/P99）与耗时分布',
        textEn: 'Introduced Benchmark Mode in Collection Runner for lightweight performance testing with concurrency, duration, RPS metrics, and latency percentiles (P50/P90/P99)'
      },
      {
        type: 'feat',
        textZh: '设置中心新增自定义快捷键管理，支持 8 项高频核心操作交互式按键录制、按键冲突检测提示、单项重置与全局恢复默认，界面按键提示动态同步',
        textEn: 'Added custom keybinding manager in Settings with interactive shortcut recorder, conflict detection, single-reset, and global defaults'
      },
      {
        type: 'feat',
        textZh: 'DevToys 开发者工具箱新增全能加解密与签名工具，涵盖 MD5/SHA 哈希摘要、HMAC 签名校验、AES/DES 对称加解密及 Hex 进制互转，并在脚本沙箱中注入 CryptoJS 与 crypto 全局对象',
        textEn: 'Added comprehensive Crypto Tools in DevToys (Hash, HMAC, AES/DES cipher, Hex) and injected CryptoJS & crypto helper into pre/test script sandboxes'
      },
      {
        type: 'feat',
        textZh: '标签栏新增固定标签（Pin Tab）与 7 种主题颜色标记，固定标签靠左排列并免受批量关闭误伤，提升多接口并发排查效率',
        textEn: 'Added Tab Pinning and 7-color labels, keeping pinned tabs on the left and protected from batch closure operations'
      },
      {
        type: 'feat',
        textZh: '参数输入区域（Params/Headers/Body）支持 JSON 格式与语法错误实时红色波浪线高亮标注，并在错误气泡中提供一键快速修复',
        textEn: 'CodeEditor now highlights JSON syntax errors with real-time red wavy underlines and offers one-click quick fix in hover tooltips'
      },
      {
        type: 'feat',
        textZh: '标签页右键菜单新增“关闭左侧标签页”，并在关闭包含未保存修改的草稿标签时弹出确认与快速入库弹窗，防止误关丢失数据',
        textEn: 'Added "Close Tabs to the Left" in tab context menu and introduced an unsaved changes confirmation modal to prevent accidental loss'
      },
      {
        type: 'perf',
        textZh: '优化响应查看器与弹窗中重复按下 Ctrl+F 时的搜索框焦点重获与划词带入逻辑，消除原生快捷键事件冲突',
        textEn: 'Optimized search bar focus and text selection populating on repeated Ctrl+F triggers across all response viewports'
      }
    ]
  },
  {
    version: '1.2.0',
    date: '2026-09-22',
    titleZh: 'URL与参数双向同步、应用内自动检测更新、测试器布局优化与快捷键增强',
    titleEn: 'Bi-directional URL/Params Sync, In-App Auto-Update, Runner Improvements & Shortcut Enhancements',
    descriptionZh: '本次更新带来 URL 与 Query 参数的实时双向绑定解析、基于 GitHub Releases 的一键在线更新覆盖安装、集合测试器变量替换优化以及更宽敞自适应的参数编辑体验。',
    descriptionEn: 'This update brings real-time bi-directional URL/query parameters synchronization, in-app updates via GitHub Releases, enhanced collection runner UX, and auto-expanding parameter editors.',
    changes: [
      {
        type: 'feat',
        textZh: 'URL 地址栏与 Params 参数表格实现实时双向同步，粘贴/输入带参链接自动补齐表格，编辑表格或勾选开关实时更新地址栏',
        textEn: 'Bi-directional synchronization between URL address bar and Params table with automatic parsing and real-time query updates'
      },
      {
        type: 'feat',
        textZh: '集成 GitHub Releases 应用内自动检测更新与一键覆盖安装，支持显示更新日志、下载进度百分比与下载速度指示',
        textEn: 'Integrated in-app update checks and silent downloads via GitHub Releases with release notes and real-time progress indicators'
      },
      {
        type: 'feat',
        textZh: '全面同步并扩充帮助文档，涵盖前置脚本、测试断言、常用代码片段、开发者工具箱及自动更新使用指南',
        textEn: 'Updated help documentation covering Pre-request scripts, Test assertions, DevToys toolbox, and auto-updater guides'
      },
      {
        type: 'perf',
        textZh: '请求发送端自动识别并排除 URL 中已有的 Query 参数键，杜绝底层 Axios 对相同参数的重复拼接',
        textEn: 'Optimized request dispatcher to exclude query keys already in the URL, preventing Axios from duplicating parameters'
      },
      {
        type: 'perf',
        textZh: '参数与请求头表格（KeyValueEditor）取消固定高度限制，自动向下占满剩余空白空间并支持表头吸顶（Sticky Header）',
        textEn: 'Removed fixed height limits on KeyValueEditor, allowing params and headers to naturally expand with sticky header columns'
      },
      {
        type: 'perf',
        textZh: '集合测试器（Runner）优化界面布局为标题第一行、地址第二行突出显示，并在批量运行时将变量替换为真实请求值',
        textEn: 'Collection runner now displays title on the first row and highlighted URL on the second row, resolving template variables to real values'
      },
      {
        type: 'fix',
        textZh: '修复全局 Ctrl+Enter 快捷发送请求失效问题，并在发送按钮后追加清晰的快捷键提示',
        textEn: 'Fixed Ctrl+Enter shortcut failing in various focus states and added clear shortcut badges on the Send button'
      }
    ]
  },
  {
    version: '1.1.0',
    date: '2026-09-22',
    titleZh: '媒体文件保存优化、参数标签记忆与开发者工具箱增强',
    titleEn: 'Media Save Improvements, Param Tab Persistence & DevToys Enhancements',
    descriptionZh: '本次更新重点优化了媒体资源保存体验、标签页操作稳定性以及更强大的开发者实用工具箱。',
    descriptionEn: 'This update brings enhanced media export workflows, persistent input tabs, and powerful new DevToys capabilities.',
    changes: [
      {
        type: 'feat',
        textZh: '开发者工具箱新增多语言文本与代码翻译工具，支持免配置免费引擎、进阶 AI 接口与多种变量命名风格（camelCase、snake_case 等）快速转换',
        textEn: 'Added multi-engine translation in DevToys with zero-config free engine, advanced AI support, and instant code variable naming conversions'
      },
      {
        type: 'feat',
        textZh: '开发者工具箱转义解码工具支持换行符与制表符（\\n、\\t）一键展开格式化与折叠还原，排查转义日志更清晰',
        textEn: 'DevToys Escape tool now supports one-click expansion and collapsing of escaped newlines and tabs (\\n, \\t) for log inspection'
      },
      {
        type: 'feat',
        textZh: '请求头 Headers 支持直接批量导入从浏览器开发者工具（Network 面板）复制的原始 Header 文本',
        textEn: 'Headers editor now supports one-click bulk import from raw text copied directly from browser DevTools Network panel'
      },
      {
        type: 'feat',
        textZh: '集合支持导出包含真实 cURL 请求命令的离线交互式 HTML 与 Markdown 格式 API 接口文档',
        textEn: 'Collections can now be exported into standalone offline interactive HTML and Markdown API documentation with cURL commands'
      },
      {
        type: 'perf',
        textZh: '预览页媒体（视频、图片、音频、PDF 等）保存文件名优先自动从 URL 资源路径或 Content-Disposition 提取，无需手动输入',
        textEn: 'Preview media (videos, images, audio, PDF) filenames are now automatically extracted from the download URL or Content-Disposition header'
      },
      {
        type: 'perf',
        textZh: '输入参数区域（Params、Headers、Body、Auth 等）自动记忆上次选中状态，重启应用或新建标签页不再默认重置为 Params',
        textEn: 'The request editor now remembers your last selected tab (Params, Headers, Body, Auth, etc.) across restarts and new tabs'
      },
      {
        type: 'perf',
        textZh: 'URL 地址栏与变量弹窗优先展示常量选项的自定义中文备注（optionNotes），使环境与常用参数切换一目了然',
        textEn: 'URL variable pill badges and tooltips now prioritize option notes over generic descriptions for clearer context'
      },
      {
        type: 'fix',
        textZh: '修复 Windows 系统下保存媒体时文件类型被固定为 HTML 的问题，根据文件格式精确匹配对应过滤器（如 MP4、JPG、PNG 等）',
        textEn: 'Fixed Windows save dialog sticking to HTML Document when saving media; now accurately filters by format (MP4, PNG, JPG, PDF, etc.)'
      },
      {
        type: 'fix',
        textZh: '修复新建标签页时由于合成事件对象引发的循环引用序列化错误及页面白屏问题',
        textEn: 'Fixed a circular reference serialization error and white-screen issue when opening a new tab'
      },
      {
        type: 'fix',
        textZh: '修复在集合目录树中批量拖动多个请求时只有第一项生效的问题',
        textEn: 'Fixed an issue where dragging multiple requests only moved the first item in the collection tree'
      }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-09-18',
    titleZh: 'Relay 首发正式版：轻量、极速的高性能 API 客户端',
    titleEn: 'Relay 1.0.0 Official Release: Lightweight & Fast API Client',
    descriptionZh: 'Relay 专为开发者打造，提供轻量、极速、无 CORS 跨域拦截的 API 调试体验。',
    descriptionEn: 'Relay is built for developers to deliver a lightweight, ultra-fast, and CORS-free API client experience.',
    changes: [
      {
        type: 'feat',
        textZh: '基于 Electron 原生网络内核，支持 HTTP/HTTPS 全方法请求，彻底摆脱浏览器 CORS 跨域限制',
        textEn: 'Native Electron networking engine supporting all HTTP/HTTPS methods without browser CORS limitations'
      },
      {
        type: 'feat',
        textZh: '支持多工作区标签页（Tabs），支持请求多开、并发发送与独立的未保存草稿状态',
        textEn: 'Multi-tab workspace allowing concurrent requests and independent unsaved drafts'
      },
      {
        type: 'feat',
        textZh: '支持多种请求体格式（JSON、Form-Data、x-www-form-urlencoded、Raw），内置智能注释剥离与代码格式化',
        textEn: 'Supports multiple body types (JSON, Form-Data, urlencoded, Raw) with smart comment stripping and JSON formatting'
      },
      {
        type: 'feat',
        textZh: '动态常量与环境变量体系，支持全局变量插值（{{variable}}）、多选下拉与临时覆盖',
        textEn: 'Dynamic constants & environment system supporting variable interpolation ({{variable}}), presets, and overrides'
      },
      {
        type: 'feat',
        textZh: '集合多级层级树管理与集合自动化批量运行器（Collection Runner），支持前后置脚本与自动测试断言',
        textEn: 'Hierarchical collection management and Collection Runner with pre-request and test assertion scripts'
      },
      {
        type: 'feat',
        textZh: '响应独立多窗口弹窗、响应历史记录追溯对比（Diff）、图片/音视频/HTML/PDF 富媒体实时预览',
        textEn: 'Independent response popout windows, historical diff comparison, and live preview for images, media, HTML, and PDF'
      },
      {
        type: 'feat',
        textZh: '内置开发者实用工具箱（时间戳转换、URL编解码、Base64、JWT 解码、哈希计算、UUID 生成器）',
        textEn: 'Built-in DevToys toolbox with Timestamp converter, URL encode/decode, Base64, JWT inspector, Hash, and UUID generator'
      },
      {
        type: 'feat',
        textZh: '支持中英文界面无缝切换，深色与浅色双主题自适应',
        textEn: 'Seamless bilingual UI (English / Simplified Chinese) with complete dark and light themes'
      }
    ]
  }
]
