import { DictionaryEntry, TransformResult } from './dictionary';
import { transformColumn } from './transformer';

export interface SasVariable {
  name: string;
  originalLine: string;
}

export interface ParsedSasScript {
  variables: SasVariable[];
  originalScript: string;
}

const SAS_KEYWORDS = new Set([
  'data', 'set', 'run', 'keep', 'drop', 'rename', 'if', 'then', 'else', 'do', 'end',
  'proc', 'sql', 'quit', 'format', 'informat', 'length', 'label', 'retain', 'where',
  'by', 'merge', 'in', 'output', 'select', 'from', 'as', 'inner', 'left', 'right',
  'full', 'outer', 'join', 'on', 'group', 'having', 'order', 'create', 'table', 'view',
  'and', 'or', 'not', 'sum', 'mean', 'input', 'put', 'substr', 'scan', 'work', 'sashelp',
  'distinct', 'case', 'when', 'quit', 'call', 'missing'
]);

function isSasKeyword(word: string): boolean {
  return SAS_KEYWORDS.has(word.toLowerCase());
}

/**
 * Extracts potential variable names from a SAS script
 * Focuses on KEEP, DROP, RENAME statements, assignments, and SELECT columns
 */
export function parseSasScript(script: string): ParsedSasScript {
  const variablesMap = new Map<string, SasVariable>();
  
  // Clean comments to avoid false positives
  const cleanScript = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\*.*?;/gm, '');
  const lines = cleanScript.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Check for assignments: var_name = ...
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=/);
    if (assignMatch && !isSasKeyword(assignMatch[1])) {
      variablesMap.set(assignMatch[1].toLowerCase(), {
        name: assignMatch[1],
        originalLine: trimmed
      });
    }

    // 2. Check KEEP / DROP statements: KEEP var1 var2;
    const keepDropMatch = trimmed.match(/^(?:KEEP|DROP)\s+([^;]+);/i);
    if (keepDropMatch) {
      const vars = keepDropMatch[1].split(/\s+/);
      for (const v of vars) {
        if (v && !isSasKeyword(v) && /^[a-zA-Z_]\w*$/.test(v)) {
          variablesMap.set(v.toLowerCase(), { name: v, originalLine: trimmed });
        }
      }
    }

    // 3. Check RENAME statement: RENAME old = new;
    // We extract both sides so both can be standardized if needed
    const renameMatch = trimmed.match(/^RENAME\s+([^;]+);/i);
    if (renameMatch) {
      const parts = renameMatch[1].split(/\s+/);
      for (const p of parts) {
        const v = p.replace('=', '').trim();
        if (v && !isSasKeyword(v) && /^[a-zA-Z_]\w*$/.test(v)) {
          variablesMap.set(v.toLowerCase(), { name: v, originalLine: trimmed });
        }
      }
    }

    // 4. Check SELECT statement columns in PROC SQL
    // A simplified extraction for anything that looks like a naked column name
    if (trimmed.includes(',') || /^[a-zA-Z_]\w*$/.test(trimmed)) {
      // Find identifiers
      const words = trimmed.match(/\b[a-zA-Z_]\w*\b/g) || [];
      for (const w of words) {
        // If it's not a keyword, and not immediately preceded by a dot (like table.column)
        // Actually, in SAS, table.column is rare except in PROC SQL. We'll just extract it.
        if (!isSasKeyword(w)) {
          // We won't blindly add every word, only if it's explicitly in KEEP/DROP/ASSIGN
          // To avoid renaming table names, we rely mostly on 1, 2, 3. 
          // But for PROC SQL SELECT, we can assume lines with commas often contain columns.
          if (trimmed.includes('SELECT') || trimmed.includes(',')) {
             variablesMap.set(w.toLowerCase(), { name: w, originalLine: trimmed });
          }
        }
      }
    }
  }

  // Fallback: If no variables found with targeted heuristics, just extract all valid non-keyword identifiers
  if (variablesMap.size === 0) {
    const words = cleanScript.match(/\b[a-zA-Z_]\w*\b/g) || [];
    for (const w of words) {
      if (!isSasKeyword(w)) {
        variablesMap.set(w.toLowerCase(), { name: w, originalLine: `... ${w} ...` });
      }
    }
  }

  return {
    variables: Array.from(variablesMap.values()),
    originalScript: script
  };
}

export function transformSasVariables(
  parsed: ParsedSasScript,
  dictionary: DictionaryEntry[],
  stopWords: string[] = []
): TransformResult[] {
  return parsed.variables.map((v) => transformColumn(v.name, dictionary, stopWords));
}

export function generateTransformedSasScript(
  parsed: ParsedSasScript,
  results: TransformResult[]
): string {
  let output = parsed.originalScript;

  // Sort by length descending to prevent partial replacements (e.g. replacing 'id' inside 'client_id')
  const replacements = parsed.variables.map((v, i) => ({
    original: v.name,
    transformed: results[i]?.transformed || v.name
  })).filter(r => r.original !== r.transformed)
    .sort((a, b) => b.original.length - a.original.length);

  for (const { original, transformed } of replacements) {
    // Replace with word boundaries to ensure we don't partially replace
    const regex = new RegExp(`\\b${escapeRegex(original)}\\b`, 'gi');
    output = output.replace(regex, transformed);
  }

  return output;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const EXAMPLE_SAS_SCRIPT = `/* Exemple de script SAS */
DATA work.clients_filtres;
  SET work.clients_source;
  
  montant_total_compte = solde_courant + epargne;
  
  IF age_client >= 18 THEN statut_majeur = 1;
  ELSE statut_majeur = 0;
  
  RENAME date_naissance_client = dnc
         numero_telephone_client = tel_client;
         
  DROP adresse_ip_client;
  KEEP identifiant_client nom_client prenom_client montant_total_compte statut_majeur dnc tel_client;
RUN;

PROC SQL;
  CREATE TABLE stats_clients AS
  SELECT 
    statut_majeur,
    COUNT(identifiant_client) AS nombre_clients,
    SUM(montant_total_compte) AS total_encours
  FROM work.clients_filtres
  GROUP BY statut_majeur;
QUIT;`;
