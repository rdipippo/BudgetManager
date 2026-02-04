import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../types/budget.types';
import { Input } from './Input';

interface CategoryListProps {
  categories: Category[];
  mode: 'manage' | 'select';
  selectedCategoryId?: number | null;
  showUncategorized?: boolean;
  onSelect?: (categoryId: number | null) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  mode,
  selectedCategoryId,
  showUncategorized = false,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const searchLower = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(searchLower));
  }, [categories, search]);

  const expenseCategories = filteredCategories.filter((c) => !c.is_income);
  const incomeCategories = filteredCategories.filter((c) => c.is_income);

  const handleItemClick = (category: Category) => {
    if (mode === 'select' && onSelect) {
      onSelect(category.id);
    } else if (mode === 'manage' && onEdit) {
      onEdit(category);
    }
  };

  const renderCategoryItem = (category: Category) => (
    <div
      key={category.id}
      className={`category-list-item ${mode === 'select' && selectedCategoryId === category.id ? 'category-list-item-selected' : ''}`}
      onClick={() => handleItemClick(category)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleItemClick(category)}
    >
      <div className="category-list-item-left">
        <span className="category-list-item-dot" style={{ backgroundColor: category.color }} />
        <span className="category-list-item-name">{category.name}</span>
      </div>
      {mode === 'manage' && onDelete && (
        <button
          className="category-list-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
      {mode === 'select' && selectedCategoryId === category.id && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );

  return (
    <div className="category-list-container">
      <div className="category-list-search">
        <Input
          type="text"
          placeholder={t('categories.search', 'Search categories...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="category-list-content">
        {showUncategorized && mode === 'select' && (
          <div
            className={`category-list-item ${selectedCategoryId === null ? 'category-list-item-selected' : ''}`}
            onClick={() => onSelect?.(null)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect?.(null)}
          >
            <div className="category-list-item-left">
              <span className="category-list-item-dot" style={{ backgroundColor: '#6B7280' }} />
              <span className="category-list-item-name">{t('transactions.uncategorized', 'Uncategorized')}</span>
            </div>
            {selectedCategoryId === null && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {expenseCategories.length > 0 && (
          <div className="category-list-section">
            {mode === 'manage' && (
              <h2 className="category-list-section-title">{t('categories.expense', 'Expense Categories')}</h2>
            )}
            {expenseCategories.map(renderCategoryItem)}
          </div>
        )}

        {incomeCategories.length > 0 && (
          <div className="category-list-section">
            {mode === 'manage' && (
              <h2 className="category-list-section-title">{t('categories.income', 'Income Categories')}</h2>
            )}
            {mode === 'select' && expenseCategories.length > 0 && (
              <div className="category-list-divider" />
            )}
            {incomeCategories.map(renderCategoryItem)}
          </div>
        )}

        {filteredCategories.length === 0 && search && (
          <div className="category-list-empty">
            {t('categories.noResults', 'No categories found')}
          </div>
        )}
      </div>
    </div>
  );
};
