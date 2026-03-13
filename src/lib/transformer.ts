// Core transformation engine for column naming standardization
import { DictionaryEntry, TransformResult, WordMapping } from './dictionary';

/**
 * Normalize a string: remove accents, lowercase, trim
 */
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Split a column name into individual words
 * Handles: snake_case, camelCase, spaces, hyphens
 */
function splitWords(columnName: string): string[] {
  return columnName
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/[_\-\s]+/g, " ") // separators to spaces
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Find the best match for a word in the dictionary
 */
function findMatch(
  word: string,
  dictionary: DictionaryEntry[]
): { entry: DictionaryEntry | null; alternatives: DictionaryEntry[]; matchType: "exact" | "synonym" | "none" } {
  const normalizedWord = normalize(word);
  
  // Remove common plurals
  const singularWord = normalizedWord.replace(/s$/, "");

  // Exact match on terme_source
  const exact = dictionary.find(
    (e) => e.actif && normalize(e.terme_source) === normalizedWord
  );
  if (exact) return { entry: exact, alternatives: [], matchType: "exact" };

  // Exact match on singular
  const exactSingular = dictionary.find(
    (e) => e.actif && normalize(e.terme_source) === singularWord
  );
  if (exactSingular) return { entry: exactSingular, alternatives: [], matchType: "exact" };

  // Check synonyms
  const synonymMatches = dictionary.filter(
    (e) =>
      e.actif &&
      e.synonymes.some((s) => normalize(s) === normalizedWord || normalize(s) === singularWord)
  );

  if (synonymMatches.length === 1) {
    return { entry: synonymMatches[0], alternatives: [], matchType: "synonym" };
  }
  if (synonymMatches.length > 1) {
    return { entry: synonymMatches[0], alternatives: synonymMatches.slice(1), matchType: "synonym" };
  }

  // Check if the word itself is already an abbreviation in the dictionary
  const abbrevMatch = dictionary.find(
    (e) => e.actif && normalize(e.abreviation) === normalizedWord.toUpperCase()
  );
  if (abbrevMatch) return { entry: abbrevMatch, alternatives: [], matchType: "exact" };

  return { entry: null, alternatives: [], matchType: "none" };
}

/**
 * Transform a single column name using the dictionary
 */
export function transformColumn(
  columnName: string,
  dictionary: DictionaryEntry[]
): TransformResult {
  const words = splitWords(columnName);
  const mappings: WordMapping[] = [];
  let hasUnknown = false;
  let hasAmbiguous = false;

  for (const word of words) {
    const { entry, alternatives, matchType } = findMatch(word, dictionary);

    if (matchType === "none") {
      hasUnknown = true;
      mappings.push({
        original: word,
        transformed: word.toUpperCase(),
        status: "inconnu",
      });
    } else if (alternatives.length > 0) {
      hasAmbiguous = true;
      mappings.push({
        original: word,
        transformed: entry!.abreviation,
        status: "ambigu",
        alternatives: alternatives.map((a) => a.abreviation),
      });
    } else {
      mappings.push({
        original: word,
        transformed: entry!.abreviation,
        status: "ok",
      });
    }
  }

  const transformed = mappings.map((m) => m.transformed).join("_");
  const okCount = mappings.filter((m) => m.status === "ok").length;
  const confidence = words.length > 0 ? Math.round((okCount / words.length) * 100) : 100;

  let status: TransformResult["status"] = "ok";
  if (hasUnknown && hasAmbiguous) status = "partiel";
  else if (hasUnknown) status = "inconnu";
  else if (hasAmbiguous) status = "ambigu";

  return { original: columnName, transformed, status, details: mappings, confidence };
}

/**
 * Parse a SQL CREATE TABLE statement and extract column definitions
 */
export interface SqlColumn {
  name: string;
  type: string;
  constraints: string;
}

export interface ParsedSql {
  tableName: string;
  columns: SqlColumn[];
  originalSql: string;
}

export function parseSqlCreateTable(sql: string): ParsedSql | null {
  // Match CREATE TABLE name (...);
  const match = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\)\s*;?/i
  );
  if (!match) return null;

  const tableName = match[1];
  const body = match[2];

  // Split by commas, but respect parentheses (for types like NUMBER(10,2))
  const columnDefs: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      columnDefs.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) columnDefs.push(current.trim());

  const columns: SqlColumn[] = [];
  for (const def of columnDefs) {
    // Skip constraints like PRIMARY KEY, FOREIGN KEY, etc.
    if (/^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX)/i.test(def)) continue;

    const colMatch = def.match(/^(\w+)\s+(\w+(?:\([^)]*\))?)\s*(.*)?$/);
    if (colMatch) {
      columns.push({
        name: colMatch[1],
        type: colMatch[2],
        constraints: (colMatch[3] || "").trim(),
      });
    }
  }

  return { tableName, columns, originalSql: sql };
}

/**
 * Generate a transformed SQL CREATE TABLE statement
 */
export function generateTransformedSql(
  parsed: ParsedSql,
  results: TransformResult[]
): string {
  const columnLines = parsed.columns.map((col, i) => {
    const result = results[i];
    const newName = result ? result.transformed : col.name;
    const constraints = col.constraints ? ` ${col.constraints}` : "";
    return `    ${newName} ${col.type}${constraints}`;
  });

  return `CREATE TABLE ${parsed.tableName} (\n${columnLines.join(",\n")}\n);`;
}

/**
 * Get autocomplete suggestions for a partial word
 */
export function getSuggestions(
  partial: string,
  dictionary: DictionaryEntry[]
): DictionaryEntry[] {
  const normalizedPartial = normalize(partial);
  if (!normalizedPartial) return [];

  return dictionary
    .filter(
      (e) =>
        e.actif &&
        (normalize(e.terme_source).startsWith(normalizedPartial) ||
          normalize(e.abreviation).startsWith(normalizedPartial.toUpperCase()) ||
          e.synonymes.some((s) => normalize(s).startsWith(normalizedPartial)))
    )
    .slice(0, 8);
}
