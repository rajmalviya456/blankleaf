import { createDebouncedWriter } from './debouncedWriter'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(delay = 300) {
  const writes: [string, string][] = []
  const write = vi.fn(async (k: string, v: string) => {
    writes.push([k, v])
  })
  return { writes, write, w: createDebouncedWriter(write, delay) }
}

describe('createDebouncedWriter', () => {
  it('coalesces rapid schedules into one write with the last value', async () => {
    const { w, writes } = setup()
    w.schedule('a', '1')
    await vi.advanceTimersByTimeAsync(100)
    w.schedule('a', '2')
    await vi.advanceTimersByTimeAsync(100)
    w.schedule('a', '3')
    expect(writes).toEqual([])
    await vi.advanceTimersByTimeAsync(300)
    expect(writes).toEqual([['a', '3']])
  })

  it('flush writes pending immediately', async () => {
    const { w, writes } = setup()
    w.schedule('a', '1')
    expect(w.hasPending('a')).toBe(true)
    await w.flush()
    expect(writes).toEqual([['a', '1']])
    expect(w.hasPending()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(writes).toHaveLength(1)
  })

  it('separate keys are independent', async () => {
    const { w, writes } = setup()
    w.schedule('a', '1')
    await vi.advanceTimersByTimeAsync(200)
    w.schedule('b', '2')
    await vi.advanceTimersByTimeAsync(100)
    expect(writes).toEqual([['a', '1']])
    await vi.advanceTimersByTimeAsync(200)
    expect(writes).toEqual([
      ['a', '1'],
      ['b', '2'],
    ])
  })

  it('cancel drops a pending write', async () => {
    const { w, writes } = setup()
    w.schedule('a', '1')
    w.cancel('a')
    await w.flush()
    expect(writes).toEqual([])
  })

  it('serializes writes for the same key', async () => {
    const order: string[] = []
    let release!: () => void
    const write = vi.fn(async (_k: string, v: string) => {
      order.push(`start ${v}`)
      if (v === '1') await new Promise<void>((r) => (release = r))
      order.push(`end ${v}`)
    })
    const w = createDebouncedWriter(write, 10)
    w.schedule('a', '1')
    await vi.advanceTimersByTimeAsync(10)
    w.schedule('a', '2')
    await vi.advanceTimersByTimeAsync(10)
    expect(order).toEqual(['start 1'])
    release()
    await w.flush()
    expect(order).toEqual(['start 1', 'end 1', 'start 2', 'end 2'])
  })

  it('keeps going after a write throws', async () => {
    const write = vi.fn(async (_k: string, v: string) => {
      if (v === 'bad') throw new Error('boom')
    })
    const w = createDebouncedWriter(write, 10)
    w.schedule('a', 'bad')
    await w.flush()
    w.schedule('a', 'good')
    await w.flush()
    expect(write).toHaveBeenLastCalledWith('a', 'good')
  })

  it('dispose drops all pending writes', async () => {
    const { w, writes } = setup()
    w.schedule('a', '1')
    w.schedule('b', '2')
    w.dispose()
    await vi.advanceTimersByTimeAsync(1000)
    expect(writes).toEqual([])
    expect(w.hasPending()).toBe(false)
  })
})
