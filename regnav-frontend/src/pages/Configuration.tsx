import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { getConfig, resetConfigKey, updateConfig, type ConfigEntry } from '../services/tenantConfig';

const KEY_META: Record<string, { label: string; description: string; type: 'text' | 'number' | 'select'; options?: string[] }> = {
  chat_model: {
    label: 'Chat Model',
    description: 'Anthropic model used for RuleSense and RuleMiner.',
    type: 'select',
    options: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-5',
      'claude-haiku-4-5-20251001',
    ],
  },
  embedding_model: {
    label: 'Embedding Model',
    description: 'OpenAI model used to generate vector embeddings.',
    type: 'select',
    options: ['text-embedding-3-small', 'text-embedding-3-large'],
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
    description: '2-letter state code pre-filled in RegScout / RegValidate.',
    type: 'text',
  },
  default_lob: {
    label: 'Default Line of Business',
    description: 'LOB pre-filled in forms (e.g. Workers Compensation).',
    type: 'text',
  },
};

const Configuration: React.FC = () => {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    getConfig()
      .then(r => {
        setEntries(r.entries);
        const initial: Record<string, string> = {};
        for (const e of r.entries) initial[e.key] = e.value;
        setDrafts(initial);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = entries.some(e => drafts[e.key] !== e.value);

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
      setEntries(result.entries);
      const newDrafts: Record<string, string> = {};
      for (const e of result.entries) newDrafts[e.key] = e.value;
      setDrafts(newDrafts);
    } catch {
      /* ignore */
    }
  };

  return (
    <AppLayout title="Configuration">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Tenant Configuration</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Override system defaults for this tenant. Blank values use system defaults.
            </p>
          </div>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
            <p className="text-xs mt-1 text-red-400/70">Start the backend to configure settings.</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading configuration…</div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => {
              const meta = KEY_META[entry.key];
              const draft = drafts[entry.key] ?? entry.value;
              const changed = draft !== entry.value;
              const saved = savedKeys.has(entry.key);

              return (
                <div
                  key={entry.key}
                  className={`card transition-colors ${changed ? 'border-purple-700/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-100">
                          {meta?.label ?? entry.key}
                        </span>
                        {entry.isOverridden && !changed && (
                          <span className="text-xs bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700">
                            overridden
                          </span>
                        )}
                        {saved && (
                          <span className="text-xs text-green-400">✓ saved</span>
                        )}
                      </div>
                      {meta?.description && (
                        <p className="text-xs text-gray-500 mb-2">{meta.description}</p>
                      )}
                      {meta?.type === 'select' ? (
                        <select
                          value={draft}
                          onChange={e => setDrafts(prev => ({ ...prev, [entry.key]: e.target.value }))}
                          className="w-full max-w-sm px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                        >
                          {meta.options?.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={meta?.type === 'number' ? 'number' : 'text'}
                          value={draft}
                          onChange={e => setDrafts(prev => ({ ...prev, [entry.key]: e.target.value }))}
                          placeholder={`Default: ${entry.default || '—'}`}
                          className="w-full max-w-sm px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
                        />
                      )}
                      {entry.isOverridden && (
                        <p className="text-xs text-gray-600 mt-1">
                          Default: <code>{entry.default || '—'}</code>
                        </p>
                      )}
                    </div>

                    {entry.isOverridden && (
                      <button
                        onClick={() => handleReset(entry.key)}
                        className="shrink-0 text-xs text-gray-500 hover:text-red-400 transition-colors mt-1"
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
        )}
      </div>
    </AppLayout>
  );
};

export { Configuration };
