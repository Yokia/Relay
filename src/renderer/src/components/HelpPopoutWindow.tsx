import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  BookOpen,
  Search,
  Zap,
  Layers,
  Play,
  History,
  Code,
  ArrowUpDown,
  Sliders,
  Keyboard,
  HelpCircle,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Terminal,
  Compass,
  X
} from 'lucide-react'
import { Theme, Language } from '../types'
import { I18nProvider, useI18n } from '../i18n'
import { ThemeProvider, useTheme } from '../theme'

interface HelpSection {
  id: string
  icon: React.ReactNode
  title: string
  tag?: string
  keywords: string[]
  content: React.ReactNode
}

function HelpContent() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const [activeSectionId, setActiveSectionId] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (id: string) => {
    setActiveSectionId(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const sections: HelpSection[] = [
    {
      id: 'overview',
      icon: <Compass className="w-4 h-4 text-sky-400" />,
      title: '1. 快速入门与界面全景',
      tag: '入门必读',
      keywords: ['入门', '介绍', '界面', '布局', '发送请求', '轻量', '冷启动', 'api', 'overview', 'quickstart'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/25">
            <h4 className="font-semibold text-base text-sky-400 flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-sky-400" />
              欢迎使用 Relay — 专为开发者打造的高性能 API 客户端
            </h4>
            <p className="text-xs text-slate-300 leading-normal">
              Relay 旨在告别 Postman 等传统工具的臃肿、缓慢与登录绑定。毫秒级冷启动、纯本地数据存储、天然无 CORS 跨域拦截限制，并原生支持双向可拖拽分栏、动态常量池、多标签页自动恢复与批量冒烟测试。
            </p>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            核心工作区三大板块
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">左侧导航栏</span>
              <p className="text-xs text-slate-400">
                管理请求集合（支持多层级子目录拖拽）、环境变量、全量数据导入导出（cURL / JSON）、设置中心及侧边栏宽度自由拖拽。
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">中部请求编辑器</span>
              <p className="text-xs text-slate-400">
                HTTP 方法切换、实时带参 URL 预览、Query 参数、Headers、支持双斜杠注释的 JSON/UrlEncoded Body 及客户端代码生成。
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">右侧响应面板</span>
              <p className="text-xs text-slate-400">
                多轮测试运行记录（Runs 历史切换）、状态码、耗时、数据大小、Pretty/Raw 代码高亮着色查看、一键复制及新窗口弹出。
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            首次发送你的第一个请求
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
            <li>在左侧边栏顶部点击 <span className="text-sky-400 font-medium">+ (新建请求)</span> 或直接按下快捷键 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+T</kbd>。</li>
            <li>在 URL 地址栏输入目标地址，例如 <code className="text-sky-400 bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">https://jsonplaceholder.typicode.com/todos/1</code>。</li>
            <li>点击右侧醒目的蓝色 <span className="font-semibold text-sky-400">发送</span> 按钮，或直接按下 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+Enter</kbd>。</li>
            <li>右侧响应面板将立即展示返回的 JSON 结构体、响应头信息及耗时数据！</li>
          </ol>
        </div>
      )
    },
    {
      id: 'request-builder',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      title: '2. 请求构建与动态变量解析',
      tag: '核心亮点',
      keywords: ['常量', '变量', '覆盖值', 'url', '动态变量', 'json注释', 'body', 'query', 'params', 'headers'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            动态常量池与专属覆盖值 (Unique Feature)
          </h3>
          <p className="text-xs text-slate-300">
            Relay 提供强大的全局动态常量系统，可在 URL、Query 参数、Headers 或 Body 中通过 <code className="text-amber-400 bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">&#123;&#123;变量名&#125;&#125;</code> 占位符进行动态引用。
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <div className="text-slate-500">// URL 示例</div>
            <div>&#123;&#123;server&#125;&#125;:&#123;&#123;port&#125;&#125;/api/v1/users?token=&#123;&#123;token&#125;&#125;</div>
            <div className="text-emerald-400 pt-1">// 实时预览解析后真实地址：</div>
            <div className="text-emerald-400 font-semibold">http://127.0.0.1:8008/api/v1/users?token=secret_9881</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-amber-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                常量快捷候选值与中文备注
              </h5>
              <p className="text-xs text-slate-400">
                每个常量可预设多组候选值（如本地 127.0.0.1、开发服 192.168.1.100、线上域名），并标注中文用途。在 URL 中点击常量胶囊，即可一键下拉切换！
              </p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-sky-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                单请求专属覆盖值 (Per-Request Override)
              </h5>
              <p className="text-xs text-slate-400">
                有时某个特殊接口需要固定使用端口 8008 或特定的鉴权 Token。你可以在此请求内单独为其设置专属覆盖值，既不会污染全局常量池，也能在胶囊上清晰标识。
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            原生支持 JSON 单行/多行注释与自动格式化
          </h3>
          <p className="text-xs text-slate-300">
            在调试复杂 JSON 参数时，开发人员常常需要临时注释掉某些字段或留下排错说明。Relay 代码编辑器原生支持 <code className="text-slate-200 bg-slate-800 border border-slate-700/60 px-1 py-0.5 rounded font-mono">// 单行注释</code> 和 <code className="text-slate-200 bg-slate-800 border border-slate-700/60 px-1 py-0.5 rounded font-mono">/* 多行注释 */</code>。
          </p>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-slate-300 leading-relaxed">
            <strong className="text-emerald-400 font-semibold">💡 智能发包保护</strong>：发送网络请求时，底层内核会自动剔除所有注释并转换为严格符合 RFC 规范的纯净 JSON 进行传输，保留用户在编辑器中的原始排错注释完好无损。
          </div>
        </div>
      )
    },
    {
      id: 'multi-tabs',
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      title: '3. 多标签页工作流与状态恢复',
      tag: '效率利器',
      keywords: ['标签页', '多标签', 'tabs', '关闭标签', '恢复', '草稿', '持久化', 'ctrl+w', 'ctrl+t'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            现代化浏览器级多标签体验
          </h3>
          <p className="text-xs text-slate-300">
            Relay 支持同时开启多个接口标签页，不同接口之间切换毫无延迟，编辑状态独立隔离。
          </p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>新建标签 (<kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+T</kbd>)</strong>：随时开启空白请求页进行快速实验，不会覆盖当前正在编辑的接口。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>关闭标签 (<kbd className="px-1 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+W</kbd>)</strong>：关闭当前活动标签；当仅剩最后一个标签时，将重置为一个全新就绪的请求页。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>右键快捷管理</strong>：右键单击任意标签，支持「关闭其他标签页」、「关闭右侧标签页」及「全部关闭」。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
              <span><strong>未保存提示与草稿保护</strong>：当标签内容被修改尚未保存时，标签右侧及请求名旁边会显示醒目的橙色圆点，未保存的草稿在切换标签时始终保留。</span>
            </li>
          </ul>

          <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/60">
            <h5 className="font-semibold text-xs text-sky-400 mb-1">
              ✨ 退出与重启全自动状态记忆 (State Restoration)
            </h5>
            <p className="text-xs text-slate-400">
              即使直接关闭应用或电脑重启，Relay 会在下次启动时完整还原你上次打开的全部标签页、当前选中的活动标签以及所有未保存的临时草稿内容，无需重新从集合树中挨个寻找打开！
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'collection-runner',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      title: '4. 冒烟测试与集合运行器 (Collection Runner)',
      tag: '测试提效',
      keywords: ['runner', '批量运行', '冒烟测试', '测试报告', '自动化', '集合测试', '多选', 'smoke test'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            一键冒烟回归测试
          </h3>
          <p className="text-xs text-slate-300">
            在版本发版、环境迁移或上线前，使用 Collection Runner 能够一键对集合内的所有接口或特定挑选的接口进行全自动串行/间隔压测回归。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60">
              <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400" /> 方式一：整目录一键运行
              </div>
              <p className="text-xs text-slate-400">
                鼠标悬停在左侧任意集合名称上，点击出现的绿色 ▶ 运行按钮（或右键菜单选择「运行集合」），即可把整个集合及子集合内的所有请求一次性装载进运行队列。
              </p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/60">
              <div className="text-xs font-semibold text-sky-400 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" /> 方式二：多选挑选举办冒烟
              </div>
              <p className="text-xs text-slate-400">
                在集合树中按住 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl</kbd> 或 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Shift</kbd> 键多选任意几个重点接口，右键选择「运行选中请求 (N 个)」，快速针对性验证！
              </p>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            测试报告与指标审查
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li><strong>实时执行看板</strong>：直观显示总请求数、成功（2xx）数、失败数、总耗时、平均耗时与状态码分布柱状概览。</li>
            <li><strong>遇错即停与请求延迟</strong>：支持配置请求间隔延迟时间（毫秒），以及勾选「遇错即停 (Stop on error)」保护机制。</li>
            <li><strong>在新窗口全屏审查</strong>：在运行结果列表中，单项结果均提供「在新窗口打开查看」按钮，在新弹窗中全视野对比响应体和响应头。</li>
            <li><strong>一键导出报告</strong>：支持导出标准的 JSON 格式回归测试报告，便于归档或向团队同步。</li>
          </ul>
        </div>
      )
    },
    {
      id: 'history-popout',
      icon: <History className="w-4 h-4 text-purple-400" />,
      title: '5. 历史记录与独立弹窗',
      tag: '多任务',
      keywords: ['历史', '历史记录', '弹窗', '新窗口', '快照', '响应快照', 'history', 'popout'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            持久化历史记录与响应数据快照
          </h3>
          <p className="text-xs text-slate-300">
            Relay 会自动记录每次实际发出的请求详情，最多持久化保存最新的 50 条记录。每条记录均包含了当时解析生效的最终 URL、Query 参数、Headers、Body 以及<strong>当时服务器返回的真实响应体数据快照</strong>。
          </p>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            独立多窗口查看 (Popout Window)
          </h3>
          <p className="text-xs text-slate-300">
            点击请求操作行右上方的「历史 (带条数徽章)」，即可在独立窗口中打开历史记录查看器：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-purple-400 mb-1">复合搜索与过滤</h5>
              <p className="text-xs text-slate-400">
                支持按 URL 路径、请求方法（GET/POST/PUT...）、状态码（2xx 成功 / 4xx、5xx 错误）进行毫秒级实时搜索过滤。
              </p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <h5 className="font-semibold text-xs text-sky-400 mb-1">一键载入主工作区</h5>
              <p className="text-xs text-slate-400">
                在历史弹窗中找到历史记录后，点击右上角的「在主界面打开」，主界面将自动新建标签并载入该请求的全部参数与地址！
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'command-palette',
      icon: <Search className="w-4 h-4 text-sky-400" />,
      title: '6. 全局搜索 (Command Palette)',
      tag: '快捷操作',
      keywords: ['全局搜索', 'ctrl+p', 'quick open', '命令面板', 'command palette', '模糊搜索'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            按下 Ctrl+P 瞬间直达任意接口
          </h3>
          <p className="text-xs text-slate-300">
            当工作区累积了数十甚至上百个接口和深层目录时，逐层寻找极其耗时。Relay 内置了与主流代码编辑器（如 VS Code）一致的 Quick Open 命令面板：
          </p>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono font-semibold">Ctrl+P</kbd>
              <span className="text-slate-400">在界面任意位置随时呼出中央全局搜索弹窗</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sky-400 font-semibold">模糊检索</span>
              <span className="text-slate-400">输入接口名、URL 关键字、请求方法或所属集合目录名</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">键盘操控</span>
              <span className="text-slate-400">使用上下方向键移动光标，按 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Enter</kbd> 立即加载打开，按 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Esc</kbd> 退出</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'code-and-data',
      icon: <Code className="w-4 h-4 text-amber-400" />,
      title: '7. 代码生成器与数据迁移共享',
      tag: '开发协同',
      keywords: ['代码', '代码生成', 'curl', '数据迁移', '导出', '导入', '备份', 'axios', 'fetch', 'python'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            多语言客户端代码生成 (Code Snippets)
          </h3>
          <p className="text-xs text-slate-300">
            在请求操作行点击「代码」按钮，可一键将当前编辑的接口完整转化为可在生产代码中运行的客户端脚本：
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {['cURL (命令行)', 'JavaScript (Fetch)', 'JavaScript (Axios)', 'Python (Requests)', 'Go (net/http)', 'Java (OkHttp)'].map((lang) => (
              <span key={lang} className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-slate-300 font-medium">
                {lang}
              </span>
            ))}
          </div>

          <h3 className="text-base font-bold text-slate-100 mt-6 border-b border-slate-800 pb-2">
            配置与数据迁移 (Data Transfer)
          </h3>
          <p className="text-xs text-slate-300">
            点击左侧边栏顶部的 <ArrowUpDown className="w-3.5 h-3.5 inline text-sky-400" /> 双向箭头图标，支持灵活的导入与导出：
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li><strong>完整工作区备份 (推荐)</strong>：导出包含集合树、环境变量、常量池及应用设置的单个 JSON 文件，方便在新电脑上一键还原。</li>
            <li><strong>仅集合 / 指定单一集合导出</strong>：仅导出选定的接口集合，方便分发给团队同事或接入协同。</li>
            <li><strong>cURL 命令行一键导入</strong>：点击侧边栏终端图标 <Terminal className="w-3.5 h-3.5 inline text-slate-400" />，直接粘贴从浏览器开发者工具复制的 cURL 命令，系统自动识别并一键解析为接口请求。</li>
          </ul>
        </div>
      )
    },
    {
      id: 'layout-customization',
      icon: <Sliders className="w-4 h-4 text-rose-400" />,
      title: '8. 界面与分栏自由定制',
      tag: '个性定制',
      keywords: ['布局', '分栏', '侧边栏宽度', '主题', '暗色', '浅色', '拖拽', '记忆', 'layout'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            高度自由的双向拖拽与视觉记忆
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>最左侧栏宽度调节</strong>：鼠标移动到侧边栏与主编辑区之间的边框，光标将变为水平调节箭头，按住即可在 180px ~ 600px 间自由伸缩侧边栏宽度，适应超长集合/接口名称。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>请求与响应分栏比例调节</strong>：在请求参数区与响应面板之间按住分隔条左右拖拽，按需分配编辑区与响应数据的视野比例。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>全局尺寸记忆</strong>：主窗口大小、屏幕坐标、最大化状态、侧边栏宽度与分割比例均会自动保存，下次启动丝滑恢复。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span><strong>深浅色双主题</strong>：支持深色暗夜护眼模式（Dark）与清爽明亮模式（Light），可点击右上角太阳/月亮图标一键切换。</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'shortcuts-cheat-sheet',
      icon: <Keyboard className="w-4 h-4 text-cyan-400" />,
      title: '9. 完整快捷键速查表',
      tag: '高频必备',
      keywords: ['快捷键', 'shortcuts', 'ctrl+s', 'ctrl+p', 'ctrl+enter', 'ctrl+d', 'ctrl+t', 'ctrl+w'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            常用快捷键一览
          </h3>
          <div className="overflow-hidden border border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">快捷键</th>
                  <th className="px-3 py-2.5">功能说明</th>
                  <th className="px-3 py-2.5">使用场景</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + Enter</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">发送当前请求</td>
                  <td className="px-3 py-2 text-slate-400">光标在任意输入框时立即发送网络请求</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + S</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">保存当前请求</td>
                  <td className="px-3 py-2 text-slate-400">将当前的修改写回集合树中</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + P</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">全局快速搜索</td>
                  <td className="px-3 py-2 text-slate-400">快速模糊检索接口名称、URL 或所属目录</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + D</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">快速复制请求</td>
                  <td className="px-3 py-2 text-slate-400">一键克隆当前打开的接口及其所有参数配置</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + T</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">新建请求标签</td>
                  <td className="px-3 py-2 text-slate-400">开启一个空白就绪的全新接口测试标签页</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + W</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">关闭当前标签</td>
                  <td className="px-3 py-2 text-slate-400">关闭当前正在浏览的标签页</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono font-medium text-sky-400">Ctrl + ,</td>
                  <td className="px-3 py-2 text-slate-200 font-medium">首选项与设置</td>
                  <td className="px-3 py-2 text-slate-400">快速呼出应用设置中心</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      icon: <HelpCircle className="w-4 h-4 text-emerald-400" />,
      title: '10. 常见问题与排错指引 (FAQ)',
      tag: '排错',
      keywords: ['faq', '常见问题', 'cors', '跨域', '证书', 'ssl', '自签名', '超时', '错误'],
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            常见疑问与解答
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
              <h5 className="font-semibold text-xs text-sky-400 mb-1">
                Q: 会遇到浏览器的 CORS 跨域拦截问题吗？
              </h5>
              <p className="text-xs text-slate-300 leading-normal">
                <strong>完全不会。</strong> Relay 底层通过 Electron 主进程原生 Node.js / HTTP 模块直接建立网络套接字连接，不受浏览器同源安全策略（Same-Origin Policy）约束，无需安装任何跨域扩展或后端配置 CORS 头即可畅通调试。
              </p>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
              <h5 className="font-semibold text-xs text-amber-400 mb-1">
                Q: 调试局域网或开发环境的自签名 HTTPS 证书报错怎么办？
              </h5>
              <p className="text-xs text-slate-300 leading-normal">
                点击左侧边栏底部的齿轮设置图标（或按下 <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+,</kbd>），切换至「网络与传输」，将 <strong>SSL 证书校验 (SSL Verify)</strong> 开关关闭即可。
              </p>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
              <h5 className="font-semibold text-xs text-purple-400 mb-1">
                Q: 为什么常量没有被正确替换？
              </h5>
              <p className="text-xs text-slate-300 leading-normal">
                请检查变量名称是否与常量管理弹窗中完全一致（严格区分大小写），且必须使用英文半角双大括号包裹，例如 <code className="text-amber-400 bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded font-mono">&#123;&#123;server&#125;&#125;</code> 而非中文全角括号或单括号。
              </p>
            </div>
          </div>
        </div>
      )
    }
  ]

  // Filter sections according to search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  }, [sections, searchQuery])

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 select-none overflow-hidden font-sans">
      {/* Top Navigation Header */}
      <header className="h-12 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3 font-bold text-sm text-slate-100">
          <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-md shadow-sky-500/20">
            R
          </div>
          <div className="flex flex-col">
            <span className="leading-none text-slate-100 font-bold">{t('help.docsTitle')}</span>
            <span className="text-[10px] text-slate-500 font-normal">{t('help.docsSubtitle')}</span>
          </div>
        </div>

        {/* Global Search inside Docs */}
        <div className="relative w-80 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('help.searchPlaceholder')}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
            title={t('common.toggleTheme')}
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Body: Sidebar Table of Contents + Rich Document Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left TOC Sidebar */}
        <aside className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-slate-800/80 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              {t('help.quickJump')} ({filteredSections.length})
            </span>
            {searchQuery && (
              <span className="text-[10px] text-sky-400 font-normal">{t('help.filtered')}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSections.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {t('help.noResults')}
              </div>
            ) : (
              filteredSections.map((section) => {
                const isActive = activeSectionId === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer group ${
                      isActive
                        ? 'bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {section.icon}
                      <span className="truncate">{section.title}</span>
                    </div>
                    {section.tag && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/60 text-slate-400 shrink-0 font-normal">
                        {section.tag}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Sidebar Footer Hint */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-500 text-center">
            Relay · Fast & Modern API Client
          </div>
        </aside>

        {/* Right Documentation Panels */}
        <main
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 select-text bg-slate-900/30 scroll-smooth"
        >
          {filteredSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm scroll-mt-6"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800 text-sky-400 border border-slate-700/60">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">{section.title}</h2>
                  </div>
                </div>
                {section.tag && (
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                    {section.tag}
                  </span>
                )}
              </div>

              {section.content}
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}

export const HelpPopoutWindow: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('dark')
  const [language, setLanguage] = useState<Language>('zh')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getData().then((data: any) => {
        if (data?.settings?.theme) {
          setTheme(data.settings.theme)
        }
        if (data?.settings?.language) {
          setLanguage(data.settings.language)
        }
      }).catch((err) => {
        console.error('Failed to load settings in Help window', err)
      }).finally(() => {
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium tracking-wider">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <I18nProvider language={language}>
      <ThemeProvider theme={theme} onThemeChange={setTheme}>
        <HelpContent />
      </ThemeProvider>
    </I18nProvider>
  )
}
