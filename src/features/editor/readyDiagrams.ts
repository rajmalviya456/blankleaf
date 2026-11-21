import { createContext } from 'react'

/** Ready-made drawings for static copies (print, export). */
export const ReadyDiagrams = createContext<Map<string, string> | undefined>(undefined)
