import { useEffect, useState } from 'react'
import type { Settings } from '../../../domain/types'
import { formatBytes, getStorageInfo, type StorageInfo } from '../../../lib/storageInfo'
import { clearAllData } from '../../../store/dataReset'
import { exportAll, pickFilesToImport } from '../../backup/actions'
import { FolderBackupRow } from '../../backup/FolderBackupRow'
import { getLastBackupAt } from '../../backup/meta'
import { relativeTime } from '../../../lib/relativeTime'
import { buttonClass, Row, Section, SelectBox } from '../controls'

interface Props {
  settings: Settings
  update(p: Partial<Settings>): void
}

function persistedText(p: StorageInfo['persisted']): string {
  if (p === true) return 'Protected — the browser won’t clear it under storage pressure.'
  if (p === false)
    return 'Not protected — the browser may clear it if the disk is low. Keep backups.'
  return 'Your browser doesn’t report storage protection. Keep backups.'
}

export function DataSection({ settings: s, update }: Props) {
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const lastBackup = getLastBackupAt()

  useEffect(() => {
    let alive = true
    void getStorageInfo().then((i) => alive && setInfo(i))
    return () => {
      alive = false
    }
  }, [])

  return (
    <Section title="Data">
      <Row label="Storage" hint={info ? persistedText(info.persisted) : 'Checking…'}>
        <span className="text-[12px] tabular-nums text-fg-muted">
          {info?.usage != null ? `${formatBytes(info.usage)} used` : '—'}
        </span>
      </Row>
      <Row
        label="Back up"
        hint={`Save all notes to one file you can import again.${
          lastBackup ? ` Last backup ${relativeTime(lastBackup)}.` : ' No backup yet.'
        }`}
      >
        <button type="button" onClick={() => void exportAll()} className={buttonClass}>
          Export…
        </button>
        <button type="button" onClick={pickFilesToImport} className={buttonClass}>
          Import…
        </button>
      </Row>
      <Row
        label="Download as files"
        hint="Every note as its own file (.md, .txt, .py, …) in one .zip, to open in any app."
      >
        <button
          type="button"
          onClick={() => void import('../../export/notesZip').then((m) => m.downloadAllAsFiles())}
          className={buttonClass}
        >
          Download .zip
        </button>
      </Row>
      <FolderBackupRow />
      <Row label="Remind me to back up">
        <SelectBox
          label="Remind me to back up"
          value={s.backupReminderDays}
          onChange={(backupReminderDays) => update({ backupReminderDays })}
          options={[
            { value: 0, label: 'Never' },
            { value: 3, label: 'Every 3 days' },
            { value: 7, label: 'Every week' },
            { value: 14, label: 'Every 2 weeks' },
            { value: 30, label: 'Every month' },
          ]}
        />
      </Row>
      <div className="space-y-2 px-3 py-3">
        <p className="text-[12.5px] text-danger">Clear all data</p>
        <p className="text-[11px] leading-snug text-fg-faint">
          Permanently deletes every note, the Trash, your open tabs and settings in this browser.
          This can’t be undone. Type <strong className="text-fg-muted">delete</strong> to confirm.
        </p>
        <div className="flex gap-2">
          <input
            aria-label="Type delete to confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type delete"
            className="w-32 rounded-md border border-border bg-bg-sunken px-2 py-1 text-[12px] text-fg outline-none transition-colors focus:border-danger focus:shadow-[0_0_0_3px_rgb(212_60_75/0.15)]"
          />
          <button
            type="button"
            disabled={confirm.trim().toLowerCase() !== 'delete' || busy}
            onClick={() => {
              setBusy(true)
              void clearAllData()
            }}
            className="rounded-md bg-danger px-2.5 py-1 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all data
          </button>
        </div>
      </div>
    </Section>
  )
}
