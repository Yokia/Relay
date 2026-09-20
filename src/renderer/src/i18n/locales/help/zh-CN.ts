import { HelpDocSchema } from './types'

export const helpDocZh: HelpDocSchema = {
  overview: {
    title: '1. 快速入门与界面全景',
    tag: '入门必读',
    keywords: ['入门', '介绍', '界面', '布局', '发送请求', '轻量', '冷启动', 'api', 'overview', 'quickstart'],
    bannerTitle: '欢迎使用 Relay — 专为开发者打造的高性能 API 客户端',
    bannerDesc: 'Relay 旨在告别 Postman 等传统工具的臃肿、缓慢与登录绑定。毫秒级冷启动、纯本地数据存储、天然无 CORS 跨域拦截限制，并原生支持双向可拖拽分栏、动态常量池、多标签页自动恢复与批量冒烟测试。',
    panelsTitle: '核心工作区三大板块',
    leftNavTitle: '左侧导航栏',
    leftNavDesc: '管理请求集合（支持多层级子目录拖拽）、环境变量、全量数据导入导出（cURL / JSON）、设置中心及侧边栏宽度自由拖拽。',
    centerEditorTitle: '中部请求编辑器',
    centerEditorDesc: 'HTTP 方法切换、实时带参 URL 预览、Query 参数、Headers、支持双斜杠注释的 JSON/UrlEncoded Body 及客户端代码生成。',
    rightPanelTitle: '右侧响应面板',
    rightPanelDesc: '多轮测试运行记录（Runs 历史切换）、状态码、耗时、数据大小、Pretty/Raw 代码高亮着色查看、一键复制及新窗口弹出。',
    firstRequestTitle: '首次发送你的第一个请求',
    step1Prefix: '在左侧边栏顶部点击',
    step1Btn: '+ (新建请求)',
    step1Or: '或直接按下快捷键',
    step2Prefix: '在 URL 地址栏输入目标地址，例如',
    step3Prefix: '点击右侧醒目的蓝色',
    step3Btn: '发送',
    step3Or: '按钮，或直接按下',
    step4: '右侧响应面板将立即展示返回的 JSON 结构体、响应头信息及耗时数据！'
  },
  requestBuilder: {
    title: '2. 请求构建与动态变量解析',
    tag: '核心亮点',
    keywords: ['常量', '变量', '覆盖值', 'url', '动态变量', 'json注释', 'body', 'query', 'params', 'headers'],
    constantsTitle: '动态常量池与专属覆盖值 (Unique Feature)',
    constantsDesc: 'Relay 提供强大的全局动态常量系统，可在 URL、Query 参数、Headers 或 Body 中通过 {{变量名}} 占位符进行动态引用。',
    urlExampleComment: '// URL 示例',
    previewExampleComment: '// 实时预览解析后真实地址：',
    presetCandidatesTitle: '常量快捷候选值与中文备注',
    presetCandidatesDesc: '每个常量可预设多组候选值（如本地 127.0.0.1、开发服 192.168.1.100、线上域名），并标注中文用途。在 URL 中点击常量胶囊，即可一键下拉切换！',
    overrideTitle: '单请求专属覆盖值 (Per-Request Override)',
    overrideDesc: '有时某个特殊接口需要固定使用端口 8008 或特定的鉴权 Token。你可以在此请求内单独为其设置专属覆盖值，既不会污染全局常量池，也能在胶囊上清晰标识。',
    jsonCommentsTitle: '原生支持 JSON 单行/多行注释与自动格式化',
    jsonCommentsDesc: '在调试复杂 JSON 参数时，开发人员常常需要临时注释掉某些字段或留下排错说明。Relay 代码编辑器原生支持',
    singleLineComment: '// 单行注释',
    multiLineComment: '/* 多行注释 */',
    smartProtectionTip: '智能发包保护：发送网络请求时，底层内核会自动剔除所有注释并转换为严格符合 RFC 规范的纯净 JSON 进行传输，保留用户在编辑器中的原始排错注释完好无损。'
  },
  multiTabs: {
    title: '3. 多标签页工作流与状态恢复',
    tag: '效率利器',
    keywords: ['标签页', '多标签', 'tabs', '关闭标签', '恢复', '草稿', '持久化', 'ctrl+w', 'ctrl+t'],
    heading: '现代化浏览器级多标签体验',
    desc: 'Relay 支持同时开启多个接口标签页，不同接口之间切换毫无延迟，编辑状态独立隔离。',
    newTabTitle: '新建标签 (Ctrl+T)',
    newTabDesc: '随时开启空白请求页进行快速实验，不会覆盖当前正在编辑的接口。',
    closeTabTitle: '关闭标签 (Ctrl+W)',
    closeTabDesc: '关闭当前活动标签；当仅剩最后一个标签时，将重置为一个全新就绪的请求页。',
    contextMenuTitle: '右键快捷管理',
    contextMenuDesc: '右键单击任意标签，支持「关闭其他标签页」、「关闭右侧标签页」及「全部关闭」。',
    unsavedTitle: '未保存提示与草稿保护',
    unsavedDesc: '当标签内容被修改尚未保存时，标签右侧及请求名旁边会显示醒目的橙色圆点，未保存的草稿在切换标签时始终保留。',
    stateRestorationTitle: '✨ 退出与重启全自动状态记忆 (State Restoration)',
    stateRestorationDesc: '即使直接关闭应用或电脑重启，Relay 会在下次启动时完整还原你上次打开的全部标签页、当前选中的活动标签以及所有未保存的临时草稿内容，无需重新从集合树中挨个寻找打开！'
  },
  collectionRunner: {
    title: '4. 冒烟测试与集合运行器 (Collection Runner)',
    tag: '测试提效',
    keywords: ['runner', '批量运行', '冒烟测试', '测试报告', '自动化', '集合测试', '多选', 'smoke test'],
    heading: '一键冒烟回归测试',
    desc: '在版本发版、环境迁移或上线前，使用 Collection Runner 能够一键对集合内的所有接口或特定挑选的接口进行全自动串行/间隔压测回归。',
    method1Title: '方式一：整目录一键运行',
    method1Desc: '鼠标悬停在左侧任意集合名称上，点击出现的绿色 ▶ 运行按钮（或右键菜单选择「运行集合」），即可把整个集合及子集合内的所有请求一次性装载进运行队列。',
    method2Title: '方式二：多选挑选举办冒烟',
    method2Desc: '在集合树中按住 Ctrl 或 Shift 键多选任意几个重点接口，右键选择「运行选中请求 (N 个)」，快速针对性验证！',
    reportsHeading: '测试报告与指标审查',
    itemDashboardTitle: '实时执行看板',
    itemDashboardDesc: '直观显示总请求数、成功（2xx）数、失败数、总耗时、平均耗时与状态码分布柱状概览。',
    itemStopOnErrorTitle: '遇错即停与请求延迟',
    itemStopOnErrorDesc: '支持配置请求间隔延迟时间（毫秒），以及勾选「遇错即停 (Stop on error)」保护机制。',
    itemPopoutTitle: '在新窗口全屏审查',
    itemPopoutDesc: '在运行结果列表中，单项结果均提供「在新窗口打开查看」按钮，在新弹窗中全视野对比响应体和响应头。',
    itemExportTitle: '一键导出报告',
    itemExportDesc: '支持导出标准的 JSON 格式回归测试报告，便于归档或向团队同步。'
  },
  historyPopout: {
    title: '5. 历史记录与独立弹窗',
    tag: '多任务',
    keywords: ['历史', '历史记录', '弹窗', '新窗口', '快照', '响应快照', 'history', 'popout'],
    heading: '持久化历史记录与响应数据快照',
    desc: 'Relay 会自动记录每次实际发出的请求详情，最多持久化保存最新的 50 条记录。每条记录均包含了当时解析生效的最终 URL、Query 参数、Headers、Body 以及当时服务器返回的真实响应体数据快照。',
    popoutHeading: '独立多窗口查看 (Popout Window)',
    popoutDesc: '点击请求操作行右上方的「历史 (带条数徽章)」，即可在独立窗口中打开历史记录查看器：',
    filterCardTitle: '复合搜索与过滤',
    filterCardDesc: '支持按 URL 路径、请求方法（GET/POST/PUT...）、状态码（2xx 成功 / 4xx、5xx 错误）进行毫秒级实时搜索过滤。',
    restoreCardTitle: '一键载入主工作区',
    restoreCardDesc: '在历史弹窗中找到历史记录后，点击右上角的「在主界面打开」，主界面将自动新建标签并载入该请求的全部参数与地址！'
  },
  commandPalette: {
    title: '6. 全局搜索 (Command Palette)',
    tag: '快捷操作',
    keywords: ['全局搜索', 'ctrl+p', 'quick open', '命令面板', 'command palette', '模糊搜索'],
    heading: '按下 Ctrl+P 瞬间直达任意接口',
    desc: '当工作区累积了数十甚至上百个接口和深层目录时，逐层寻找极其耗时。Relay 内置了与主流代码编辑器（如 VS Code）一致的 Quick Open 命令面板：',
    triggerDesc: '在界面任意位置随时呼出中央全局搜索弹窗',
    fuzzyDesc: '输入接口名、URL 关键字、请求方法或所属集合目录名',
    keyboardDesc: '使用上下方向键移动光标，按',
    keyboardAction: '立即加载打开，按',
    keyboardEsc: '退出'
  },
  codeAndData: {
    title: '7. 代码生成器与数据迁移共享',
    tag: '开发协同',
    keywords: ['代码', '代码生成', 'curl', '数据迁移', '导出', '导入', '备份', 'axios', 'fetch', 'python'],
    codeHeading: '多语言客户端代码生成 (Code Snippets)',
    codeDesc: '在请求操作行点击「代码」按钮，可一键将当前编辑的接口完整转化为可在生产代码中运行的客户端脚本：',
    languages: ['cURL (命令行)', 'JavaScript (Fetch)', 'JavaScript (Axios)', 'Python (Requests)', 'Go (net/http)', 'Java (OkHttp)'],
    dataHeading: '配置与数据迁移 (Data Transfer)',
    dataDesc: '点击左侧边栏顶部的双向箭头图标，支持灵活的导入与导出：',
    backupTitle: '完整工作区备份 (推荐)',
    backupDesc: '导出包含集合树、环境变量、常量池及应用设置的单个 JSON 文件，方便在新电脑上一键还原。',
    collectionOnlyTitle: '仅集合 / 指定单一集合导出',
    collectionOnlyDesc: '仅导出选定的接口集合，方便分发给团队同事或接入协同。',
    curlImportTitle: 'cURL 命令行一键导入',
    curlImportDesc: '点击侧边栏终端图标，直接粘贴从浏览器开发者工具复制的 cURL 命令，系统自动识别并一键解析为接口请求。'
  },
  layoutCustomization: {
    title: '8. 界面与分栏自由定制',
    tag: '个性定制',
    keywords: ['布局', '分栏', '侧边栏宽度', '主题', '暗色', '浅色', '拖拽', '记忆', 'layout'],
    heading: '高度自由的双向拖拽与视觉记忆',
    sidebarResizeTitle: '最左侧栏宽度调节',
    sidebarResizeDesc: '鼠标移动到侧边栏与主编辑区之间的边框，光标将变为水平调节箭头，按住即可在 180px ~ 600px 间自由伸缩侧边栏宽度，适应超长集合/接口名称。',
    splitPaneResizeTitle: '请求与响应分栏比例调节',
    splitPaneResizeDesc: '在请求参数区与响应面板之间按住分隔条左右拖拽，按需分配编辑区与响应数据的视野比例。',
    globalMemoryTitle: '全局尺寸记忆',
    globalMemoryDesc: '主窗口大小、屏幕坐标、最大化状态、侧边栏宽度与分割比例均会自动保存，下次启动丝滑恢复。',
    dualThemeTitle: '深浅色双主题',
    dualThemeDesc: '支持深色暗夜护眼模式（Dark）与清爽明亮模式（Light），可点击右上角太阳/月亮图标一键切换。'
  },
  shortcutsCheatSheet: {
    title: '9. 完整快捷键速查表',
    tag: '高频必备',
    keywords: ['快捷键', 'shortcuts', 'ctrl+s', 'ctrl+p', 'ctrl+enter', 'ctrl+d', 'ctrl+t', 'ctrl+w'],
    heading: '常用快捷键一览',
    thShortcut: '快捷键',
    thFunction: '功能说明',
    thContext: '使用场景',
    shortcuts: [
      { key: 'Ctrl + Enter', func: '发送当前请求', context: '光标在任意输入框时立即发送网络请求' },
      { key: 'Ctrl + S', func: '保存当前请求', context: '将当前的修改写回集合树中' },
      { key: 'Ctrl + P', func: '全局快速搜索', context: '快速模糊检索接口名称、URL 或所属目录' },
      { key: 'Ctrl + D', func: '快速复制请求', context: '一键克隆当前打开的接口及其所有参数配置' },
      { key: 'Ctrl + T', func: '新建请求标签', context: '开启一个空白就绪的全新接口测试标签页' },
      { key: 'Ctrl + W', func: '关闭当前标签', context: '关闭当前正在浏览的标签页' },
      { key: 'Ctrl + ,', func: '首选项与设置', context: '快速呼出应用设置中心' }
    ]
  },
  faq: {
    title: '10. 常见问题与排错指引 (FAQ)',
    tag: '排错',
    keywords: ['faq', '常见问题', 'cors', '跨域', '证书', 'ssl', '自签名', '超时', '错误'],
    heading: '常见疑问与解答',
    items: [
      {
        q: 'Q: 会遇到浏览器的 CORS 跨域拦截问题吗？',
        a: '完全不会。 Relay 底层通过 Electron 主进程原生 Node.js / HTTP 模块直接建立网络套接字连接，不受浏览器同源安全策略（Same-Origin Policy）约束，无需安装任何跨域扩展或后端配置 CORS 头即可畅通调试。'
      },
      {
        q: 'Q: 调试局域网或开发环境的自签名 HTTPS 证书报错怎么办？',
        a: '点击左侧边栏底部的齿轮设置图标（或按下 Ctrl+,），切换至「网络与传输」，将 SSL 证书校验 (SSL Verify) 开关关闭即可。'
      },
      {
        q: 'Q: 为什么常量没有被正确替换？',
        a: '请检查变量名称是否与常量管理弹窗中完全一致（严格区分大小写），且必须使用英文半角双大括号包裹，例如 {{server}} 而非中文全角括号或单括号。'
      }
    ]
  },
  footerHint: 'Relay · 高性能现代 API 客户端'
}
