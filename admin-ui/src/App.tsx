import { useState, type ReactNode } from 'react'

type Track = { title: string; url: string }
type Playlist = { playlistName: string; tracks: Track[] }

const EMPTY_TRACK: Track = { title: '', url: '' }
const INITIAL_PLAYLIST: Playlist = { playlistName: '', tracks: [] }

function Label({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium text-(--text) mb-1">{children}</div>
}

function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  mono,
  large,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  mono?: boolean
  large?: boolean
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        'w-full bg-(--bg) border border-(--border) rounded-lg',
        'text-(--text-h) focus:outline-none focus:border-(--accent) transition-colors',
        large ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm',
        mono ? 'font-mono' : '',
      ].join(' ')}
    />
  )
}

function Btn({
  onClick,
  children,
  variant = 'ghost',
  disabled,
  title,
  small,
}: {
  onClick: () => void
  children: ReactNode
  variant?: 'ghost' | 'primary' | 'danger' | 'outline'
  disabled?: boolean
  title?: string
  small?: boolean
}) {
  const base = `inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-30 ${small ? 'px-2 py-1 text-xs' : 'px-4 py-1.5 text-sm'}`
  const styles: Record<string, string> = {
    ghost: 'text-(--text) hover:bg-(--code-bg)',
    primary: 'bg-(--accent) text-white hover:opacity-90',
    danger: 'text-(--text) hover:text-red-500 hover:bg-red-50',
    outline: 'border border-(--border) text-(--text-h) hover:bg-(--code-bg)',
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  )
}

export default function App() {
  const [playlist, setPlaylist] = useState<Playlist>(INITIAL_PLAYLIST)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Track>(EMPTY_TRACK)
  const [adding, setAdding] = useState(false)
  const [addDraft, setAddDraft] = useState<Track>(EMPTY_TRACK)
  const [copied, setCopied] = useState(false)

  // ── Track edit ──────────────────────────────────────────────
  function startEdit(i: number) {
    setAdding(false)
    setEditingIndex(i)
    setEditDraft(playlist.tracks[i])
  }

  function saveEdit() {
    if (editingIndex === null) return
    setPlaylist(p => ({
      ...p,
      tracks: p.tracks.map((t, i) => (i === editingIndex ? editDraft : t)),
    }))
    setEditingIndex(null)
  }

  function deleteTrack(i: number) {
    if (editingIndex === i) setEditingIndex(null)
    setPlaylist(p => ({ ...p, tracks: p.tracks.filter((_, j) => j !== i) }))
  }

  function moveTrack(i: number, dir: -1 | 1) {
    const next = i + dir
    if (next < 0 || next >= playlist.tracks.length) return
    setPlaylist(p => {
      const tracks = [...p.tracks]
      ;[tracks[i], tracks[next]] = [tracks[next], tracks[i]]
      return { ...p, tracks }
    })
    if (editingIndex === i) setEditingIndex(next)
    else if (editingIndex === next) setEditingIndex(i)
  }

  // ── Add track ────────────────────────────────────────────────
  function startAdding() {
    setEditingIndex(null)
    setAdding(true)
    setAddDraft(EMPTY_TRACK)
  }

  function confirmAdd() {
    if (!addDraft.title && !addDraft.url) return
    setPlaylist(p => ({ ...p, tracks: [...p.tracks, addDraft] }))
    setAdding(false)
    setAddDraft(EMPTY_TRACK)
  }

  // ── JSON copy ────────────────────────────────────────────────
  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(playlist, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const json = JSON.stringify(playlist, null, 2)

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="px-6 py-4 border-b border-(--border) flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-(--accent) shrink-0" />
        <span className="text-sm font-semibold text-(--text-h) tracking-tight">
          Playlist Editor
        </span>
      </header>

      <main className="flex-1 p-6 space-y-10 max-w-2xl w-full">
        {/* ── Playlist Name ───────────────────────────────── */}
        <section>
          <Label>Playlist Name</Label>
          <TextInput
            large
            value={playlist.playlistName}
            onChange={v => setPlaylist(p => ({ ...p, playlistName: v }))}
            placeholder="プレイリストタイトル"
          />
        </section>

        {/* ── Tracks ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-(--text-h)">Tracks</span>
            <span className="text-xs text-(--text) bg-(--code-bg) border border-(--border) px-2 py-0.5 rounded-full">
              {playlist.tracks.length}
            </span>
          </div>

          <ul className="space-y-2">
            {playlist.tracks.map((track, i) =>
              editingIndex === i ? (
                /* ── Inline edit form ── */
                <li key={i} className="border border-(--accent-border) rounded-lg bg-(--code-bg) p-4 space-y-3">
                  <div className="text-xs font-medium text-(--text)">Track {i + 1}</div>
                  <div>
                    <Label>Title</Label>
                    <TextInput
                      autoFocus
                      value={editDraft.title}
                      onChange={v => setEditDraft(d => ({ ...d, title: v }))}
                      placeholder="Track title"
                    />
                  </div>
                  <div>
                    <Label>YouTube URL</Label>
                    <TextInput
                      mono
                      value={editDraft.url}
                      onChange={v => setEditDraft(d => ({ ...d, url: v }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Btn variant="primary" onClick={saveEdit}>Save</Btn>
                    <Btn variant="outline" onClick={() => setEditingIndex(null)}>Cancel</Btn>
                  </div>
                </li>
              ) : (
                /* ── Track row ── */
                <li key={i} className="flex items-center gap-3 px-4 py-3 border border-(--border) rounded-lg hover:bg-(--code-bg) transition-colors group">
                  <span className="text-xs font-mono text-(--text) w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-(--text-h) truncate">
                      {track.title || <span className="italic font-normal text-(--text)">No title</span>}
                    </div>
                    <div className="text-xs font-mono text-(--text) truncate mt-0.5">
                      {track.url || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Btn small onClick={() => moveTrack(i, -1)} disabled={i === 0} title="Move up">▲</Btn>
                    <Btn small onClick={() => moveTrack(i, 1)} disabled={i === playlist.tracks.length - 1} title="Move down">▼</Btn>
                    <Btn small variant="outline" onClick={() => startEdit(i)}>Edit</Btn>
                    <Btn small variant="danger" onClick={() => deleteTrack(i)}>Delete</Btn>
                  </div>
                </li>
              )
            )}
          </ul>

          {/* ── Add track ── */}
          {adding ? (
            <div className="mt-2 border-2 border-dashed border-(--accent-border) rounded-lg bg-(--accent-bg) p-4 space-y-3">
              <div className="text-sm font-medium text-(--text-h)">New Track</div>
              <div>
                <Label>Title</Label>
                <TextInput
                  autoFocus
                  value={addDraft.title}
                  onChange={v => setAddDraft(d => ({ ...d, title: v }))}
                  placeholder="Track title"
                />
              </div>
              <div>
                <Label>YouTube URL</Label>
                <TextInput
                  mono
                  value={addDraft.url}
                  onChange={v => setAddDraft(d => ({ ...d, url: v }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={confirmAdd}>Add</Btn>
                <Btn variant="outline" onClick={() => setAdding(false)}>Cancel</Btn>
              </div>
            </div>
          ) : (
            <button
              onClick={startAdding}
              className="mt-2 w-full py-3 border-2 border-dashed border-(--border) rounded-lg text-sm text-(--text) hover:border-(--accent) hover:text-(--accent) transition-colors"
            >
              + Add Track
            </button>
          )}
        </section>

        {/* ── JSON Preview ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-(--text-h)">JSON Preview</span>
            <Btn variant="outline" small onClick={copyJson}>
              {copied ? '✓ Copied' : 'Copy'}
            </Btn>
          </div>
          <pre className="p-4 bg-(--code-bg) border border-(--border) rounded-lg text-xs font-mono text-(--text-h) overflow-x-auto leading-relaxed">
            {json}
          </pre>
        </section>
      </main>
    </div>
  )
}
