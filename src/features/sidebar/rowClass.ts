export function rowClass(active: boolean): string {
  return [
    'block w-full rounded-md px-2 py-1.5 text-left text-[12.5px] outline-none focus-visible:ring-1 focus-visible:ring-accent',
    active ? 'bg-accent-soft' : 'hover:bg-bg-hover',
  ].join(' ')
}
