/**
 * Notes use \n line breaks only. Text from Windows (\r\n) or old Macs (\r) is converted as it
 * arrives, so every feature (editor, outline, links, readability) counts places the same way.
 */
export const plainLineBreaks = (text: string): string =>
  text.includes('\r') ? text.replace(/\r\n?/g, '\n') : text
