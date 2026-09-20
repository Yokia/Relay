export interface ShortcutEntry {
  key: string
  func: string
  context: string
}

export interface FaqEntry {
  q: string
  a: string
}

export interface HelpDocSchema {
  overview: {
    title: string
    tag: string
    keywords: string[]
    bannerTitle: string
    bannerDesc: string
    panelsTitle: string
    leftNavTitle: string
    leftNavDesc: string
    centerEditorTitle: string
    centerEditorDesc: string
    rightPanelTitle: string
    rightPanelDesc: string
    firstRequestTitle: string
    step1Prefix: string
    step1Btn: string
    step1Or: string
    step2Prefix: string
    step3Prefix: string
    step3Btn: string
    step3Or: string
    step4: string
  }
  requestBuilder: {
    title: string
    tag: string
    keywords: string[]
    constantsTitle: string
    constantsDesc: string
    urlExampleComment: string
    previewExampleComment: string
    presetCandidatesTitle: string
    presetCandidatesDesc: string
    overrideTitle: string
    overrideDesc: string
    jsonCommentsTitle: string
    jsonCommentsDesc: string
    singleLineComment: string
    multiLineComment: string
    smartProtectionTip: string
  }
  multiTabs: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    desc: string
    newTabTitle: string
    newTabDesc: string
    closeTabTitle: string
    closeTabDesc: string
    contextMenuTitle: string
    contextMenuDesc: string
    unsavedTitle: string
    unsavedDesc: string
    stateRestorationTitle: string
    stateRestorationDesc: string
  }
  collectionRunner: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    desc: string
    method1Title: string
    method1Desc: string
    method2Title: string
    method2Desc: string
    reportsHeading: string
    itemDashboardTitle: string
    itemDashboardDesc: string
    itemStopOnErrorTitle: string
    itemStopOnErrorDesc: string
    itemPopoutTitle: string
    itemPopoutDesc: string
    itemExportTitle: string
    itemExportDesc: string
  }
  historyPopout: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    desc: string
    popoutHeading: string
    popoutDesc: string
    filterCardTitle: string
    filterCardDesc: string
    restoreCardTitle: string
    restoreCardDesc: string
  }
  commandPalette: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    desc: string
    triggerDesc: string
    fuzzyDesc: string
    keyboardDesc: string
    keyboardAction: string
    keyboardEsc: string
  }
  codeAndData: {
    title: string
    tag: string
    keywords: string[]
    codeHeading: string
    codeDesc: string
    languages: string[]
    dataHeading: string
    dataDesc: string
    backupTitle: string
    backupDesc: string
    collectionOnlyTitle: string
    collectionOnlyDesc: string
    curlImportTitle: string
    curlImportDesc: string
  }
  layoutCustomization: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    sidebarResizeTitle: string
    sidebarResizeDesc: string
    splitPaneResizeTitle: string
    splitPaneResizeDesc: string
    globalMemoryTitle: string
    globalMemoryDesc: string
    dualThemeTitle: string
    dualThemeDesc: string
  }
  shortcutsCheatSheet: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    thShortcut: string
    thFunction: string
    thContext: string
    shortcuts: ShortcutEntry[]
  }
  faq: {
    title: string
    tag: string
    keywords: string[]
    heading: string
    items: FaqEntry[]
  }
  footerHint: string
}
