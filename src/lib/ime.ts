/**
 * True while an input method (Japanese, Chinese, Korean…) is composing: Enter then only confirms
 * the composed text and must not submit. Safari reports keyCode 229 instead of isComposing.
 */
export function composing(e: { nativeEvent?: KeyboardEvent; keyCode?: number }): boolean {
  return !!e.nativeEvent?.isComposing || e.keyCode === 229
}
