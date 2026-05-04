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
// Common SQL types to strip from column input
const SQL_TYPES = new Set([
  "int", "integer", "bigint", "smallint", "tinyint", "mediumint",
  "float", "double", "decimal", "numeric", "real", "number",
  "char", "varchar", "varchar2", "nvarchar", "nchar", "text", "clob", "nclob", "blob",
  "string", "str",
  "date", "datetime", "timestamp", "time", "year", "interval",
  "boolean", "bool", "bit",
  "binary", "varbinary", "raw", "long",
  "json", "jsonb", "xml", "uuid", "array",
  "variant", "object", "geography", "geometry",
  "timestamp_ltz", "timestamp_ntz", "timestamp_tz", "num"
]);

function stripSqlType(input: string): { columnName: string; sqlType: string | null } {
  const parts = input.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toLowerCase().replace(/\([^)]*\)/, "");
    if (SQL_TYPES.has(lastPart)) {
      return {
        columnName: parts.slice(0, -1).join(" "),
        sqlType: parts[parts.length - 1],
      };
    }
  }
  return { columnName: input, sqlType: null };
}

export function transformColumn(
  columnName: string,
  dictionary: DictionaryEntry[],
  stopWords: string[] = []
): TransformResult {
  const { columnName: cleanName } = stripSqlType(columnName);
  const words = splitWords(cleanName);
  const mappings: WordMapping[] = [];
  let hasUnknown = false;
  let hasAmbiguous = false;

  // Normalize stop words for comparison
  const normalizedStopWords = new Set(stopWords.map((w) => normalize(w)));

  // Build a lookup map for multi-word matching (normalized terme_source → entry)
  const multiWordMap = new Map<string, DictionaryEntry>();
  let maxGroupLen = 1;
  for (const entry of dictionary) {
    if (!entry.actif) continue;
    const normalized = normalize(entry.terme_source);
    const wordCount = normalized.split(/\s+/).length;
    if (wordCount > 1) {
      multiWordMap.set(normalized, entry);
      maxGroupLen = Math.max(maxGroupLen, wordCount);
    }
    // Also check synonyms for multi-word
    for (const syn of entry.synonymes) {
      const normSyn = normalize(syn);
      const synWordCount = normSyn.split(/\s+/).length;
      if (synWordCount > 1) {
        multiWordMap.set(normSyn, entry);
        maxGroupLen = Math.max(maxGroupLen, synWordCount);
      }
    }
  }

  let i = 0;
  while (i < words.length) {
    // Skip stop words
    if (normalizedStopWords.has(normalize(words[i]))) {
      i++;
      continue;
    }

    // Try greedy multi-word matching: longest group first
    let matched = false;
    for (let len = Math.min(maxGroupLen, words.length - i); len > 1; len--) {
      const group = words.slice(i, i + len);
      const groupNormalized = group.map((w) => normalize(w)).join(" ");

      // Check multi-word map
      const multiEntry = multiWordMap.get(groupNormalized);
      if (multiEntry) {
        mappings.push({
          original: group.join("_"),
          transformed: multiEntry.abreviation,
          status: "ok",
        });
        i += len;
        matched = true;
        break;
      }

      // Also check exact terme_source match (with underscores/spaces)
      const directMatch = dictionary.find(
        (e) => e.actif && normalize(e.terme_source).replace(/[_\s]+/g, " ") === groupNormalized
      );
      if (directMatch) {
        mappings.push({
          original: group.join("_"),
          transformed: directMatch.abreviation,
          status: "ok",
        });
        i += len;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Single word matching (original logic)
    const word = words[i];
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
    i++;
  }

  const transformed = mappings.map((m) => m.transformed).join("_");
  const okCount = mappings.filter((m) => m.status === "ok").length;
  const confidence = mappings.length > 0 ? Math.round((okCount / mappings.length) * 100) : 100;

  let status: TransformResult["status"] = "ok";
  if (hasUnknown && hasAmbiguous) status = "partiel";
  else if (hasUnknown) status = "inconnu";
  else if (hasAmbiguous) status = "ambigu";

  return { original: cleanName, transformed, status, details: mappings, confidence };
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
  statementType: "create" | "select" | "unknown";
  tableName: string;
  columns: SqlColumn[];
  originalSql: string;
}

export function parseSql(rawSql: string): ParsedSql | null {
  // Clean SAS PROC SQL wrappers
  let sql = rawSql.replace(/^\s*PROC\s+SQL\s*;/i, "").replace(/QUIT\s*;\s*$/i, "").trim();

  // Check if it's a CTAS (CREATE TABLE AS SELECT)
  const ctasMatch = sql.match(/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:LOCAL|GLOBAL)\s+TEMPORARY\s+|TEMP\s+|VOLATILE\s+|TRANSIENT\s+|SECURE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+(?:\.[\w."]+)*)\s+AS\s+(SELECT\b[\s\S]*)/i);

  // Check if it's a SELECT statement or CTAS
  if (ctasMatch || /^\s*SELECT\b/i.test(sql)) {
    let selectString = sql;
    let tableName = "requete_select";
    if (ctasMatch) {
      tableName = ctasMatch[1].replace(/"/g, "");
      selectString = ctasMatch[2];
    }

    // Extract everything between SELECT and FROM
    const selectMatch = selectString.match(/^\s*SELECT\b([\s\S]*?)\bFROM\b/i);
    let selectBody = "";
    if (selectMatch) {
      selectBody = selectMatch[1];
    } else {
      // Maybe no FROM clause
      const selectMatchNoFrom = selectString.match(/^\s*SELECT\b([\s\S]*?)$/i);
      if (selectMatchNoFrom) selectBody = selectMatchNoFrom[1];
    }

    if (!selectBody.trim()) return null;

    const columnDefs: string[] = [];
    let depth = 0;
    let inQuote = false;
    let current = "";
    for (let i = 0; i < selectBody.length; i++) {
      const ch = selectBody[i];
      if (ch === "'" && !inQuote) { inQuote = true; current += ch; continue; }
      if (ch === "'" && inQuote) { inQuote = false; current += ch; continue; }
      if (inQuote) { current += ch; continue; }
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
      let name = def;
      const asMatch = def.match(/\bAS\s+([a-zA-Z0-9_"]+)$/i);
      if (asMatch) {
        name = asMatch[1];
      } else {
        const parts = def.split(/\s+/);
        const lastWord = parts[parts.length - 1];
        if (lastWord.includes(".")) {
          name = lastWord.split(".").pop() || lastWord;
        } else {
          name = lastWord;
        }
      }
      name = name.replace(/"/g, "");
      if (name.includes("(")) continue;

      columns.push({
        name,
        type: "",
        constraints: "",
      });
    }

    return { statementType: "select", tableName, columns, originalSql: rawSql };
  }

  // Match CREATE TABLE with optional Snowflake/Teradata modifiers
  const headerMatch = sql.match(
    /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:LOCAL|GLOBAL)\s+TEMPORARY\s+|TEMP\s+|VOLATILE\s+|TRANSIENT\s+|SECURE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."]+(?:\.[\w."]+)*)\s*\(/i
  );
  
  let tableName: string;
  let body: string;
  
  if (headerMatch) {
    // Clean up quoted identifiers
    tableName = headerMatch[1].replace(/"/g, "");
    // Extract body: everything after the opening ( up to the last )
    const startIdx = headerMatch.index! + headerMatch[0].length;
    const remaining = sql.substring(startIdx);
    // Find the last closing parenthesis (before WITH/COMMENT or end)
    let depth = 1;
    let endIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] === "(") depth++;
      else if (remaining[i] === ")") {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    body = endIdx >= 0 ? remaining.substring(0, endIdx) : remaining.replace(/\)\s*;?\s*$/, "");
  } else {
    // Fallback: try to parse as raw column definitions
    let raw = sql.trim().replace(/^\(/, "").replace(/\)\s*;?\s*$/, "").trim();
    if (!raw) return null;
    if (!/^\w+\s+\w+/m.test(raw)) return null;
    tableName = "table_name";
    body = raw;
  }

  // Split by commas, but respect parentheses and single-quoted strings
  const columnDefs: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'" && !inQuote) { inQuote = true; current += ch; continue; }
    if (ch === "'" && inQuote) { inQuote = false; current += ch; continue; }
    if (inQuote) { current += ch; continue; }
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
    // Skip constraints like PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK, CONSTRAINT, INDEX
    if (/^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|INDEX)/i.test(def)) continue;

    // Parse column: name TYPE[(size)] [COMMENT '...'] [other constraints]
    // Strip COMMENT 'xxx' first to simplify parsing
    const withoutComment = def.replace(/\s+COMMENT\s+'[^']*'/gi, "");
    
    const colMatch = withoutComment.match(/^(\w+)\s+(\w+(?:\([^)]*\))?)\s*(.*)?$/);
    if (colMatch) {
      columns.push({
        name: colMatch[1],
        type: colMatch[2],
        constraints: (colMatch[3] || "").trim(),
      });
    }
  }

  return { statementType: "create", tableName, columns, originalSql: rawSql };
}

/**
 * Generate a transformed SQL CREATE TABLE statement
 * Preserves all original syntax (COMMENT, WITH TAG, constraints, etc.)
 * by doing column name replacement in the original SQL text
 */
export function generateTransformedSql(
  parsed: ParsedSql,
  results: TransformResult[]
): string {
  let output = parsed.originalSql;

  // Replace each column name in the original SQL
  // We go in reverse order of appearance to avoid index shifting
  for (let i = parsed.columns.length - 1; i >= 0; i--) {
    const col = parsed.columns[i];
    const result = results[i];
    if (!result || result.transformed === col.name) continue;

    if (parsed.statementType === "select") {
      // Global word boundary replacement for SELECT statements
      const regex = new RegExp(`\\b${escapeRegex(col.name)}\\b`, "gmi");
      output = output.replace(regex, result.transformed);
    } else {
      // Replace only the column definition name (word boundary match)
      // Match the column name that appears at the start of a line/after whitespace, followed by the type
      const regex = new RegExp(
        `(^|[\\s,(])${escapeRegex(col.name)}(\\s+${escapeRegex(col.type.split("(")[0])})`,
        "gmi"
      );
      output = output.replace(regex, `$1${result.transformed}$2`);
    }
  }

  return output;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
