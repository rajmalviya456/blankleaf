import { StreamLanguage, type StreamParser } from '@codemirror/language'

/** Minimal log highlighter: timestamps, levels, quoted strings, numbers, URLs. */
const parser: StreamParser<unknown> = {
  name: 'log',
  token(stream) {
    if (stream.eatSpace()) return null
    if (
      stream.match(
        /^\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}([.,]\d+)?)?(Z|[+-]\d{2}:?\d{2})?\]?/,
      )
    )
      return 'meta'
    if (stream.match(/^\[?\d{2}:\d{2}:\d{2}([.,]\d+)?\]?/)) return 'meta'
    if (stream.match(/^(ERROR|ERR|FATAL|CRITICAL|PANIC|EXCEPTION)\b/i)) return 'invalid'
    if (stream.match(/^(WARN|WARNING)\b/i)) return 'keyword'
    if (stream.match(/^(INFO|NOTICE|OK|SUCCESS)\b/i)) return 'atom'
    if (stream.match(/^(DEBUG|TRACE|VERBOSE)\b/i)) return 'comment'
    if (stream.match(/^https?:\/\/\S+/)) return 'link'
    if (stream.match(/^"([^"\\]|\\.)*"?/) || stream.match(/^'([^'\\]|\\.)*'?/)) return 'string'
    if (stream.match(/^-?\d+(\.\d+)?(ms|s|kb|mb|gb|%)?\b/i)) return 'number'
    stream.next()
    return null
  },
}

export const logLanguage = StreamLanguage.define(parser)
