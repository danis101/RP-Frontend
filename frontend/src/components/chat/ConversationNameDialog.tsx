import { useState } from 'react'
import { useI18n } from '../../i18n'

interface Props {
  title?: string
  characterName: string
  onSave: (title: string) => Promise<void>
  onClose: () => void
}

export default function ConversationNameDialog({ title, characterName, onSave, onClose }: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(title ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => { if (!saving) onClose() }}>
      <form role="dialog" aria-modal="true" aria-labelledby="conversation-name-heading"
        className="w-full max-w-md rounded-2xl border border-edge bg-surface p-5"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => { if (event.key === 'Escape' && !saving) onClose() }}
        onSubmit={async event => {
          event.preventDefault()
          if (saving) return
          setSaving(true)
          setError('')
          try { await onSave(draft.trim()); onClose() }
          catch { setError(t('chatRenameError')); setSaving(false) }
        }}>
        <h2 id="conversation-name-heading" className="text-[15px] font-semibold text-[#f2f2f4]">{t('chatRenameConversation')}</h2>
        <input autoFocus aria-label={t('chatConversationName')} value={draft}
          placeholder={characterName} maxLength={200} disabled={saving}
          onChange={event => setDraft(event.target.value)}
          className="mt-4 w-full rounded-lg border border-edge bg-surface-dark px-3 py-2 text-[14px] text-[#f2f2f4] outline-none focus:border-accent" />
        <p className="mt-2 text-[12px] text-[#9a9aa3]">{t('chatRenameHint')}</p>
        {error && <p role="alert" className="mt-2 text-[12px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose}
            className="rounded-lg border border-edge px-3 py-2 text-[13px] text-[#b8bdd0] disabled:opacity-50">{t('editorCancel')}</button>
          <button type="submit" disabled={saving}
            className="rounded-lg bg-accent px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50">{t('editorSave')}</button>
        </div>
      </form>
    </div>
  )
}
