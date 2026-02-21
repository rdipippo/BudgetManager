import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listService } from '../services';
import { List, ListItem } from '../types/budget.types';
import { Spinner, Alert, Input, SideMenu } from '../components';

export const ListDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadList();
    }
  }, [id]);

  const loadList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listService.getById(parseInt(id!));
      setList(data.list);
      setItems(data.items);
    } catch (err) {
      setError(t('lists.loadError', 'Failed to load list'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !list) return;

    try {
      setAddingItem(true);
      const item = await listService.createItem(list.id, { name: newItemName.trim() });
      setItems((prev) => [item, ...prev]);
      setNewItemName('');
      inputRef.current?.focus();
    } catch (err) {
      setError(t('lists.addItemError', 'Failed to add item'));
    } finally {
      setAddingItem(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const handleToggleItem = async (item: ListItem) => {
    if (!list) return;

    try {
      const updated = await listService.toggleItem(list.id, item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? updated : i))
      );
    } catch (err) {
      setError(t('lists.toggleError', 'Failed to update item'));
    }
  };

  const handleDeleteItem = async (item: ListItem) => {
    if (!list) return;

    try {
      await listService.deleteItem(list.id, item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(t('lists.deleteItemError', 'Failed to delete item'));
    }
  };

  const incompleteItems = items.filter((i) => !i.is_completed);
  const completedItems = items.filter((i) => i.is_completed);

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="list-detail-header">
        <button className="back-button" onClick={() => navigate('/lists')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ color: list?.color || 'inherit' }}>{list?.name || t('lists.loading', 'Loading...')}</h1>
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
      ) : (
        <div className="list-detail-content">
          <div className="list-add-item">
            <Input
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('lists.addItemPlaceholder', 'Add an item...')}
              disabled={addingItem}
            />
            <button
              className="list-add-button"
              onClick={handleAddItem}
              disabled={!newItemName.trim() || addingItem}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="list-empty">
              <p>{t('lists.emptyItems', 'No items yet. Add one above!')}</p>
            </div>
          ) : (
            <>
              <div className="list-items">
                {incompleteItems.map((item) => (
                  <div key={item.id} className="list-item">
                    <button
                      className="list-item-checkbox"
                      onClick={() => handleToggleItem(item)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </button>
                    <span className="list-item-name">{item.name}</span>
                    <button
                      className="list-item-delete"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {completedItems.length > 0 && (
                <>
                  <div className="list-completed-divider">
                    <span>{t('lists.completedSection', 'Completed')} ({completedItems.length})</span>
                  </div>
                  <div className="list-items list-items-completed">
                    {completedItems.map((item) => (
                      <div key={item.id} className="list-item list-item-done">
                        <button
                          className="list-item-checkbox checked"
                          onClick={() => handleToggleItem(item)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <polyline points="9 11 12 14 22 4" />
                          </svg>
                        </button>
                        <span className="list-item-name">{item.name}</span>
                        <button
                          className="list-item-delete"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ListDetailScreen;
