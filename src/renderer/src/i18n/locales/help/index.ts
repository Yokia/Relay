import { Language } from '../../types'
import { HelpDocSchema } from './types'
import { helpDocZh } from './zh-CN'
import { helpDocEn } from './en-US'

export * from './types'
export { helpDocZh, helpDocEn }

export function getHelpDoc(language?: Language): HelpDocSchema {
  if (language === 'en-US') {
    return helpDocEn
  }
  return helpDocZh
}
