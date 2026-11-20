import { useStore } from 'zustand'
import { relativeTime } from '../../lib/relativeTime'
import { backupKeyStore } from './backupKey'
import { buttonClass, Row } from '../settings/controls'
import {
  backupToFolderNow,
  chooseBackupFolder,
  folderBackupStore,
  hasBackupFolder,
  resumeFolderBackup,
  turnOffFolderBackup,
} from './folderBackup'

/** Settings › Data: turn automatic backup to a folder on and off. */
export function FolderBackupRow() {
  const { status, folderName, savedAt } = useStore(folderBackupStore)
  const encrypted = useStore(backupKeyStore, (s) => s.hasPassword)
  const label = 'Automatic backup'
  const hasFolder = hasBackupFolder()
  if (status === 'unsupported')
    return (
      <Row
        label={label}
        hint="Your browser doesn’t support automatic backup to a folder. Export a backup now and then instead."
      >
        <span className="text-[12px] text-fg-muted">Not available</span>
      </Row>
    )
  if (status === 'off')
    return (
      <Row
        label={label}
        hint="Keeps a backup file updated in a folder you choose, encrypted with your backup password."
      >
        <button type="button" onClick={() => void chooseBackupFolder()} className={buttonClass}>
          Choose folder…
        </button>
      </Row>
    )
  const off = (
    <button type="button" onClick={() => void turnOffFolderBackup()} className={buttonClass}>
      Turn off
    </button>
  )
  if (status === 'paused')
    return (
      <Row
        label={label}
        hint={
          hasFolder
            ? `Paused. “${folderName}” needs your permission again.`
            : 'Paused. The backup folder was moved or deleted.'
        }
      >
        <button type="button" onClick={() => void resumeFolderBackup()} className={buttonClass}>
          {hasFolder ? 'Resume' : 'Choose folder…'}
        </button>
        {off}
      </Row>
    )
  return (
    <Row
      label={label}
      hint={`Saving to “${folderName}”${encrypted ? ', encrypted' : ' — not encrypted (set a backup password)'}.${
        savedAt ? ` Last saved ${relativeTime(savedAt)}.` : ''
      }`}
    >
      <button type="button" onClick={() => void backupToFolderNow()} className={buttonClass}>
        Back up now
      </button>
      {off}
    </Row>
  )
}
