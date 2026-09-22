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

export const APP_VERSION = '1.2.0'

export const CHANGELOG_DATA: ReleaseNote[] = [
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
