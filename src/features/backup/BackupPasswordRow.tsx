import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { buttonClass, Row } from '../settings/controls'
import { backupKeyStore, getBackupKey, removeBackupPassword } from './backupKey'
import { backupPasswordStore } from './backupPasswordStore'

/** Settings › Data: the password every backup file is encrypted with. */
export function BackupPasswordRow() {
  const hasPassword = useStore(backupKeyStore, (s) => s.hasPassword)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => void getBackupKey(), [])
  const ask = backupPasswordStore.getState().ask
  return (
    <Row
      label="Backup password"
      hint={
        hasPassword
          ? 'Backups are encrypted: they open only with this password, on any device.'
          : 'Backups aren’t encrypted: anyone who finds a backup file can read your notes.'
      }
    >
      {hasPassword ? (
        <>
          <button type="button" onClick={() => void ask('change')} className={buttonClass}>
            Change…
          </button>
          <button type="button" onClick={() => setConfirm(true)} className={buttonClass}>
            Remove
          </button>
        </>
      ) : (
        <button type="button" onClick={() => void ask('set')} className={buttonClass}>
          Set password…
        </button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Stop encrypting backups?"
        description="New backups, and the automatic ones in your backup folder, will be readable by anyone who finds them. Backups you already downloaded stay encrypted."
        confirmLabel="Stop encrypting"
        danger
        onConfirm={() => void removeBackupPassword()}
      />
    </Row>
  )
}
