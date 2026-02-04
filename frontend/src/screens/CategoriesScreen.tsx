import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { categoryService } from '../services';
import { Category } from '../types/budget.types';
import { Spinner, Alert, Button, Input, Modal, SideMenu, CategoryList } from '../components';

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
  const [formIsIncome, setFormIsIncome] = useState(false);
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
    setFormIsIncome(false);
    setModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormColor(category.color);
    setFormIsIncome(category.is_income);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    try {
      setSaving(true);
      if (editingCategory) {
        await categoryService.update(editingCategory.id, { name: formName, color: formColor, isIncome: formIsIncome });
      } else {
        await categoryService.create({ name: formName, color: formColor, isIncome: formIsIncome });
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
        <CategoryList
          categories={categories}
          mode="manage"
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
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
          <div className="form-group">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                className="checkbox"
                checked={formIsIncome}
                onChange={(e) => setFormIsIncome(e.target.checked)}
              />
              <span className="checkbox-label">{t('categories.isIncome', 'This is an income category')}</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesScreen;
