import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  type Notification,
  type Severity,
} from '../services/notifications';

const SEV_DOT: Record<Severity, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const POLL_INTERVAL_MS = 30_000;

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnread(count);
    } catch {
      /* backend may be offline — silently ignore */
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications();
      setItems(data);
      setUnread(data.filter(n => n.readAt === null).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread count
  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  // Load full list whenever the dropdown opens
  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  const handleClickItem = async (n: Notification) => {
    if (n.readAt === null) {
      try {
        await markRead(n.id);
        setItems(prev =>
          prev.map(x => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
        );
        setUnread(prev => Math.max(0, prev - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 shadow-2xl z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 sticky top-0 bg-gray-900">
              <span className="text-sm font-semibold text-gray-100">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <p className="px-3 py-6 text-sm text-gray-500 text-center">Loading…</p>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-800">
                {items.map(n => {
                  const unreadRow = n.readAt === null;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClickItem(n)}
                        className={`w-full text-left px-3 py-3 hover:bg-gray-800/60 transition-colors ${
                          unreadRow ? 'bg-purple-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV_DOT[n.severity] ?? SEV_DOT.info}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${unreadRow ? 'text-gray-100 font-medium' : 'text-gray-300'} truncate`}
                            >
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-600 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
