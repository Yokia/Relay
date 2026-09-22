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

export const APP_VERSION = '1.1.0'

export const CHANGELOG_DATA: ReleaseNote[] = [
  {
    version: '1.1.0',
    date: '2026-09-22',
    titleZh: '媒体文件保存优化、参数标签记忆与开发者工具箱增强',
    titleEn: 'Media Save Improvements, Param Tab Persistence & DevToys Enhancements',
    descriptionZh: '本次更新重点优化了媒体资源保存体验、标签页操作稳定性以及更强大的开发者实用工具箱。',
    descriptionEn: 'This update brings enhanced media export workflows, persistent input tabs, and powerful new DevToys capabilities.',
    changes: [
      {
        type: 'perf',
        textZh: '预览页媒体（视频、图片、音频、PDF 等）保存文件名优先自动从 URL 资源路径或 Content-Disposition 提取，无需手动输入',
        textEn: 'Preview media (videos, images, audio, PDF) filenames are now automatically extracted from the download URL or Content-Disposition header'
      },
      {
        type: 'fix',
        textZh: '修复 Windows 系统下保存媒体时文件类型被固定为 HTML 的问题，根据文件格式精确匹配对应过滤器（如 MP4、JPG、PNG 等）',
        textEn: 'Fixed Windows save dialog sticking to HTML Document when saving media; now accurately filters by format (MP4, PNG, JPG, PDF, etc.)'
      },
      {
        type: 'perf',
        textZh: '输入参数区域（Params、Headers、Body、Auth 等）自动记忆上次选中状态，重启应用或新建标签页不再默认重置为 Params',
        textEn: 'The request editor now remembers your last selected tab (Params, Headers, Body, Auth, etc.) across restarts and new tabs'
      },
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
        textZh: 'URL 地址栏与变量弹窗优先展示常量选项的自定义中文备注（optionNotes），使环境与常用参数切换一目了然',
        textEn: 'URL variable pill badges and tooltips now prioritize option notes over generic descriptions for clearer context'
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
