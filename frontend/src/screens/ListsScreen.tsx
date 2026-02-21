import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listService } from '../services';
import { List } from '../types/budget.types';
import { Spinner, Alert, Button, Input, Modal, SideMenu } from '../components';

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899',
];

export const ListsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listService.getAll();
      setLists(data);
    } catch (err) {
      setError(t('lists.loadError', 'Failed to load lists'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingList(null);
    setFormName('');
    setFormColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    setEditingList(list);
    setFormName(list.name);
    setFormColor(list.color);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      setSaving(true);
      if (editingList) {
        await listService.update(editingList.id, { name: formName, color: formColor });
      } else {
        await listService.create({ name: formName, color: formColor });
      }
      setModalOpen(false);
      loadLists();
    } catch (err) {
      setError(t('lists.saveError', 'Failed to save list'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    if (!window.confirm(t('lists.confirmDelete', 'Are you sure you want to delete this list and all its items?'))) {
      return;
    }

    try {
      await listService.delete(list.id);
      loadLists();
    } catch (err) {
      setError(t('lists.deleteError', 'Failed to delete list'));
    }
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="lists-header">
        <h1>{t('lists.title', 'Lists')}</h1>
        <Button variant="primary" onClick={openCreateModal}>+</Button>
      </div>

      {error && (
        <div className="screen-padded">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
      ) : lists.length === 0 ? (
        <div className="screen-centered">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <p>{t('lists.empty', 'No lists yet. Create one to get started!')}</p>
          </div>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map((list) => (
            <div
              key={list.id}
              className="list-card"
              onClick={() => navigate(`/lists/${list.id}`)}
            >
              <div className="list-card-color" style={{ backgroundColor: list.color }} />
              <div className="list-card-content">
                <h3 className="list-card-name">{list.name}</h3>
                <p className="list-card-count">
                  {list.completed_count || 0}/{list.item_count || 0} {t('lists.completed', 'completed')}
                </p>
              </div>
              <div className="list-card-actions">
                <button className="list-card-action" onClick={(e) => openEditModal(e, list)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="list-card-action list-card-action-danger" onClick={(e) => handleDelete(e, list)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingList ? t('lists.edit', 'Edit List') : t('lists.create', 'Create List')}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!formName.trim()}
            >
              {t('common.save', 'Save')}
            </Button>
          </div>
        }
      >
        <div className="category-form">
          <div className="form-group">
            <label>{t('lists.name', 'Name')}</label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('lists.namePlaceholder', 'List name')}
            />
          </div>
          <div className="form-group">
            <label>{t('lists.color', 'Color')}</label>
            <div className="color-picker">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-option ${formColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ListsScreen;
