/**
 * SafeQueryBuilder - A utility for building SQL queries safely
 *
 * This class helps prevent SQL injection by:
 * - Using parameterized queries for all user-supplied values
 * - Validating ORDER BY fields against a whitelist
 * - Sanitizing LIMIT/OFFSET to safe numeric ranges
 * - Escaping LIKE pattern special characters
 */

export type QueryParam = string | number | boolean | null;

export class SafeQueryBuilder {
  private query: string;
  private params: QueryParam[] = [];
  private hasWhere = false;

  constructor(baseQuery: string) {
    this.query = baseQuery;
    // Check if base query already has WHERE clause
    this.hasWhere = /\bWHERE\b/i.test(baseQuery);
  }

  /**
   * Add a WHERE/AND condition with a parameterized value
   */
  where(condition: string, value: QueryParam): this {
    if (this.hasWhere) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
      this.hasWhere = true;
    }
    this.params.push(value);
    return this;
  }

  /**
   * Add a WHERE/AND condition without a value (for IS NULL, etc.)
   */
  whereRaw(condition: string): this {
    if (this.hasWhere) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
      this.hasWhere = true;
    }
    return this;
  }

  /**
   * Add a WHERE IN clause with multiple parameterized values
   */
  whereIn(column: string, values: QueryParam[]): this {
    if (values.length === 0) return this;

    const placeholders = values.map(() => '?').join(', ');
    if (this.hasWhere) {
      this.query += ` AND ${column} IN (${placeholders})`;
    } else {
      this.query += ` WHERE ${column} IN (${placeholders})`;
      this.hasWhere = true;
    }
    this.params.push(...values);
    return this;
  }

  /**
   * Add a LIKE condition with escaped pattern
   */
  whereLike(column: string, pattern: string, mode: 'contains' | 'starts' | 'ends' = 'contains'): this {
    const escaped = SafeQueryBuilder.escapeLikePattern(pattern);
    let likePattern: string;

    switch (mode) {
      case 'starts':
        likePattern = `${escaped}%`;
        break;
      case 'ends':
        likePattern = `%${escaped}`;
        break;
      case 'contains':
      default:
        likePattern = `%${escaped}%`;
    }

    return this.where(`${column} LIKE ?`, likePattern);
  }

  /**
   * Add multiple LIKE conditions with OR logic
   */
  whereLikeAny(columns: string[], pattern: string, mode: 'contains' | 'starts' | 'ends' = 'contains'): this {
    if (columns.length === 0) return this;

    const escaped = SafeQueryBuilder.escapeLikePattern(pattern);
    let likePattern: string;

    switch (mode) {
      case 'starts':
        likePattern = `${escaped}%`;
        break;
      case 'ends':
        likePattern = `%${escaped}`;
        break;
      case 'contains':
      default:
        likePattern = `%${escaped}%`;
    }

    const conditions = columns.map(col => `${col} LIKE ?`).join(' OR ');

    if (this.hasWhere) {
      this.query += ` AND (${conditions})`;
    } else {
      this.query += ` WHERE (${conditions})`;
      this.hasWhere = true;
    }

    columns.forEach(() => this.params.push(likePattern));
    return this;
  }

  /**
   * Add ORDER BY clause with whitelist validation
   */
  orderBy(
    field: string | undefined,
    allowedFields: Record<string, string>,
    direction: 'asc' | 'desc' | undefined = 'desc',
    defaultField?: string
  ): this {
    // Get the safe field from whitelist, or use default/first available
    const safeField = (field && allowedFields[field])
      || defaultField
      || Object.values(allowedFields)[0];

    if (!safeField) return this;

    // Validate direction
    const safeDir = direction === 'asc' ? 'ASC' : 'DESC';

    this.query += ` ORDER BY ${safeField} ${safeDir}`;
    return this;
  }

  /**
   * Add secondary ORDER BY field
   */
  thenBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    const safeDir = direction === 'asc' ? 'ASC' : 'DESC';
    this.query += `, ${field} ${safeDir}`;
    return this;
  }

  /**
   * Add LIMIT clause with safe bounds
   */
  limit(count: number | undefined, max: number = 500): this {
    if (count === undefined) return this;
    const safeCount = Math.max(1, Math.min(max, Math.floor(count)));
    this.query += ` LIMIT ${safeCount}`;
    return this;
  }

  /**
   * Add OFFSET clause with safe bounds
   */
  offset(count: number | undefined): this {
    if (count === undefined || count === 0) return this;
    const safeOffset = Math.max(0, Math.floor(count));
    this.query += ` OFFSET ${safeOffset}`;
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(column: string): this {
    this.query += ` GROUP BY ${column}`;
    return this;
  }

  /**
   * Append raw SQL (use with caution - only for static strings)
   */
  raw(sql: string): this {
    this.query += sql;
    return this;
  }

  /**
   * Add a parameter without modifying the query
   * Useful when building complex queries
   */
  addParam(value: QueryParam): this {
    this.params.push(value);
    return this;
  }

  /**
   * Add multiple parameters
   */
  addParams(values: QueryParam[]): this {
    this.params.push(...values);
    return this;
  }

  /**
   * Get the built query and parameters
   */
  build(): { query: string; params: QueryParam[] } {
    return {
      query: this.query,
      params: [...this.params]
    };
  }

  /**
   * Get just the query string
   */
  getQuery(): string {
    return this.query;
  }

  /**
   * Get just the parameters
   */
  getParams(): QueryParam[] {
    return [...this.params];
  }

  /**
   * Escape special characters in LIKE patterns
   */
  static escapeLikePattern(input: string): string {
    return input
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  /**
   * Check if input contains suspicious SQL injection patterns
   * Returns true if suspicious, false if clean
   */
  static isSuspicious(input: string): boolean {
    const suspiciousPatterns = /('|"|;|--|\bOR\b\s+\d|1\s*=\s*1|\bUNION\b\s+\bSELECT\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b\s+\bSET\b)/i;
    return suspiciousPatterns.test(input);
  }

  /**
   * Log suspicious input for security monitoring
   */
  static logIfSuspicious(field: string, value: string): void {
    if (SafeQueryBuilder.isSuspicious(value)) {
      console.warn(`[SECURITY] Suspicious input detected in ${field}: ${value.substring(0, 100)}`);
    }
  }
}

/**
 * Helper function to create a new SafeQueryBuilder
 */
export function createQuery(baseQuery: string): SafeQueryBuilder {
  return new SafeQueryBuilder(baseQuery);
}

/**
 * Helper to build a dynamic SET clause for UPDATE queries
 * Returns the SET clause string and values array
 */
export function buildSetClause<T extends Record<string, QueryParam | undefined>>(
  data: T,
  fieldMappings: Record<keyof T, string>
): { setClause: string; values: QueryParam[] } | null {
  const fields: string[] = [];
  const values: QueryParam[] = [];

  for (const [key, dbColumn] of Object.entries(fieldMappings)) {
    const value = data[key as keyof T];
    if (value !== undefined) {
      fields.push(`${dbColumn} = ?`);
      values.push(value as QueryParam);
    }
  }

  if (fields.length === 0) return null;

  return {
    setClause: fields.join(', '),
    values
  };
}

export default SafeQueryBuilder;
