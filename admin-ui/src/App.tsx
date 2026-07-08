import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────

type Track = { title: string; url: string }
type Playlist = { name: string; tracks: Track[] }
type PlaylistData = { playlists: Playlist[] }

type ApiConfig = {
  id: string
  name: string
  type: 'playlist'
  url: string
  createdAt: string
}

type Page = { view: 'list' } | { view: 'create' } | { view: 'detail'; config: ApiConfig }
type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'error'

// Dev: Vite proxy forwards /api/* → localhost:5173 (no env var needed)
// Production: set VITE_API_BASE_URL to the deployed Workers URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const EMPTY_TRACK: Track = { title: '', url: '' }

const STATUS_LABEL: Record<Status, string> = {
  loading: 'Loading...',
  ready: '',
  saving: 'Saving...',
  saved: '✓ Saved',
  error: '⚠ Error',
}

// ── UI Primitives ─────────────────────────────────────────────────

function Label({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium text-(--text) mb-1">{children}</div>
}

function TextInput({ value, onChange, placeholder, autoFocus, mono, large, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  autoFocus?: boolean; mono?: boolean; large?: boolean; type?: string
}) {
  return (
    <input
      type={type}
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

function PasswordGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [input, setInput] = useState('')
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <div className="w-72 space-y-4">
        <div className="text-sm font-semibold text-(--text-h)">Admin Access</div>
        <TextInput
          autoFocus
          type="password"
          value={input}
          onChange={setInput}
          placeholder="Token"
        />
        <Btn variant="primary" onClick={() => input && onAuth(input)}>Enter</Btn>
      </div>
    </div>
  )
}

// ── Playlist Editor ───────────────────────────────────────────────
// Self-contained playlist CRUD UI.
// Calls onChange on every user edit (parent is responsible for debounce + save).

function PlaylistEditor({
  initialData,
  onChange,
}: {
  initialData: PlaylistData
  onChange: (data: PlaylistData) => void
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => initialData.playlists)
  const [selectedPl, setSelectedPl] = useState<number | null>(null)
  const [editingTrack, setEditingTrack] = useState<number | null>(null)
  const [editTrackDraft, setEditTrackDraft] = useState<Track>(EMPTY_TRACK)
  const [addingTrack, setAddingTrack] = useState(false)
  const [addTrackDraft, setAddTrackDraft] = useState<Track>(EMPTY_TRACK)
  const [copied, setCopied] = useState(false)

  // Notify parent on every user-driven playlists change
  function update(next: Playlist[]) {
    setPlaylists(next)
    onChange({ playlists: next })
  }

  // ── Playlist operations ────────────────────────────────────────
  function addPlaylist() {
    const next = [...playlists, { name: '', tracks: [] }]
    setSelectedPl(next.length - 1)
    setEditingTrack(null)
    setAddingTrack(false)
    update(next)
  }

  function deletePlaylist(i: number) {
    update(playlists.filter((_, j) => j !== i))
    if (selectedPl === i) setSelectedPl(null)
    else if (selectedPl !== null && selectedPl > i) setSelectedPl(selectedPl - 1)
  }

  function renamePlaylist(i: number, name: string) {
    update(playlists.map((p, j) => (j === i ? { ...p, name } : p)))
  }

  function movePlaylist(i: number, dir: -1 | 1) {
    const next = i + dir
    if (next < 0 || next >= playlists.length) return
    const arr = [...playlists]
    ;[arr[i], arr[next]] = [arr[next], arr[i]]
    update(arr)
    if (selectedPl === i) setSelectedPl(next)
    else if (selectedPl === next) setSelectedPl(i)
  }

  // ── Track operations ───────────────────────────────────────────
  function updateTracks(fn: (ts: Track[]) => Track[]) {
    if (selectedPl === null) return
    update(playlists.map((p, i) => (i === selectedPl ? { ...p, tracks: fn(p.tracks) } : p)))
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
    await navigator.clipboard.writeText(JSON.stringify({ playlists }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selected = selectedPl !== null ? playlists[selectedPl] : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
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
        <main className="flex-1 p-6 space-y-8 min-w-0 overflow-y-auto">
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
              <section>
                <Label>Playlist Name</Label>
                <TextInput
                  large
                  value={selected.name}
                  onChange={v => renamePlaylist(selectedPl!, v)}
                  placeholder="プレイリストタイトル"
                />
              </section>

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
          {JSON.stringify({ playlists }, null, 2)}
        </pre>
      </section>
    </div>
  )
}

// ── API List Page ─────────────────────────────────────────────────

function ApiListPage({
  token,
  onSelect,
  onCreate,
  onUnauth,
}: {
  token: string
  onSelect: (config: ApiConfig) => void
  onCreate: () => void
  onUnauth: () => void
}) {
  const [apis, setApis] = useState<ApiConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/admin/apis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (r.status === 401) { onUnauth(); return }
        const data = await r.json() as { apis: ApiConfig[] }
        setApis(data.apis ?? [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  async function deleteApi(id: string) {
    if (!confirm('このAPIを削除しますか？データも削除されます。')) return
    setDeleting(id)
    try {
      const res = await fetch(`${API_BASE}/admin/apis/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { onUnauth(); return }
      setApis(prev => prev.filter(a => a.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-(--text)">Loading...</div>
  }
  if (error) {
    return <div className="flex flex-1 items-center justify-center text-sm text-red-500">API に接続できません</div>
  }

  return (
    <div className="flex-1 p-6 min-w-0">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-(--text-h)">APIs</span>
          <span className="text-xs text-(--text) bg-(--code-bg) border border-(--border) px-1.5 py-0.5 rounded-full leading-none">
            {apis.length}
          </span>
        </div>
        <Btn variant="primary" onClick={onCreate}>+ New API</Btn>
      </div>

      {apis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-(--text) text-sm">まだ API がありません</div>
          <Btn variant="outline" onClick={onCreate}>最初の API を作成する</Btn>
        </div>
      ) : (
        <div className="border border-(--border) rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-(--code-bg) border-b border-(--border)">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--text)">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--text)">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--text)">URL</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-(--text)">Created</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {apis.map((api, i) => (
                <tr
                  key={api.id}
                  className={`border-b border-(--border) last:border-0 ${i % 2 === 0 ? '' : 'bg-(--code-bg)/40'}`}
                >
                  <td className="px-4 py-3 font-medium text-(--text-h)">{api.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-(--accent-bg) text-(--accent) px-2 py-0.5 rounded-full font-medium">
                      {api.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-(--text)">/{api.url}</td>
                  <td className="px-4 py-3 text-xs text-(--text)">
                    {new Date(api.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Btn small variant="outline" onClick={() => onSelect(api)}>Edit</Btn>
                      <Btn
                        small
                        variant="danger"
                        disabled={deleting === api.id}
                        onClick={() => deleteApi(api.id)}
                      >
                        Delete
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── API Create Page ───────────────────────────────────────────────

function ApiCreatePage({
  token,
  onCreated,
  onBack,
  onUnauth,
}: {
  token: string
  onCreated: (config: ApiConfig) => void
  onBack: () => void
  onUnauth: () => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function sanitizeUrl(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleCreate() {
    if (!name.trim() || !url.trim()) return
    setSubmitting(true)
    setUrlError('')
    try {
      const res = await fetch(`${API_BASE}/admin/apis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), type: 'playlist', url: url.trim() }),
      })
      if (res.status === 401) { onUnauth(); return }
      if (res.status === 409) { setUrlError('この URL は既に使用されています'); return }
      const created = await res.json() as ApiConfig
      onCreated(created)
    } finally {
      setSubmitting(false)
    }
  }

  const publicUrl = `${API_BASE}/${url || '<slug>'}`

  return (
    <div className="flex-1 p-6 max-w-lg">
      <button
        onClick={onBack}
        className="text-xs text-(--text) hover:text-(--text-h) transition-colors mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="text-base font-semibold text-(--text-h) mb-6">New API</div>

      <div className="space-y-5">
        <div>
          <Label>Name</Label>
          <TextInput autoFocus value={name} onChange={setName} placeholder="VRChat Playlist" />
        </div>

        <div>
          <Label>Type</Label>
          <div className="px-3 py-2 text-sm border border-(--border) rounded-lg text-(--text-h) bg-(--code-bg) cursor-default">
            Playlist
          </div>
        </div>

        <div>
          <Label>URL Slug</Label>
          <TextInput
            mono
            value={url}
            onChange={v => { setUrl(sanitizeUrl(v)); setUrlError('') }}
            placeholder="playlists"
          />
          {urlError ? (
            <div className="text-xs text-red-500 mt-1">{urlError}</div>
          ) : url ? (
            <div className="text-xs text-(--text) mt-1 font-mono">{publicUrl}</div>
          ) : null}
        </div>

        <div className="flex gap-2 pt-2">
          <Btn variant="primary" disabled={!name.trim() || !url.trim() || submitting} onClick={handleCreate}>
            {submitting ? 'Creating...' : 'Create API'}
          </Btn>
          <Btn variant="outline" onClick={onBack}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ── API Detail Page ───────────────────────────────────────────────

function ApiDetailPage({
  config,
  token,
  onBack,
  onUnauth,
  onStatus,
}: {
  config: ApiConfig
  token: string
  onBack: () => void
  onUnauth: () => void
  onStatus: (s: Status) => void
}) {
  const [data, setData] = useState<PlaylistData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)

  useEffect(() => {
    onStatus('loading')
    fetch(`${API_BASE}/admin/apis/${config.id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (r.status === 401) { onUnauth(); return }
        const d = await r.json() as PlaylistData
        setData(d)
        onStatus('ready')
      })
      .catch(() => { setLoadError(true); onStatus('error') })
  }, [config.id])

  const handleChange = useCallback((newData: PlaylistData) => {
    onStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/apis/${config.id}/data`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newData),
        })
        if (res.status === 401) { onUnauth(); return }
        onStatus('saved')
      } catch {
        onStatus('error')
      }
    }, 800)
  }, [config.id, token])

  async function copyPublicUrl() {
    await navigator.clipboard.writeText(`${API_BASE}/${config.url}`)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Config bar ───────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-(--border) flex items-center gap-4 shrink-0 flex-wrap">
        <button
          onClick={onBack}
          className="text-xs text-(--text) hover:text-(--text-h) transition-colors flex items-center gap-1 shrink-0"
        >
          ← APIs
        </button>
        <span className="text-sm font-semibold text-(--text-h)">{config.name}</span>
        <span className="text-xs bg-(--accent-bg) text-(--accent) px-2 py-0.5 rounded-full font-medium shrink-0">
          {config.type}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-mono text-(--text)">GET /{config.url}</span>
          <button
            onClick={copyPublicUrl}
            className="text-xs text-(--text) hover:text-(--accent) transition-colors px-2 py-0.5 border border-(--border) rounded"
          >
            {urlCopied ? '✓' : 'Copy URL'}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex flex-1 items-center justify-center text-sm text-red-500">
          データを読み込めませんでした
        </div>
      )}

      {!loadError && data === null && (
        <div className="flex flex-1 items-center justify-center text-sm text-(--text)">Loading...</div>
      )}

      {data !== null && (
        <PlaylistEditor initialData={data} onChange={handleChange} />
      )}
    </div>
  )
}

// ── App (root) ────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') ?? '')
  const [page, setPage] = useState<Page>({ view: 'list' })
  const [status, setStatus] = useState<Status>('ready')

  function login(t: string) {
    localStorage.setItem('admin_token', t)
    setToken(t)
  }
  function logout() {
    localStorage.removeItem('admin_token')
    setToken('')
  }

  if (!token) return <PasswordGate onAuth={login} />

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="px-6 py-4 border-b border-(--border) flex items-center gap-2.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-(--accent) shrink-0" />
        <button
          onClick={() => { setPage({ view: 'list' }); setStatus('ready') }}
          className="text-sm font-semibold text-(--text-h) tracking-tight hover:text-(--accent) transition-colors"
        >
          API Manager
        </button>
        {STATUS_LABEL[status] && page.view === 'detail' && (
          <span className={`text-xs ${status === 'error' ? 'text-red-500' : 'text-(--text)'}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
        <button
          onClick={logout}
          className="ml-auto text-xs text-(--text) hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* ── Page content ───────────────────────────────── */}
      {page.view === 'list' && (
        <ApiListPage
          token={token}
          onSelect={config => { setPage({ view: 'detail', config }); setStatus('loading') }}
          onCreate={() => setPage({ view: 'create' })}
          onUnauth={logout}
        />
      )}

      {page.view === 'create' && (
        <ApiCreatePage
          token={token}
          onCreated={config => { setPage({ view: 'detail', config }); setStatus('loading') }}
          onBack={() => setPage({ view: 'list' })}
          onUnauth={logout}
        />
      )}

      {page.view === 'detail' && (
        <ApiDetailPage
          config={page.config}
          token={token}
          onBack={() => { setPage({ view: 'list' }); setStatus('ready') }}
          onUnauth={logout}
          onStatus={setStatus}
        />
      )}
    </div>
  )
}
