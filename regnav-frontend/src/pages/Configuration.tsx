import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Select } from '../components/ui/Select';
import { US_STATE_OPTIONS, LOB_OPTIONS, type Option } from '../lib/constants';
import { getConfig, resetConfigKey, updateConfig, type ConfigEntry } from '../services/tenantConfig';

interface KeyMeta {
  label: string;
  description: string;
  type: 'text' | 'number' | 'select';
  options?: Option[];
}

const KEY_META: Record<string, KeyMeta> = {
  chat_model: {
    label: 'Chat Model',
    description: 'Anthropic model used for RuleSense and RuleMiner.',
    type: 'select',
    options: [
      { value: 'claude-sonnet-4-20250514',    label: 'Claude Sonnet 4 (recommended)' },
      { value: 'claude-opus-4-5',             label: 'Claude Opus 4.5 (highest quality)' },
      { value: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5 (fastest)' },
    ],
  },
  embedding_model: {
    label: 'Embedding Model',
    description: 'OpenAI model used to generate vector embeddings.',
    type: 'select',
    options: [
      { value: 'text-embedding-3-small', label: 'text-embedding-3-small (recommended)' },
      { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
    ],
  },
  rag_top_k: {
    label: 'RAG Top-K',
    description: 'Number of document chunks retrieved per query.',
    type: 'number',
  },
  rag_chunk_size: {
    label: 'Chunk Size (tokens)',
    description: 'Maximum tokens per document chunk.',
    type: 'number',
  },
  rag_chunk_overlap: {
    label: 'Chunk Overlap (tokens)',
    description: 'Token overlap between adjacent chunks.',
    type: 'number',
  },
  default_state_code: {
    label: 'Default State',
    description: 'State pre-filled in RegScout / RegValidate forms.',
    type: 'select',
    options: US_STATE_OPTIONS,
  },
  default_lob: {
    label: 'Default Line of Business',
    description: 'LOB pre-filled in forms (e.g. Workers Compensation).',
    type: 'select',
    options: LOB_OPTIONS,
  },
};

const SECTIONS: Array<{ title: string; keys: string[] }> = [
  { title: 'Models',   keys: ['chat_model', 'embedding_model'] },
  { title: 'RAG',      keys: ['rag_top_k', 'rag_chunk_size', 'rag_chunk_overlap'] },
  { title: 'Defaults', keys: ['default_state_code', 'default_lob'] },
];

const Configuration: React.FC = () => {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    getConfig()
      .then((r) => {
        const next = Array.isArray(r?.entries) ? r.entries : [];
        setEntries(next);
        const initial: Record<string, string> = {};
        for (const e of next) initial[e.key] = e.value;
        setDrafts(initial);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = entries.some((e) => drafts[e.key] !== e.value);

  const handleSave = async () => {
    const updates: Record<string, string> = {};
    for (const e of entries) {
      if (drafts[e.key] !== e.value) updates[e.key] = drafts[e.key] ?? e.value;
    }
    if (!Object.keys(updates).length) return;

    setSaving(true);
    try {
      const result = await updateConfig(updates);
      setEntries(result.entries);
      const newDrafts: Record<string, string> = {};
      for (const e of result.entries) newDrafts[e.key] = e.value;
      setDrafts(newDrafts);
      setSavedKeys(new Set(Object.keys(updates)));
      setTimeout(() => setSavedKeys(new Set()), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    try {
      await resetConfigKey(key);
      const result = await getConfig();
      const next = Array.isArray(result?.entries) ? result.entries : [];
      setEntries(next);
      const newDrafts: Record<string, string> = {};
      for (const e of next) newDrafts[e.key] = e.value;
      setDrafts(newDrafts);
    } catch {
      /* ignore */
    }
  };

  const entriesByKey = Object.fromEntries(entries.map((e) => [e.key, e]));

  return (
    <AppLayout title="Configuration">
      <div className="max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text)' }}>
              Tenant Configuration
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Override system defaults for this tenant. Blank values use system defaults.
            </p>
          </div>
          {isDirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg border text-sm"
            role="alert"
            style={{ backgroundColor: 'var(--error-bg)', borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            {error}
            <p className="text-xs mt-1 opacity-80">Start the backend to configure settings.</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
            Loading configuration…
          </div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-12" style={{ color: 'var(--muted)' }}>
            No configuration available yet. Backend may still be starting up.
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => {
              const sectionEntries = section.keys
                .map((k) => entriesByKey[k])
                .filter((e): e is ConfigEntry => Boolean(e));
              if (sectionEntries.length === 0) return null;

              return (
                <section key={section.title}>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {sectionEntries.map((entry) => {
                      const meta = KEY_META[entry.key];
                      const draft = drafts[entry.key] ?? entry.value;
                      const changed = draft !== entry.value;
                      const saved = savedKeys.has(entry.key);

                      return (
                        <div
                          key={entry.key}
                          className="card"
                          style={
                            changed
                              ? { borderColor: 'rgb(var(--color-accent-primary))' }
                              : undefined
                          }
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                                  {meta?.label ?? entry.key}
                                </span>
                                {entry.isOverridden && !changed && (
                                  <span className="status-accent inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border">
                                    overridden
                                  </span>
                                )}
                                {saved && (
                                  <span className="text-xs" style={{ color: 'var(--success)' }}>
                                    ✓ saved
                                  </span>
                                )}
                              </div>
                              {meta?.description && (
                                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                                  {meta.description}
                                </p>
                              )}
                              {meta?.type === 'select' ? (
                                <Select
                                  className="max-w-md"
                                  value={draft}
                                  options={meta.options ?? []}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                                  }
                                />
                              ) : (
                                <input
                                  type={meta?.type === 'number' ? 'number' : 'text'}
                                  value={draft}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                                  }
                                  placeholder={`Default: ${entry.default || '—'}`}
                                  className="input max-w-md text-sm"
                                />
                              )}
                              {entry.isOverridden && (
                                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                                  Default:{' '}
                                  <code style={{ color: 'var(--text-secondary)' }}>
                                    {entry.default || '—'}
                                  </code>
                                </p>
                              )}
                            </div>

                            {entry.isOverridden && (
                              <button
                                type="button"
                                onClick={() => handleReset(entry.key)}
                                className="text-xs self-start sm:self-auto sm:mt-1 transition-colors"
                                style={{ color: 'var(--muted)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--error)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                                title="Reset to default"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export { Configuration };
