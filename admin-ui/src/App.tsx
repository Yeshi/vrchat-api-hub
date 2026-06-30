import { useState, type ReactNode } from 'react'

type Track = { title: string; url: string }
type Playlist = { name: string; tracks: Track[] }

const EMPTY_TRACK: Track = { title: '', url: '' }

function Label({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium text-(--text) mb-1">{children}</div>
}

function TextInput({ value, onChange, placeholder, autoFocus, mono, large }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  autoFocus?: boolean; mono?: boolean; large?: boolean
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

function Btn({ onClick, children, variant = 'ghost', disabled, title, small }: {
  onClick: () => void; children: ReactNode
  variant?: 'ghost' | 'primary' | 'danger' | 'outline'
  disabled?: boolean; title?: string; small?: boolean
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
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPl, setSelectedPl] = useState<number | null>(null)

  // Track editing state
  const [editingTrack, setEditingTrack] = useState<number | null>(null)
  const [editTrackDraft, setEditTrackDraft] = useState<Track>(EMPTY_TRACK)
  const [addingTrack, setAddingTrack] = useState(false)
  const [addTrackDraft, setAddTrackDraft] = useState<Track>(EMPTY_TRACK)
  const [copied, setCopied] = useState(false)

  // ── Playlist operations ──────────────────────────────────
  function addPlaylist() {
    setPlaylists(ps => [...ps, { name: '', tracks: [] }])
    setSelectedPl(playlists.length)
    setEditingTrack(null)
    setAddingTrack(false)
  }

  function deletePlaylist(i: number) {
    setPlaylists(ps => ps.filter((_, j) => j !== i))
    if (selectedPl === i) setSelectedPl(null)
    else if (selectedPl !== null && selectedPl > i) setSelectedPl(selectedPl - 1)
  }

  function renamePlaylist(i: number, name: string) {
    setPlaylists(ps => ps.map((p, j) => (j === i ? { ...p, name } : p)))
  }

  function movePlaylist(i: number, dir: -1 | 1) {
    const next = i + dir
    if (next < 0 || next >= playlists.length) return
    setPlaylists(ps => {
      const arr = [...ps]
      ;[arr[i], arr[next]] = [arr[next], arr[i]]
      return arr
    })
    if (selectedPl === i) setSelectedPl(next)
    else if (selectedPl === next) setSelectedPl(i)
  }

  // ── Track operations (on selected playlist) ──────────────
  function updateTracks(fn: (ts: Track[]) => Track[]) {
    if (selectedPl === null) return
    setPlaylists(ps => ps.map((p, i) => (i === selectedPl ? { ...p, tracks: fn(p.tracks) } : p)))
  }

  function startEditTrack(i: number) {
    if (selectedPl === null) return
    setAddingTrack(false)
    setEditingTrack(i)
    setEditTrackDraft(playlists[selectedPl].tracks[i])
  }

  function saveEditTrack() {
    if (editingTrack === null) return
    updateTracks(ts => ts.map((t, i) => (i === editingTrack ? editTrackDraft : t)))
    setEditingTrack(null)
  }

  function deleteTrack(i: number) {
    if (editingTrack === i) setEditingTrack(null)
    updateTracks(ts => ts.filter((_, j) => j !== i))
  }

  function moveTrack(i: number, dir: -1 | 1) {
    if (selectedPl === null) return
    const next = i + dir
    if (next < 0 || next >= playlists[selectedPl].tracks.length) return
    updateTracks(ts => {
      const arr = [...ts]
      ;[arr[i], arr[next]] = [arr[next], arr[i]]
      return arr
    })
    if (editingTrack === i) setEditingTrack(next)
    else if (editingTrack === next) setEditingTrack(i)
  }

  function confirmAddTrack() {
    if (!addTrackDraft.title && !addTrackDraft.url) return
    updateTracks(ts => [...ts, addTrackDraft])
    setAddingTrack(false)
    setAddTrackDraft(EMPTY_TRACK)
  }

  async function copyJson() {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const json = JSON.stringify({ playlists }, null, 2)
  const selected = selectedPl !== null ? playlists[selectedPl] : null

  return (
    <div className="flex flex-col flex-1">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="px-6 py-4 border-b border-(--border) flex items-center gap-2.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-(--accent) shrink-0" />
        <span className="text-sm font-semibold text-(--text-h) tracking-tight">Playlist Editor</span>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar ──────────────────────────────────── */}
        <aside className="w-56 border-r border-(--border) flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-(--border) flex items-center gap-2">
            <span className="text-xs font-semibold text-(--text-h)">Playlists</span>
            <span className="text-xs text-(--text) bg-(--code-bg) border border-(--border) px-1.5 py-0.5 rounded-full leading-none">
              {playlists.length}
            </span>
          </div>

          <ul className="flex-1 overflow-y-auto py-1">
            {playlists.length === 0 && (
              <li className="px-4 py-6 text-xs text-(--text) text-center">No playlists yet</li>
            )}
            {playlists.map((pl, i) => (
              <li
                key={i}
                onClick={() => { setSelectedPl(i); setEditingTrack(null); setAddingTrack(false) }}
                className={[
                  'px-3 py-2.5 cursor-pointer flex items-center gap-1.5 group transition-colors border-l-2',
                  selectedPl === i
                    ? 'bg-(--accent-bg) border-(--accent)'
                    : 'hover:bg-(--code-bg) border-transparent',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${selectedPl === i ? 'text-(--accent) font-medium' : 'text-(--text-h)'}`}>
                    {pl.name || <span className="italic font-normal text-(--text)">Untitled</span>}
                  </div>
                  <div className="text-xs text-(--text) mt-0.5">{pl.tracks.length} tracks</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={e => { e.stopPropagation(); movePlaylist(i, -1) }} disabled={i === 0}
                    className="p-1 rounded hover:bg-(--code-bg) disabled:opacity-25 text-(--text) text-xs transition-colors" title="Move up">▲</button>
                  <button onClick={e => { e.stopPropagation(); movePlaylist(i, 1) }} disabled={i === playlists.length - 1}
                    className="p-1 rounded hover:bg-(--code-bg) disabled:opacity-25 text-(--text) text-xs transition-colors" title="Move down">▼</button>
                  <button onClick={e => { e.stopPropagation(); deletePlaylist(i) }}
                    className="p-1 rounded hover:text-red-500 text-(--text) text-xs transition-colors" title="Delete">✕</button>
                </div>
              </li>
            ))}
          </ul>

          <div className="p-3 border-t border-(--border)">
            <button
              onClick={addPlaylist}
              className="w-full py-2 text-xs border border-dashed border-(--border) rounded-lg text-(--text) hover:border-(--accent) hover:text-(--accent) transition-colors"
            >
              + Add Playlist
            </button>
          </div>
        </aside>

        {/* ── Detail Panel ─────────────────────────────── */}
        <main className="flex-1 p-6 space-y-8 min-w-0">
          {selected === null ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="text-(--text) text-sm">Select a playlist to edit</div>
                <button onClick={addPlaylist} className="text-sm text-(--accent) hover:underline">
                  or create a new one →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Playlist name */}
              <section>
                <Label>Playlist Name</Label>
                <TextInput
                  large
                  value={selected.name}
                  onChange={v => renamePlaylist(selectedPl!, v)}
                  placeholder="プレイリストタイトル"
                />
              </section>

              {/* Tracks */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-(--text-h)">Tracks</span>
                  <span className="text-xs text-(--text) bg-(--code-bg) border border-(--border) px-2 py-0.5 rounded-full">
                    {selected.tracks.length}
                  </span>
                </div>

                <ul className="space-y-2">
                  {selected.tracks.map((track, i) =>
                    editingTrack === i ? (
                      <li key={i} className="border border-(--accent-border) rounded-lg bg-(--code-bg) p-4 space-y-3">
                        <div className="text-xs font-medium text-(--text)">Track {i + 1}</div>
                        <div>
                          <Label>Title</Label>
                          <TextInput autoFocus value={editTrackDraft.title} onChange={v => setEditTrackDraft(d => ({ ...d, title: v }))} placeholder="Track title" />
                        </div>
                        <div>
                          <Label>YouTube URL</Label>
                          <TextInput mono value={editTrackDraft.url} onChange={v => setEditTrackDraft(d => ({ ...d, url: v }))} placeholder="https://www.youtube.com/watch?v=..." />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Btn variant="primary" onClick={saveEditTrack}>Save</Btn>
                          <Btn variant="outline" onClick={() => setEditingTrack(null)}>Cancel</Btn>
                        </div>
                      </li>
                    ) : (
                      <li key={i} className="flex items-center gap-3 px-4 py-3 border border-(--border) rounded-lg hover:bg-(--code-bg) transition-colors group">
                        <span className="text-xs font-mono text-(--text) w-5 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-(--text-h) truncate">
                            {track.title || <span className="italic font-normal text-(--text)">No title</span>}
                          </div>
                          <div className="text-xs font-mono text-(--text) truncate mt-0.5">{track.url || '—'}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Btn small onClick={() => moveTrack(i, -1)} disabled={i === 0} title="Move up">▲</Btn>
                          <Btn small onClick={() => moveTrack(i, 1)} disabled={i === selected.tracks.length - 1} title="Move down">▼</Btn>
                          <Btn small variant="outline" onClick={() => startEditTrack(i)}>Edit</Btn>
                          <Btn small variant="danger" onClick={() => deleteTrack(i)}>Delete</Btn>
                        </div>
                      </li>
                    )
                  )}
                </ul>

                {addingTrack ? (
                  <div className="mt-2 border-2 border-dashed border-(--accent-border) rounded-lg bg-(--accent-bg) p-4 space-y-3">
                    <div className="text-sm font-medium text-(--text-h)">New Track</div>
                    <div>
                      <Label>Title</Label>
                      <TextInput autoFocus value={addTrackDraft.title} onChange={v => setAddTrackDraft(d => ({ ...d, title: v }))} placeholder="Track title" />
                    </div>
                    <div>
                      <Label>YouTube URL</Label>
                      <TextInput mono value={addTrackDraft.url} onChange={v => setAddTrackDraft(d => ({ ...d, url: v }))} placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                    <div className="flex gap-2">
                      <Btn variant="primary" onClick={confirmAddTrack}>Add</Btn>
                      <Btn variant="outline" onClick={() => { setAddingTrack(false); setAddTrackDraft(EMPTY_TRACK) }}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingTrack(null); setAddingTrack(true); setAddTrackDraft(EMPTY_TRACK) }}
                    className="mt-2 w-full py-3 border-2 border-dashed border-(--border) rounded-lg text-sm text-(--text) hover:border-(--accent) hover:text-(--accent) transition-colors"
                  >
                    + Add Track
                  </button>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* ── JSON Preview ──────────────────────────────────── */}
      <section className="border-t border-(--border) p-6 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-(--text-h)">JSON Preview</span>
          <Btn variant="outline" small onClick={copyJson}>{copied ? '✓ Copied' : 'Copy'}</Btn>
        </div>
        <pre className="p-4 bg-(--code-bg) border border-(--border) rounded-lg text-xs font-mono text-(--text-h) overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
          {json}
        </pre>
      </section>
    </div>
  )
}
