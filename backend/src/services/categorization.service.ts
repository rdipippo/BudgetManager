import { CategoryModel, RuleModel, LearnedPatternModel, TransactionModel } from '../models';
import { CategorizationRule } from '../models/rule.model';

interface TransactionInfo {
  id: number;
  user_id: number;
  merchant_name: string | null;
  description: string | null;
  amount: number;
}

const KEYWORD_MAP: Record<string, string[]> = {
  'Food & Dining': [
    'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'doordash', 'ubereats',
    'grubhub', 'starbucks', 'mcdonald', 'chipotle', 'subway', 'dunkin', 'taco',
    'wendys', 'chick-fil-a', 'panera', 'dominos', 'instacart', 'postmates',
  ],
  'Transportation': [
    'uber', 'lyft', 'gas', 'fuel', 'parking', 'transit', 'metro', 'shell',
    'chevron', 'exxon', 'bp', 'mobil', 'speedway', 'wawa', 'sunoco',
    'car wash', 'toll', 'dmv', 'parking meter',
  ],
  'Shopping': [
    'amazon', 'target', 'walmart', 'costco', 'ebay', 'etsy', 'bestbuy',
    'home depot', 'lowes', 'ikea', 'macys', 'nordstrom', 'kohls', 'tj maxx',
    'marshalls', 'ross', 'old navy', 'gap', 'zara', 'h&m',
  ],
  'Entertainment': [
    'netflix', 'spotify', 'hulu', 'disney', 'hbo', 'movie', 'theater',
    'concert', 'ticketmaster', 'amc', 'regal', 'apple music', 'youtube',
    'playstation', 'xbox', 'nintendo', 'steam', 'twitch',
  ],
  'Utilities': [
    'electric', 'water', 'internet', 'phone', 'verizon', 'att', 'comcast',
    'xfinity', 'spectrum', 't-mobile', 'sprint', 'pge', 'edison', 'gas bill',
  ],
  'Healthcare': [
    'pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'medical', 'dental',
    'optometrist', 'urgent care', 'clinic', 'rite aid', 'prescription',
    'health insurance', 'copay',
  ],
  'Subscriptions': [
    'subscription', 'membership', 'annual', 'monthly fee', 'patreon',
    'substack', 'medium', 'linkedin premium', 'dropbox', 'icloud',
    'google storage', 'adobe',
  ],
  'Housing': [
    'rent', 'mortgage', 'hoa', 'property tax', 'home insurance',
    'renters insurance', 'apartment', 'landlord',
  ],
  'Personal Care': [
    'salon', 'barber', 'spa', 'nail', 'haircut', 'massage', 'gym',
    'fitness', 'planet fitness', 'equinox', 'sephora', 'ulta',
  ],
  'Education': [
    'tuition', 'school', 'university', 'college', 'textbook', 'udemy',
    'coursera', 'skillshare', 'masterclass', 'student loan',
  ],
  'Income': [
    'payroll', 'direct deposit', 'salary', 'paycheck', 'wages',
    'dividend', 'interest', 'refund', 'reimbursement', 'venmo', 'zelle',
  ],
};

export const CategorizationService = {
  async categorizeTransaction(transaction: TransactionInfo): Promise<number | null> {
    // 1. Check user-defined rules first (highest priority)
    const categoryFromRules = await this.matchRules(transaction);
    if (categoryFromRules) return categoryFromRules;

    // 2. Check learned patterns from user behavior
    const categoryFromLearned = await this.matchLearnedPatterns(transaction);
    if (categoryFromLearned) return categoryFromLearned;

    // 3. Fall back to keyword matching
    const categoryFromKeywords = await this.matchKeywords(transaction);
    if (categoryFromKeywords) return categoryFromKeywords;

    return null;
  },

  async matchRules(transaction: TransactionInfo): Promise<number | null> {
    const rules = await RuleModel.findByUserIdActive(transaction.user_id);

    for (const rule of rules) {
      if (this.ruleMatches(rule, transaction)) {
        return rule.category_id;
      }
    }

    return null;
  },

  ruleMatches(rule: CategorizationRule, transaction: TransactionInfo): boolean {
    const merchantName = (transaction.merchant_name || '').toLowerCase();
    const description = (transaction.description || '').toLowerCase();
    const amount = Math.abs(transaction.amount);

    switch (rule.match_type) {
      case 'merchant':
        if (!rule.merchant_pattern) return false;
        const merchantPattern = rule.merchant_pattern.toLowerCase();
        return rule.is_exact_match
          ? merchantName === merchantPattern
          : merchantName.includes(merchantPattern);

      case 'description':
        if (!rule.description_pattern) return false;
        const keywords = rule.description_pattern.toLowerCase().split(',').map((k) => k.trim());
        return keywords.some((keyword) => description.includes(keyword) || merchantName.includes(keyword));

      case 'amount_range':
        if (rule.amount_min !== null && amount < rule.amount_min) return false;
        if (rule.amount_max !== null && amount > rule.amount_max) return false;
        return true;

      case 'combined':
        let matches = true;
        if (rule.merchant_pattern) {
          const mp = rule.merchant_pattern.toLowerCase();
          matches = matches && (rule.is_exact_match ? merchantName === mp : merchantName.includes(mp));
        }
        if (rule.description_pattern) {
          const keywords = rule.description_pattern.toLowerCase().split(',').map((k) => k.trim());
          matches = matches && keywords.some((keyword) => description.includes(keyword) || merchantName.includes(keyword));
        }
        if (rule.amount_min !== null) matches = matches && amount >= rule.amount_min;
        if (rule.amount_max !== null) matches = matches && amount <= rule.amount_max;
        return matches;

      default:
        return false;
    }
  },

  async matchLearnedPatterns(transaction: TransactionInfo): Promise<number | null> {
    const merchantName = this.normalizeMerchant(transaction.merchant_name);

    if (merchantName) {
      const pattern = await LearnedPatternModel.findByPattern(
        transaction.user_id,
        'merchant',
        merchantName
      );

      if (pattern && pattern.confidence_score >= 0.7) {
        return pattern.category_id;
      }
    }

    return null;
  },

  async matchKeywords(transaction: TransactionInfo): Promise<number | null> {
    const categories = await CategoryModel.findByUserId(transaction.user_id);
    const description = (transaction.description || '').toLowerCase();
    const merchantName = (transaction.merchant_name || '').toLowerCase();
    const searchText = `${merchantName} ${description}`;

    // Check if it looks like income (negative amount in Plaid means money in)
    if (transaction.amount < 0) {
      const incomeCategory = categories.find((c) => c.name === 'Income' && c.is_income);
      if (incomeCategory) {
        // Check income keywords
        const incomeKeywords = KEYWORD_MAP['Income'] || [];
        if (incomeKeywords.some((keyword) => searchText.includes(keyword))) {
          return incomeCategory.id;
        }
      }
    }

    // Match expense categories
    for (const [categoryName, keywords] of Object.entries(KEYWORD_MAP)) {
      if (categoryName === 'Income') continue; // Skip income for positive amounts

      if (keywords.some((keyword) => searchText.includes(keyword))) {
        const category = categories.find((c) => c.name === categoryName);
        if (category) return category.id;
      }
    }

    return null;
  },

  normalizeMerchant(merchantName: string | null): string | null {
    if (!merchantName) return null;

    return merchantName
      .toLowerCase()
      .replace(/\s*#\d+.*$/, '') // Remove store numbers (#123)
      .replace(/\s*\d{5,}.*$/, '') // Remove zip codes
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  },

  async learnFromCategorization(
    userId: number,
    transactionId: number,
    categoryId: number
  ): Promise<void> {
    const transaction = await TransactionModel.findByIdAndUser(transactionId, userId);
    if (!transaction) return;

    const merchantName = this.normalizeMerchant(transaction.merchant_name);

    if (merchantName) {
      await LearnedPatternModel.upsert(userId, categoryId, 'merchant', merchantName);
    }
  },

  async applyRulesToUncategorized(userId: number): Promise<number> {
    const uncategorized = await TransactionModel.findByUserId(userId, {
      uncategorized: true,
      limit: 1000,
    });

    let categorizedCount = 0;

    for (const transaction of uncategorized) {
      const categoryId = await this.categorizeTransaction({
        id: transaction.id,
        user_id: transaction.user_id,
        merchant_name: transaction.merchant_name,
        description: transaction.description,
        amount: transaction.amount,
      });

      if (categoryId) {
        await TransactionModel.updateCategory(transaction.id, userId, categoryId);
        categorizedCount++;
      }
    }

    return categorizedCount;
  },
};
