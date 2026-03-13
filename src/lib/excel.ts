// Excel import/export utilities for the dictionary
import * as XLSX from "xlsx";
import { DictionaryEntry, generateId } from "./dictionary";

export interface ImportResult {
  success: boolean;
  entries: DictionaryEntry[];
  errors: string[];
  warnings: string[];
}

/**
 * Import dictionary from an Excel file
 */
export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const errors: string[] = [];
        const warnings: string[] = [];
        const entries: DictionaryEntry[] = [];

        if (rows.length === 0) {
          resolve({ success: false, entries: [], errors: ["Le fichier est vide."], warnings: [] });
          return;
        }

        // Validate required columns
        const firstRow = rows[0];
        const requiredCols = ["terme_source", "abreviation"];
        for (const col of requiredCols) {
          if (!(col in firstRow)) {
            errors.push(`Colonne requise manquante : "${col}"`);
          }
        }
        if (errors.length > 0) {
          resolve({ success: false, entries: [], errors, warnings: [] });
          return;
        }

        rows.forEach((row, i) => {
          const terme = String(row.terme_source || "").trim();
          const abr = String(row.abreviation || "").trim();

          if (!terme || !abr) {
            warnings.push(`Ligne ${i + 2} : terme ou abréviation vide, ignorée.`);
            return;
          }

          const synonymesRaw = String(row.synonymes || "");
          const synonymes = synonymesRaw
            ? synonymesRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          entries.push({
            id: generateId(),
            terme_source: terme.toLowerCase(),
            abreviation: abr.toUpperCase(),
            description: String(row.description || ""),
            synonymes,
            categorie: String(row.categorie || "Général"),
            actif: row.actif !== undefined ? String(row.actif).toLowerCase() !== "false" && String(row.actif) !== "0" : true,
            date_maj: new Date().toISOString().split("T")[0],
            auteur: "import",
          });
        });

        resolve({ success: true, entries, errors: [], warnings });
      } catch (err) {
        resolve({
          success: false,
          entries: [],
          errors: [`Erreur de lecture du fichier : ${err}`],
          warnings: [],
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export dictionary to Excel file and trigger download
 */
export function exportToExcel(dictionary: DictionaryEntry[], filename = "dictionnaire_naming.xlsx") {
  const data = dictionary.map((e) => ({
    terme_source: e.terme_source,
    abreviation: e.abreviation,
    description: e.description,
    synonymes: e.synonymes.join(", "),
    categorie: e.categorie,
    actif: e.actif ? "oui" : "non",
    date_maj: e.date_maj,
    auteur: e.auteur,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dictionnaire");
  XLSX.writeFile(wb, filename);
}

/**
 * Export transformation results to Excel
 */
export function exportResultsToExcel(
  results: { original: string; transformed: string; details: string; status: string }[],
  filename = "resultats_naming.xlsx"
) {
  const ws = XLSX.utils.json_to_sheet(results.map(r => ({
    "Colonne d'origine": r.original,
    "Colonne renommée": r.transformed,
    "Détail du mapping": r.details,
    "Statut": r.status,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Résultats");
  XLSX.writeFile(wb, filename);
}
