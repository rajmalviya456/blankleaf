import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { __setLockIterations, LOCK_ITERATIONS, WrongPasswordError } from '../lock/lockCrypto'
import { decryptBackup, encryptBackup, isEncryptedBackup, newBackupKey } from './backupCrypto'
import { BackupError, looksLikeBackup } from './backup'

beforeAll(() => __setLockIterations(1000))
afterAll(() => __setLockIterations(LOCK_ITERATIONS))

const plain = JSON.stringify({
  app: 'blankleaf',
  schemaVersion: 1,
  notes: [{ content: 'my secret plan' }],
})

describe('encrypted backups', () => {
  it('hide everything in the file, yet are still recognised as backups', async () => {
    const key = await newBackupKey('correct horse')
    const text = await encryptBackup(plain, key)
    expect(text).not.toContain('secret')
    expect(text).not.toContain('notes')
    expect(looksLikeBackup(text)).toBe(true)
    expect(isEncryptedBackup(text)).toBe(true)
    expect(isEncryptedBackup(plain)).toBe(false)
  })

  it('open with the password, or with this device’s saved key', async () => {
    const key = await newBackupKey('correct horse')
    const text = await encryptBackup(plain, key)
    expect(await decryptBackup(text, 'correct horse')).toBe(plain)
    expect(await decryptBackup(text, key)).toBe(plain)
  })

  it('refuse a wrong password or a changed file', async () => {
    const key = await newBackupKey('correct horse')
    const text = await encryptBackup(plain, key)
    await expect(decryptBackup(text, 'wrong')).rejects.toBeInstanceOf(WrongPasswordError)
    const f = JSON.parse(text)
    f.encrypted.data = f.encrypted.data.replace(/^./, (c: string) => (c === 'A' ? 'B' : 'A'))
    await expect(decryptBackup(JSON.stringify(f), 'correct horse')).rejects.toBeInstanceOf(
      WrongPasswordError,
    )
  })

  it('each backup is encrypted differently, and big backups shrink before encrypting', async () => {
    const key = await newBackupKey('pw')
    const big = JSON.stringify({
      app: 'blankleaf',
      notes: [{ content: 'same words '.repeat(5000) }],
    })
    const [a, b] = [await encryptBackup(big, key), await encryptBackup(big, key)]
    expect(a).not.toBe(b)
    expect(a.length).toBeLessThan(big.length / 4)
    expect(await decryptBackup(a, 'pw')).toBe(big)
  })

  it('a key made for one backup password can’t open another’s backups', async () => {
    const mine = await newBackupKey('one')
    const theirs = await newBackupKey('one')
    const text = await encryptBackup(plain, theirs)
    await expect(decryptBackup(text, mine)).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('refuses a file asking for an absurd amount of work, rather than freezing', async () => {
    const key = await newBackupKey('pw')
    const f = JSON.parse(await encryptBackup(plain, key))
    f.encrypted.iterations = 1e12
    await expect(decryptBackup(JSON.stringify(f), 'pw')).rejects.toBeInstanceOf(BackupError)
  })

  it('a damaged file says it’s damaged, not that the password is wrong', async () => {
    const key = await newBackupKey('pw')
    const f = JSON.parse(await encryptBackup(plain, key))
    f.encrypted.salt = '%%%'
    await expect(decryptBackup(JSON.stringify(f), 'pw')).rejects.toBeInstanceOf(BackupError)
    f.encrypted.salt = key.salt
    f.encrypted.iterations = 3_000_000
    await expect(decryptBackup(JSON.stringify(f), 'pw')).rejects.toBeInstanceOf(BackupError)
  })
})
