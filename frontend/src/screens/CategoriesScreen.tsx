import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoryService } from '../services';
import { Category } from '../types/budget.types';
import { Spinner, Alert, Button, Input, Modal, SideMenu } from '../components';

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
  '#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899',
];

export const CategoriesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      setError(t('categories.loadError', 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormColor(category.color);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      setSaving(true);
      if (editingCategory) {
        await categoryService.update(editingCategory.id, { name: formName, color: formColor });
      } else {
        await categoryService.create({ name: formName, color: formColor });
      }
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      setError(t('categories.saveError', 'Failed to save category'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(t('categories.confirmDelete', 'Are you sure you want to delete this category?'))) {
      return;
    }

    try {
      await categoryService.delete(category.id);
      loadCategories();
    } catch (err) {
      setError(t('categories.deleteError', 'Failed to delete category'));
    }
  };

  const expenseCategories = categories.filter((c) => !c.is_income);
  const incomeCategories = categories.filter((c) => c.is_income);

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="categories-header">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{t('categories.title', 'Categories')}</h1>
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
      ) : (
        <div className="categories-list">
          <div className="categories-section">
            <h2 className="section-title">{t('categories.expense', 'Expense Categories')}</h2>
            {expenseCategories.map((category) => (
              <div
                key={category.id}
                className="category-item"
                onClick={() => openEditModal(category)}
              >
                <div className="category-item-left">
                  <span className="category-item-dot" style={{ backgroundColor: category.color }} />
                  <span className="category-item-name">{category.name}</span>
                </div>
                <button
                  className="category-item-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(category); }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {incomeCategories.length > 0 && (
            <div className="categories-section">
              <h2 className="section-title">{t('categories.income', 'Income Categories')}</h2>
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="category-item"
                  onClick={() => openEditModal(category)}
                >
                  <div className="category-item-left">
                    <span className="category-item-dot" style={{ backgroundColor: category.color }} />
                    <span className="category-item-name">{category.name}</span>
                  </div>
                  <button
                    className="category-item-delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(category); }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? t('categories.edit', 'Edit Category') : t('categories.create', 'Create Category')}
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
            <label>{t('categories.name', 'Name')}</label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('categories.namePlaceholder', 'Category name')}
            />
          </div>
          <div className="form-group">
            <label>{t('categories.color', 'Color')}</label>
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

export default CategoriesScreen;
