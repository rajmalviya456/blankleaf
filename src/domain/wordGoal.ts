export const WORD_GOAL_MAX = 1_000_000

/** A valid word goal, or undefined. Also cleans values read from backup files. */
export function cleanWordGoal(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= WORD_GOAL_MAX
    ? raw
    : undefined
}
