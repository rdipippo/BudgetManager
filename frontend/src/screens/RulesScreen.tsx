import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ruleService, categoryService } from '../services';
import { CategorizationRule, Category } from '../types/budget.types';
import { Spinner, Alert, Button, Input, Modal, CategoryBadge, SideMenu } from '../components';

export const RulesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number | ''>('');
  const [formMatchType, setFormMatchType] = useState<'merchant' | 'description'>('merchant');
  const [formPattern, setFormPattern] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesData, categoriesData] = await Promise.all([
        ruleService.getAll(),
        categoryService.getAll(),
      ]);
      setRules(rulesData);
      setCategories(categoriesData);
    } catch (err) {
      setError(t('rules.loadError', 'Failed to load rules'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormName('');
    setFormCategoryId('');
    setFormMatchType('merchant');
    setFormPattern('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCategoryId || !formPattern.trim()) return;

    try {
      setSaving(true);
      await ruleService.create({
        name: formName,
        categoryId: formCategoryId as number,
        matchType: formMatchType,
        merchantPattern: formMatchType === 'merchant' ? formPattern : undefined,
        descriptionPattern: formMatchType === 'description' ? formPattern : undefined,
      });
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(t('rules.saveError', 'Failed to save rule'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: number) => {
    if (!window.confirm(t('rules.confirmDelete', 'Are you sure you want to delete this rule?'))) {
      return;
    }

    try {
      await ruleService.delete(ruleId);
      loadData();
    } catch (err) {
      setError(t('rules.deleteError', 'Failed to delete rule'));
    }
  };

  const handleToggle = async (rule: CategorizationRule) => {
    try {
      await ruleService.update(rule.id, { isActive: !rule.is_active });
      loadData();
    } catch (err) {
      setError(t('rules.updateError', 'Failed to update rule'));
    }
  };

  const handleApplyRules = async () => {
    try {
      setApplying(true);
      const result = await ruleService.applyRules();
      alert(t('rules.applied', `Applied rules to ${result.categorizedCount} transactions`));
    } catch (err) {
      setError(t('rules.applyError', 'Failed to apply rules'));
    } finally {
      setApplying(false);
    }
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'merchant': return t('rules.merchant', 'Merchant');
      case 'description': return t('rules.description', 'Description');
      case 'amount_range': return t('rules.amountRange', 'Amount');
      case 'combined': return t('rules.combined', 'Combined');
      default: return type;
    }
  };

  return (
    <div className="screen screen-with-nav">
      <SideMenu />
      <div className="rules-header">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{t('rules.title', 'Categorization Rules')}</h1>
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
        <>
          {rules.length > 0 && (
            <div className="rules-apply">
              <Button
                variant="secondary"
                onClick={handleApplyRules}
                loading={applying}
                fullWidth
              >
                {t('rules.applyToUncategorized', 'Apply Rules to Uncategorized')}
              </Button>
            </div>
          )}

          <div className="rules-list">
            {rules.length === 0 ? (
              <div className="screen-padded">
                <p className="text-secondary">{t('rules.noRules', 'No rules yet. Create rules to automatically categorize transactions.')}</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className={`rule-item ${!rule.is_active ? 'rule-item-inactive' : ''}`}>
                  <div className="rule-item-header">
                    <div className="rule-item-info">
                      <span className="rule-item-name">{rule.name}</span>
                      <CategoryBadge
                        name={rule.category_name || 'Unknown'}
                        color={rule.category_color || '#6B7280'}
                        size="sm"
                      />
                    </div>
                    <div className="rule-item-actions">
                      <button
                        className={`rule-toggle ${rule.is_active ? 'active' : ''}`}
                        onClick={() => handleToggle(rule)}
                      >
                        {rule.is_active ? 'On' : 'Off'}
                      </button>
                      <button
                        className="rule-delete"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="rule-item-details">
                    <span className="rule-item-type">{getMatchTypeLabel(rule.match_type)}</span>
                    <span className="rule-item-pattern">
                      {rule.merchant_pattern || rule.description_pattern || '-'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('rules.createRule', 'Create Rule')}
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!formName.trim() || !formCategoryId || !formPattern.trim()}
            >
              {t('common.create', 'Create')}
            </Button>
          </div>
        }
      >
        <div className="rule-form">
          <div className="form-group">
            <label>{t('rules.name', 'Rule Name')}</label>
            <Input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('rules.namePlaceholder', 'e.g., Starbucks → Food')}
            />
          </div>
          <div className="form-group">
            <label>{t('rules.category', 'Category')}</label>
            <select
              className="form-select"
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">{t('rules.selectCategory', 'Select a category')}</option>
              {categories.filter((c) => !c.is_income).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('rules.matchType', 'Match Type')}</label>
            <select
              className="form-select"
              value={formMatchType}
              onChange={(e) => setFormMatchType(e.target.value as 'merchant' | 'description')}
            >
              <option value="merchant">{t('rules.merchantName', 'Merchant Name')}</option>
              <option value="description">{t('rules.descriptionKeywords', 'Description Keywords')}</option>
            </select>
          </div>
          <div className="form-group">
            <label>{t('rules.pattern', 'Pattern')}</label>
            <Input
              type="text"
              value={formPattern}
              onChange={(e) => setFormPattern(e.target.value)}
              placeholder={formMatchType === 'merchant' ? 'e.g., starbucks' : 'e.g., coffee, cafe'}
            />
            <small className="form-help">
              {formMatchType === 'merchant'
                ? t('rules.merchantHelp', 'Enter the merchant name to match (case insensitive)')
                : t('rules.descriptionHelp', 'Enter comma-separated keywords to match')
              }
            </small>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RulesScreen;
