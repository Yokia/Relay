import { ShortcutActionId, KeybindingItem, CustomKeybindings } from '../types'

export const DEFAULT_KEYBINDINGS: CustomKeybindings = {
  sendRequest: { ctrl: true, key: 'Enter' },
  saveRequest: { ctrl: true, key: 's' },
  quickOpen: { ctrl: true, key: 'p' },
  duplicateRequest: { ctrl: true, key: 'd' },
  newTab: { ctrl: true, key: 't' },
  closeTab: { ctrl: true, key: 'w' },
  openDevToys: { ctrl: true, shift: true, key: 't' },
  openSettings: { ctrl: true, key: ',' }
}

/**
 * Returns effective keybindings merged with defaults
 */
export function getEffectiveKeybindings(custom?: Partial<CustomKeybindings>): CustomKeybindings {
  return {
    ...DEFAULT_KEYBINDINGS,
    ...(custom || {})
  }
}

/**
 * Checks if a KeyboardEvent matches the target KeybindingItem
 */
export function matchesKeybinding(e: KeyboardEvent, binding?: KeybindingItem): boolean {
  if (!binding || !binding.key) return false

  // Treat Ctrl and Meta (Command on Mac) equivalently for common cross-platform UX
  const wantCtrlOrMeta = Boolean(binding.ctrl || binding.meta)
  const actualCtrlOrMeta = Boolean(e.ctrlKey || e.metaKey)
  if (wantCtrlOrMeta !== actualCtrlOrMeta) return false

  const wantShift = Boolean(binding.shift)
  const actualShift = Boolean(e.shiftKey)
  if (wantShift !== actualShift) return false

  const wantAlt = Boolean(binding.alt)
  const actualAlt = Boolean(e.altKey)
  if (wantAlt !== actualAlt) return false

  const targetKey = binding.key.toLowerCase()
  const actualKey = e.key.toLowerCase()

  // Handle special aliases
  if (targetKey === 'enter' && actualKey === 'enter') return true
  if (targetKey === 'esc' || targetKey === 'escape') {
    return actualKey === 'escape' || actualKey === 'esc'
  }

  return targetKey === actualKey
}

/**
 * Format keybinding into human readable label array, e.g. ['Ctrl', 'Shift', 'T']
 */
export function formatKeybinding(binding?: KeybindingItem): string[] {
  if (!binding || !binding.key) return []
  const parts: string[] = []

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  if (binding.ctrl || binding.meta) {
    parts.push(isMac ? 'Cmd' : 'Ctrl')
  }
  if (binding.alt) {
    parts.push(isMac ? 'Option' : 'Alt')
  }
  if (binding.shift) {
    parts.push('Shift')
  }

  let keyDisplay = binding.key
  if (keyDisplay.length === 1) {
    keyDisplay = keyDisplay.toUpperCase()
  } else {
    // Capitalize first letter
    keyDisplay = keyDisplay.charAt(0).toUpperCase() + keyDisplay.slice(1)
  }

  parts.push(keyDisplay)
  return parts
}

/**
 * Format keybinding into string e.g. 'Ctrl+Enter'
 */
export function formatKeybindingString(binding?: KeybindingItem): string {
  const parts = formatKeybinding(binding)
  return parts.join('+')
}

/**
 * Check if two keybindings are structurally identical
 */
export function areKeybindingsEqual(a?: KeybindingItem, b?: KeybindingItem): boolean {
  if (!a || !b) return a === b
  const aCtrl = Boolean(a.ctrl || a.meta)
  const bCtrl = Boolean(b.ctrl || b.meta)
  if (aCtrl !== bCtrl) return false
  if (Boolean(a.shift) !== Boolean(b.shift)) return false
  if (Boolean(a.alt) !== Boolean(b.alt)) return false
  return a.key.toLowerCase() === b.key.toLowerCase()
}

/**
 * Capture KeyboardEvent and convert to KeybindingItem
 * Returns null if only modifier keys were pressed
 */
export function eventToKeybinding(e: KeyboardEvent): KeybindingItem | null {
  // Ignore bare modifier key presses
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta']
  if (modifierKeys.includes(e.key)) {
    return null
  }

  const isCtrlOrMeta = Boolean(e.ctrlKey || e.metaKey)
  const isShift = Boolean(e.shiftKey)
  const isAlt = Boolean(e.altKey)

  // Must have at least one modifier key OR be a function key (F1-F12) to prevent typing collisions
  const isFunctionKey = /^F[1-9]|F1[0-2]$/i.test(e.key)
  if (!isCtrlOrMeta && !isAlt && !isFunctionKey) {
    return null
  }

  let key = e.key
  if (key === ' ') key = 'Space'

  return {
    ctrl: isCtrlOrMeta,
    shift: isShift,
    alt: isAlt,
    key
  }
}

/**
 * Find if a proposed binding conflicts with another action
 */
export function findConflictingAction(
  targetActionId: ShortcutActionId,
  binding: KeybindingItem,
  allBindings: CustomKeybindings
): ShortcutActionId | null {
  for (const [actionId, otherBinding] of Object.entries(allBindings)) {
    if (actionId === targetActionId) continue
    if (areKeybindingsEqual(binding, otherBinding)) {
      return actionId as ShortcutActionId
    }
  }
  return null
}
