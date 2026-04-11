import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { noteService, Note, NoteEntityType, NoteParams } from '../services/note.service';
import { Spinner } from './Spinner';
import { Alert } from './Alert';

interface NoteThreadProps {
  entityType: NoteEntityType;
  entityId: number;
  year?: number;
  month?: number;
}

/** Deterministic pastel color for a given user id (not the current user). */
function authorColor(authorUserId: number): string {
  const palette = ['#a78bfa', '#fb923c', '#34d399', '#f472b6', '#60a5fa', '#facc15'];
  return palette[authorUserId % palette.length];
}

function initials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

function displayName(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email;
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export const NoteThread: React.FC<NoteThreadProps> = ({ entityType, entityId, year, month }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const params: NoteParams = { entityType, entityId, year, month };

  useEffect(() => {
    load();
  }, [entityType, entityId, year, month]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await noteService.getByEntity(params);
      setNotes(data);
    } catch {
      setError(t('notes.loadError', 'Failed to load notes'));
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when notes change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [notes]);

  const handlePost = async () => {
    const body = composeText.trim();
    if (!body || posting) return;
    try {
      setPosting(true);
      const note = await noteService.create({ ...params, body });
      setNotes((prev) => [...prev, note]);
      setComposeText('');
    } catch {
      setError(t('notes.postError', 'Failed to post note'));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('notes.confirmDelete', 'Delete this note?'))) return;
    try {
      await noteService.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setError(t('notes.deleteError', 'Failed to delete note'));
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (id: number) => {
    const body = editText.trim();
    if (!body) return;
    try {
      const updated = await noteService.update(id, body);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
      setEditText('');
    } catch {
      setError(t('notes.editError', 'Failed to update note'));
    }
  };

  const canDelete = (note: Note): boolean => {
    if (!user) return false;
    if (note.author_user_id === user.id) return true;
    // Owners and full-access members can delete any note
    return user.role !== 'partial' && user.role !== 'advisor';
  };

  const canEdit = (note: Note): boolean => {
    return !!user && note.author_user_id === user.id;
  };

  const userInitials = user
    ? initials(user.first_name, user.last_name, user.email)
    : '?';

  if (loading) {
    return (
      <div className="note-thread-loading">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="note-thread">
      {error && (
        <div className="note-thread-error">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <div className="note-thread-list" ref={listRef}>
        {notes.length === 0 ? (
          <div className="note-thread-empty">
            {t('notes.empty', 'No notes yet. Be the first to leave one!')}
          </div>
        ) : (
          notes.map((note) => {
            const isMine = user?.id === note.author_user_id;
            const avatarBg = isMine ? 'var(--color-primary)' : authorColor(note.author_user_id);
            const name = displayName(note.author_first_name, note.author_last_name, note.author_email);
            const abbr = initials(note.author_first_name, note.author_last_name, note.author_email);

            return (
              <div key={note.id} className={`note-item${isMine ? ' note-item-mine' : ''}`}>
                <div
                  className="note-avatar"
                  style={{ background: avatarBg }}
                  aria-label={name}
                >
                  {abbr}
                </div>
                <div className="note-body">
                  <div className="note-meta">
                    <span className="note-author">{isMine ? t('notes.you', 'You') : name}</span>
                    <span className="note-time">{relativeTime(note.created_at)}</span>
                    {note.edited_at && (
                      <span className="note-edited">{t('notes.edited', 'edited')}</span>
                    )}
                  </div>

                  {editingId === note.id ? (
                    <div className="note-edit-wrap">
                      <textarea
                        className="note-edit-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                      />
                      <div className="note-edit-actions">
                        <button className="note-edit-cancel" onClick={cancelEdit}>
                          {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                          className="note-edit-save"
                          onClick={() => saveEdit(note.id)}
                          disabled={!editText.trim()}
                        >
                          {t('common.save', 'Save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`note-bubble${isMine ? ' note-bubble-mine' : ''}`}>
                        {note.body}
                      </div>
                      {(canEdit(note) || canDelete(note)) && (
                        <div className="note-actions">
                          {canEdit(note) && (
                            <button className="note-action-btn" onClick={() => startEdit(note)}>
                              ✏ {t('notes.edit', 'Edit')}
                            </button>
                          )}
                          {canDelete(note) && (
                            <button
                              className="note-action-btn note-action-delete"
                              onClick={() => handleDelete(note.id)}
                            >
                              🗑 {t('notes.delete', 'Delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="note-compose">
        <div
          className="note-compose-avatar"
          style={{ background: 'var(--color-primary)' }}
          aria-hidden
        >
          {userInitials}
        </div>
        <div className="note-compose-input-wrap">
          <textarea
            className="note-compose-textarea"
            placeholder={t('notes.placeholder', 'Write a note for your account members…')}
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
            }}
            rows={2}
          />
          <div className="note-compose-footer">
            <button
              className="note-post-btn"
              onClick={handlePost}
              disabled={!composeText.trim() || posting}
            >
              {posting ? <Spinner size="sm" /> : t('notes.post', 'Post')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
