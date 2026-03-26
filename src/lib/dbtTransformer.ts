// DBT model parser and transformer
// Extracts column names from dbt models (SQL + Jinja) and transforms them using the dictionary

import { DictionaryEntry, TransformResult } from './dictionary';
import { transformColumn } from './transformer';

/**
 * Represents a column extracted from a dbt model
 */
export interface DbtColumn {
  /** The original column name as found in the model */
  name: string;
  /** The alias (AS ...) if present, otherwise same as name */
  alias: string;
  /** The full original line for context */
  originalLine: string;
  /** Line index in the original model */
  lineIndex: number;
}

/**
 * Represents a parsed dbt model
 */
export interface ParsedDbtModel {
  /** All extracted columns */
  columns: DbtColumn[];
  /** The original model text */
  originalModel: string;
  /** Lines of the model */
  lines: string[];
}

/**
 * Preserve Jinja blocks by replacing them with placeholders
 */
function protectJinja(sql: string): { protected: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>();
  let counter = 0;
  
  // Replace Jinja block tags {% ... %}
  let result = sql.replace(/\{%[\s\S]*?%\}/g, (match) => {
    const key = `__JINJA_BLOCK_${counter++}__`;
    placeholders.set(key, match);
    return key;
  });
  
  // Replace Jinja expressions {{ ... }}
  result = result.replace(/\{\{[\s\S]*?\}\}/g, (match) => {
    const key = `__JINJA_EXPR_${counter++}__`;
    placeholders.set(key, match);
    return key;
  });
  
  // Replace Jinja comments {# ... #}
  result = result.replace(/\{#[\s\S]*?#\}/g, (match) => {
    const key = `__JINJA_COMMENT_${counter++}__`;
    placeholders.set(key, match);
    return key;
  });
  
  return { protected: result, placeholders };
}

/**
 * Restore Jinja blocks from placeholders
 */
function restoreJinja(sql: string, placeholders: Map<string, string>): string {
  let result = sql;
  for (const [key, value] of placeholders) {
    result = result.replace(key, value);
  }
  return result;
}

/**
 * Check if a string is a SQL keyword or function that should not be treated as a column
 */
const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'between', 'like', 'is', 'null',
  'join', 'inner', 'left', 'right', 'outer', 'full', 'cross', 'on', 'as',
  'group', 'by', 'order', 'having', 'limit', 'offset', 'union', 'all', 'distinct',
  'case', 'when', 'then', 'else', 'end', 'cast', 'coalesce', 'nullif',
  'count', 'sum', 'avg', 'min', 'max', 'row_number', 'rank', 'dense_rank',
  'over', 'partition', 'asc', 'desc', 'with', 'recursive', 'exists',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'view',
  'drop', 'alter', 'add', 'column', 'index', 'primary', 'key', 'foreign', 'references',
  'true', 'false', 'if', 'int', 'integer', 'varchar', 'text', 'date', 'timestamp',
  'float', 'double', 'decimal', 'boolean', 'number', 'string',
  'current_date', 'current_timestamp', 'now', 'extract', 'year', 'month', 'day',
  'trim', 'upper', 'lower', 'concat', 'substring', 'replace', 'length',
  'materialized', 'table', 'view', 'incremental', 'ephemeral',
]);

function isSqlKeyword(word: string): boolean {
  return SQL_KEYWORDS.has(word.toLowerCase());
}

/**
 * Parse a dbt model and extract columns from SELECT statements
 */
export function parseDbtModel(model: string): ParsedDbtModel {
  const { protected: protectedSql, placeholders } = protectJinja(model);
  const lines = protectedSql.split('\n');
  const columns: DbtColumn[] = [];
  
  let inSelect = false;
  let selectDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const upperLine = trimmedLine.toUpperCase();
    
    // Skip empty lines, pure comments, pure Jinja blocks/config
    if (!trimmedLine || trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) continue;
    if (/^__JINJA_BLOCK_\d+__$/.test(trimmedLine)) continue;
    if (/^__JINJA_EXPR_\d+__$/.test(trimmedLine)) continue;
    if (/^__JINJA_COMMENT_\d+__$/.test(trimmedLine)) continue;
    
    // Detect SELECT keyword
    if (/^\s*SELECT\b/i.test(trimmedLine)) {
      inSelect = true;
      selectDepth++;
      // Check if there's content after SELECT on the same line
      const afterSelect = trimmedLine.replace(/^\s*SELECT\s+(DISTINCT\s+)?/i, '').trim();
      if (afterSelect && !afterSelect.startsWith('*') && !/^__JINJA/i.test(afterSelect)) {
        const col = extractColumnFromExpression(afterSelect, i);
        if (col) columns.push(col);
      }
      continue;
    }
    
    // Detect FROM, JOIN, WHERE — end of select column list
    if (inSelect && /^\s*(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|UNION)\b/i.test(trimmedLine)) {
      inSelect = false;
      continue;
    }
    
    // Inside SELECT, extract columns
    if (inSelect) {
      // Remove trailing comma
      let expr = trimmedLine.replace(/,\s*$/, '').trim();
      
      // Skip lines that are only Jinja placeholders (like {{ dbt_utils.star(...) }})
      if (/^__JINJA_(EXPR|BLOCK)_\d+__$/.test(expr)) continue;
      
      // Skip pure wildcard
      if (expr === '*') continue;
      
      // Skip if the line is a subquery start
      if (/^\(/i.test(expr)) continue;
      
      const col = extractColumnFromExpression(expr, i);
      if (col) columns.push(col);
    }
  }
  
  // Restore Jinja in column info
  const restoredColumns = columns.map(col => ({
    ...col,
    name: restoreJinja(col.name, placeholders),
    alias: restoreJinja(col.alias, placeholders),
    originalLine: restoreJinja(col.originalLine, placeholders),
  }));
  
  return {
    columns: restoredColumns,
    originalModel: model,
    lines: model.split('\n'),
  };
}

/**
 * Extract a column name (or alias) from a SELECT expression
 */
function extractColumnFromExpression(expr: string, lineIndex: number): DbtColumn | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;
  
  // Check for AS alias: `expression AS alias_name`
  const asMatch = trimmed.match(/\bAS\s+(\w+)\s*$/i);
  if (asMatch) {
    const alias = asMatch[1];
    if (!isSqlKeyword(alias)) {
      return {
        name: alias,
        alias: alias,
        originalLine: trimmed,
        lineIndex,
      };
    }
  }
  
  // Simple column reference: just a column name (possibly with table prefix)
  // e.g., "column_name" or "t.column_name"
  const simpleMatch = trimmed.match(/^(?:\w+\.)?(\w+)$/);
  if (simpleMatch) {
    const name = simpleMatch[1];
    if (!isSqlKeyword(name) && !/^__JINJA/i.test(name)) {
      return {
        name: name,
        alias: name,
        originalLine: trimmed,
        lineIndex,
      };
    }
  }
  
  // Expression without AS — try to get the last identifier
  // e.g., "COALESCE(a.col, b.col)" has no column name without AS → skip
  // But "some_table.column_name" → column_name
  
  return null;
}

/**
 * Transform all columns in a dbt model using the dictionary
 */
export function transformDbtColumns(
  parsed: ParsedDbtModel,
  dictionary: DictionaryEntry[]
): TransformResult[] {
  return parsed.columns.map((col) => transformColumn(col.alias, dictionary));
}

/**
 * Generate a new dbt model with transformed column names
 */
export function generateTransformedDbtModel(
  parsed: ParsedDbtModel,
  results: TransformResult[]
): string {
  let output = parsed.originalModel;
  
  // Build a mapping of original column alias → transformed name
  // Process in reverse order to avoid index shifting issues
  const replacements: { original: string; transformed: string }[] = [];
  
  for (let i = 0; i < parsed.columns.length; i++) {
    const col = parsed.columns[i];
    const result = results[i];
    if (!result || result.transformed === col.alias) continue;
    replacements.push({ original: col.alias, transformed: result.transformed });
  }
  
  // Apply replacements using word boundary matching
  for (const { original, transformed } of replacements) {
    // Replace AS alias patterns first (most specific)
    const asRegex = new RegExp(`(\\bAS\\s+)${escapeRegex(original)}\\b`, 'gi');
    output = output.replace(asRegex, `$1${transformed}`);
    
    // Replace standalone column references (with optional table prefix)
    // Only replace if it appears as a column reference, not inside strings or Jinja
    const colRegex = new RegExp(`(^|[\\s,.(])${escapeRegex(original)}(\\s*[,\\s\\n)]|\\s*$)`, 'gm');
    output = output.replace(colRegex, `$1${transformed}$2`);
  }
  
  return output;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Example dbt model for demo purposes
 */
export const EXAMPLE_DBT_MODEL = `{{ config(materialized='table') }}

WITH source AS (
    SELECT * FROM {{ ref('stg_clients') }}
),

renamed AS (
    SELECT
        code_client,
        nom_client,
        prenom_client,
        date_naissance,
        adresse_client,
        ville_client,
        pays_client,
        telephone_client,
        email_client,
        solde_compte,
        montant_total,
        type_contrat,
        reference_operation,
        statut_client,
        date_debut_contrat,
        date_fin_contrat
    FROM source
)

SELECT * FROM renamed`;
