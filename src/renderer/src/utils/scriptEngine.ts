import { RequestItem, ResponseData, TestResultItem, KeyValueItem, Environment } from '../types'

export interface ScriptExecutionContext {
  request: RequestItem
  activeEnv?: Environment
  response?: ResponseData
  // In-memory variable bag shared across pre-request and tests
  variables?: Record<string, string>
}

export interface ScriptExecutionResult {
  modifiedRequest?: Partial<RequestItem>
  envUpdates?: { key: string; value: string }[]
  logs: string[]
  testResults: TestResultItem[]
  error?: string
}

/**
 * Creates expect/assertion helpers for pm.expect(val)
 */
function createExpect(target: any) {
  return {
    to: {
      be: (expected: any) => {
        if (target !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(target)}`)
        }
      },
      equal: (expected: any) => {
        if (target != expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(target)}`)
        }
      },
      eql: (expected: any) => {
        if (JSON.stringify(target) !== JSON.stringify(expected)) {
          throw new Error(`Expected deep equality with ${JSON.stringify(expected)} but got ${JSON.stringify(target)}`)
        }
      },
      include: (expectedSubstringOrItem: any) => {
        if (typeof target === 'string' || Array.isArray(target)) {
          if (!target.includes(expectedSubstringOrItem)) {
            throw new Error(`Expected ${JSON.stringify(target)} to include ${JSON.stringify(expectedSubstringOrItem)}`)
          }
        } else if (typeof target === 'object' && target !== null) {
          if (!(expectedSubstringOrItem in target)) {
            throw new Error(`Expected key "${expectedSubstringOrItem}" to be in object`)
          }
        } else {
          throw new Error(`Cannot check include on ${typeof target}`)
        }
      },
      have: {
        property: (propName: string, expectedVal?: any) => {
          if (!target || typeof target !== 'object' || !(propName in target)) {
            throw new Error(`Expected property "${propName}" to exist`)
          }
          if (expectedVal !== undefined && target[propName] !== expectedVal) {
            throw new Error(`Expected property "${propName}" to be ${JSON.stringify(expectedVal)} but got ${JSON.stringify(target[propName])}`)
          }
        },
        status: (code: number) => {
          const actualCode = target?.status ?? target?.code ?? target
          if (actualCode !== code) {
            throw new Error(`Expected status code ${code} but got ${actualCode}`)
          }
        }
      },
      beBelow: (maxVal: number) => {
        if (typeof target !== 'number' || target >= maxVal) {
          throw new Error(`Expected ${target} to be below ${maxVal}`)
        }
      },
      beAbove: (minVal: number) => {
        if (typeof target !== 'number' || target <= minVal) {
          throw new Error(`Expected ${target} to be above ${minVal}`)
        }
      }
    },
    toBe: (expected: any) => {
      if (target !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(target)}`)
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(target) !== JSON.stringify(expected)) {
        throw new Error(`Expected deep equality with ${JSON.stringify(expected)} but got ${JSON.stringify(target)}`)
      }
    },
    toContain: (expected: any) => {
      if (!target || !target.includes || !target.includes(expected)) {
        throw new Error(`Expected to contain ${JSON.stringify(expected)}`)
      }
    },
    toBeGreaterThan: (min: number) => {
      if (typeof target !== 'number' || target <= min) {
        throw new Error(`Expected ${target} to be greater than ${min}`)
      }
    },
    toBeLessThan: (max: number) => {
      if (typeof target !== 'number' || target >= max) {
        throw new Error(`Expected ${target} to be less than ${max}`)
      }
    }
  }
}

/**
 * Execute pre-request script in a safe sandboxed environment
 */
export function executePreRequestScript(
  scriptCode: string,
  context: ScriptExecutionContext
): ScriptExecutionResult {
  const result: ScriptExecutionResult = {
    logs: [],
    testResults: [],
    envUpdates: []
  }

  if (!scriptCode || !scriptCode.trim()) {
    return result
  }

  const envMap: Record<string, string> = {}
  if (context.activeEnv) {
    context.activeEnv.variables.forEach((v) => {
      if (v.key) envMap[v.key] = v.value
    })
  }

  // Clone headers & params for safe mutation
  const currentHeaders = [...(context.request.headers || []).map((h) => ({ ...h }))]
  const currentParams = [...(context.request.params || []).map((p) => ({ ...p }))]
  let currentUrl = context.request.url
  let currentBodyRaw = context.request.bodyRaw

  const pm = {
    environment: {
      get: (key: string) => envMap[key] || '',
      set: (key: string, val: any) => {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
        envMap[key] = strVal
        result.envUpdates?.push({ key, value: strVal })
      },
      has: (key: string) => key in envMap,
      unset: (key: string) => {
        delete envMap[key]
        result.envUpdates?.push({ key, value: '' })
      }
    },
    variables: {
      get: (key: string) => (context.variables && context.variables[key]) || envMap[key] || '',
      set: (key: string, val: any) => {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
        if (!context.variables) context.variables = {}
        context.variables[key] = strVal
      }
    },
    request: {
      url: {
        get: () => currentUrl,
        set: (u: string) => {
          currentUrl = u
        }
      },
      headers: {
        add: (item: { key: string; value: string }) => {
          currentHeaders.push({ key: item.key, value: item.value, enabled: true })
        },
        upsert: (item: { key: string; value: string }) => {
          const existing = currentHeaders.find((h) => h.key.toLowerCase() === item.key.toLowerCase())
          if (existing) {
            existing.value = item.value
            existing.enabled = true
          } else {
            currentHeaders.push({ key: item.key, value: item.value, enabled: true })
          }
        },
        remove: (key: string) => {
          const idx = currentHeaders.findIndex((h) => h.key.toLowerCase() === key.toLowerCase())
          if (idx !== -1) currentHeaders.splice(idx, 1)
        }
      },
      body: {
        get: () => currentBodyRaw,
        set: (b: string) => {
          currentBodyRaw = b
        }
      }
    }
  }

  const customConsole = {
    log: (...args: any[]) => {
      result.logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    },
    warn: (...args: any[]) => {
      result.logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    },
    error: (...args: any[]) => {
      result.logs.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    }
  }

  try {
    const sandboxFn = new Function('pm', 'console', 'btoa', 'atob', scriptCode)
    sandboxFn(pm, customConsole, window.btoa.bind(window), window.atob.bind(window))

    result.modifiedRequest = {
      url: currentUrl,
      headers: currentHeaders,
      params: currentParams,
      bodyRaw: currentBodyRaw
    }
  } catch (err: any) {
    result.error = err?.message || String(err)
    result.logs.push(`[Script Error]: ${result.error}`)
  }

  return result
}

/**
 * Execute test script in a safe sandboxed environment
 */
export function executeTestScript(
  scriptCode: string,
  context: ScriptExecutionContext
): ScriptExecutionResult {
  const result: ScriptExecutionResult = {
    logs: [],
    testResults: [],
    envUpdates: []
  }

  if (!scriptCode || !scriptCode.trim()) {
    return result
  }

  const envMap: Record<string, string> = {}
  if (context.activeEnv) {
    context.activeEnv.variables.forEach((v) => {
      if (v.key) envMap[v.key] = v.value
    })
  }

  const responseObj = context.response || {
    status: 0,
    statusText: '',
    headers: {},
    data: null,
    time: 0,
    size: 0,
    contentType: ''
  }

  const pm = {
    environment: {
      get: (key: string) => envMap[key] || '',
      set: (key: string, val: any) => {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
        envMap[key] = strVal
        result.envUpdates?.push({ key, value: strVal })
      },
      has: (key: string) => key in envMap,
      unset: (key: string) => {
        delete envMap[key]
        result.envUpdates?.push({ key, value: '' })
      }
    },
    variables: {
      get: (key: string) => (context.variables && context.variables[key]) || envMap[key] || '',
      set: (key: string, val: any) => {
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
        if (!context.variables) context.variables = {}
        context.variables[key] = strVal
      }
    },
    response: {
      code: responseObj.status,
      status: responseObj.status,
      statusText: responseObj.statusText,
      headers: responseObj.headers || {},
      responseTime: responseObj.time,
      json: () => {
        if (typeof responseObj.data === 'object' && responseObj.data !== null) {
          return responseObj.data
        }
        try {
          return JSON.parse(String(responseObj.data || '{}'))
        } catch {
          return {}
        }
      },
      text: () => {
        if (typeof responseObj.data === 'object') {
          return JSON.stringify(responseObj.data, null, 2)
        }
        return String(responseObj.data || '')
      },
      to: {
        have: {
          status: (expectedCode: number) => {
            if (responseObj.status !== expectedCode) {
              throw new Error(`Expected status ${expectedCode} but got ${responseObj.status}`)
            }
          }
        }
      }
    },
    expect: createExpect,
    test: (name: string, testFn: () => void) => {
      try {
        testFn()
        result.testResults.push({ name, passed: true })
      } catch (err: any) {
        result.testResults.push({
          name,
          passed: false,
          error: err?.message || String(err)
        })
      }
    }
  }

  const customConsole = {
    log: (...args: any[]) => {
      result.logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    },
    warn: (...args: any[]) => {
      result.logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    },
    error: (...args: any[]) => {
      result.logs.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
    }
  }

  try {
    const sandboxFn = new Function('pm', 'console', 'btoa', 'atob', scriptCode)
    sandboxFn(pm, customConsole, window.btoa.bind(window), window.atob.bind(window))
  } catch (err: any) {
    result.error = err?.message || String(err)
    result.logs.push(`[Script Error]: ${result.error}`)
  }

  return result
}
