import axios from 'axios'

export interface TranslateParams {
  text: string
  from: string // 'auto', 'zh-CN', 'en', etc.
  to: string   // 'zh-CN', 'en', 'ja', etc.
  engine?: 'free' | 'deepl' | 'openai' | 'custom'
  apiKey?: string
  apiEndpoint?: string
}

export interface TranslateResult {
  text: string
  detectedLang?: string
  engine: string
}

/**
 * Public Google Translate free endpoint via clients5 dict-chrome-ex client (highly reliable, no 429)
 * with gtx single fallback
 */
async function translateViaGoogle(text: string, from: string, to: string): Promise<TranslateResult> {
  const sl = from === 'auto' ? 'auto' : from
  const tl = to

  // 1. Try clients5 endpoint first (very fast, rate-limit immune for extension client)
  try {
    const clientsUrl = 'https://clients5.google.com/translate_a/t'
    const res = await axios.get(clientsUrl, {
      params: {
        client: 'dict-chrome-ex',
        sl,
        tl,
        q: text
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (Array.isArray(res.data) && res.data.length > 0) {
      // Structure: [["translated", "detectedLang"]] or ["translated", "detectedLang"]
      const first = res.data[0]
      if (Array.isArray(first)) {
        return {
          text: first[0],
          detectedLang: first[1] || undefined,
          engine: 'Google (免费免配置)'
        }
      } else if (typeof first === 'string') {
        return {
          text: first,
          detectedLang: res.data[1] || undefined,
          engine: 'Google (免费免配置)'
        }
      }
    }
  } catch (cErr: any) {
    // Fallback to gtx
    console.warn('clients5 failed, trying gtx endpoint...', cErr.message)
  }

  // 2. Fallback to gtx endpoint
  const gtxUrl = 'https://translate.googleapis.com/translate_a/single'
  const res = await axios.get(gtxUrl, {
    params: {
      client: 'gtx',
      sl,
      tl,
      dt: 't',
      q: text
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  })

  if (Array.isArray(res.data) && Array.isArray(res.data[0])) {
    const translatedText = res.data[0].map((item: any) => item[0]).filter(Boolean).join('')
    const detectedLang = res.data[2] || undefined
    return {
      text: translatedText,
      detectedLang,
      engine: 'Google (免费免配置)'
    }
  }

  throw new Error('Google Translate returned unrecognized format')
}

/**
 * Fallback to MyMemory translation API
 */
async function translateViaMyMemory(text: string, from: string, to: string): Promise<TranslateResult> {
  const sl = from === 'auto' ? 'autodetect' : from
  const langpair = `${sl}|${to}`
  const url = 'https://api.mymemory.translated.net/get'

  const res = await axios.get(url, {
    params: {
      q: text.slice(0, 1000), // MyMemory limit
      langpair
    },
    timeout: 10000
  })

  if (res.data && res.data.responseData && typeof res.data.responseData.translatedText === 'string') {
    return {
      text: res.data.responseData.translatedText,
      engine: 'MyMemory (备用免费引擎)'
    }
  }

  throw new Error('MyMemory translation returned no result')
}

/**
 * DeepL API
 */
async function translateViaDeepL(text: string, to: string, apiKey: string, isPro = false): Promise<TranslateResult> {
  const endpoint = isPro
    ? 'https://api.deepl.com/v2/translate'
    : 'https://api-free.deepl.com/v2/translate'

  // Normalize target lang for DeepL (EN -> EN-US, etc)
  let targetLang = to.toUpperCase()
  if (targetLang === 'EN' || targetLang === 'EN-US') targetLang = 'EN-US'
  if (targetLang === 'ZH-CN' || targetLang === 'ZH') targetLang = 'ZH'

  const res = await axios.post(
    endpoint,
    {
      text: [text],
      target_lang: targetLang
    },
    {
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  )

  if (res.data?.translations?.[0]?.text) {
    return {
      text: res.data.translations[0].text,
      detectedLang: res.data.translations[0].detected_source_language,
      engine: 'DeepL API'
    }
  }

  throw new Error('DeepL translation returned no result')
}

/**
 * OpenAI / OpenAI-compatible Chat API (e.g. Moonshot, DeepSeek, Local Ollama)
 */
async function translateViaOpenAI(
  text: string,
  to: string,
  apiKey: string,
  endpoint?: string
): Promise<TranslateResult> {
  const base = endpoint ? endpoint.replace(/\/+$/, '') : 'https://api.openai.com/v1'
  const url = `${base}/chat/completions`

  const targetLangNames: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁體中文)',
    'en': 'English',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'vi': 'Vietnamese (Tiếng Việt)',
    'th': 'Thai (ไทย)',
    'id': 'Indonesian (Bahasa Indonesia)',
    'fr': 'French (Français)',
    'de': 'German (Deutsch)',
    'es': 'Spanish (Español)',
    'ru': 'Russian (Русский)',
    'pt': 'Portuguese (Português)',
    'it': 'Italian (Italiano)',
    'ar': 'Arabic (العربية)',
    'hi': 'Hindi (हिन्दी)'
  }
  const targetDesc = targetLangNames[to] || to

  const res = await axios.post(
    url,
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional software engineering translator. Translate the given text accurately and naturally into ${targetDesc}. Output ONLY the translated content without any explanations, markdown quotes, or prefix.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  )

  const content = res.data?.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return {
      text: content.trim(),
      engine: 'AI LLM API'
    }
  }

  throw new Error('AI translation returned empty result')
}

/**
 * Main dispatch translator
 */
export async function executeTranslation(params: TranslateParams): Promise<TranslateResult> {
  const { text, from = 'auto', to = 'zh-CN', engine = 'free', apiKey, apiEndpoint } = params

  if (!text || !text.trim()) {
    return { text: '', engine: 'none' }
  }

  // 1. DeepL
  if (engine === 'deepl' && apiKey) {
    const isPro = !apiKey.endsWith(':fx')
    return await translateViaDeepL(text, to, apiKey, isPro)
  }

  // 2. OpenAI / Compatible
  if (engine === 'openai' && apiKey) {
    return await translateViaOpenAI(text, to, apiKey, apiEndpoint)
  }

  // 3. Default Free Google Engine with MyMemory fallback
  try {
    return await translateViaGoogle(text, from, to)
  } catch (gErr: any) {
    console.warn('Google translation failed, trying MyMemory fallback...', gErr.message)
    try {
      return await translateViaMyMemory(text, from, to)
    } catch (mErr: any) {
      throw new Error(`翻译请求失败: ${gErr.message || '网络连接异常'}`)
    }
  }
}
