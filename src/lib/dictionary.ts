// Dictionary data layer - the core business logic for column naming standardization

export interface DictionaryEntry {
  id: string;
  terme_source: string;
  abreviation: string;
  description: string;
  synonymes: string[];
  categorie: string;
  actif: boolean;
  date_maj: string;
  auteur: string;
}

export interface HistoryEntry {
  id: string;
  date: string;
  auteur: string;
  action: "ajout" | "modification" | "suppression" | "import";
  terme: string;
  ancienne_valeur?: string;
  nouvelle_valeur?: string;
  champ?: string;
}

export interface TransformResult {
  original: string;
  transformed: string;
  status: "ok" | "ambigu" | "inconnu" | "partiel";
  details: WordMapping[];
  confidence: number;
}

export interface WordMapping {
  original: string;
  transformed: string;
  status: "ok" | "ambigu" | "inconnu";
  alternatives?: string[];
}

// Default dictionary with ~35 realistic data/BI terms
export const DEFAULT_DICTIONARY: DictionaryEntry[] = [
  { id: "1", terme_source: "montant", abreviation: "MNT", description: "Montant financier", synonymes: ["somme", "total"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "2", terme_source: "code", abreviation: "COD", description: "Code identifiant", synonymes: ["identifiant"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "3", terme_source: "salaire", abreviation: "SAL", description: "Salaire", synonymes: ["rémunération", "remuneration", "paie"], categorie: "RH", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "4", terme_source: "date", abreviation: "DAT", description: "Date", synonymes: [], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "5", terme_source: "client", abreviation: "CLT", description: "Client", synonymes: ["clt", "consommateur"], categorie: "Commercial", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "6", terme_source: "numéro", abreviation: "NUM", description: "Numéro", synonymes: ["numero", "no", "n°"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "7", terme_source: "agence", abreviation: "AGC", description: "Agence bancaire", synonymes: ["succursale", "bureau"], categorie: "Structure", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "8", terme_source: "naissance", abreviation: "NAIS", description: "Naissance", synonymes: ["né", "ne"], categorie: "Civil", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "9", terme_source: "compte", abreviation: "CPT", description: "Compte bancaire", synonymes: [], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "10", terme_source: "type", abreviation: "TYP", description: "Type / catégorie", synonymes: ["categorie", "genre"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "11", terme_source: "libellé", abreviation: "LIB", description: "Libellé descriptif", synonymes: ["libelle", "label", "intitulé"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "12", terme_source: "identifiant", abreviation: "IDT", description: "Identifiant unique", synonymes: ["id"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "13", terme_source: "adresse", abreviation: "ADR", description: "Adresse postale", synonymes: ["adr"], categorie: "Contact", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "14", terme_source: "téléphone", abreviation: "TEL", description: "Numéro de téléphone", synonymes: ["telephone", "tel", "phone"], categorie: "Contact", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "15", terme_source: "email", abreviation: "EML", description: "Adresse email", synonymes: ["mail", "courriel"], categorie: "Contact", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "16", terme_source: "nom", abreviation: "NOM", description: "Nom de famille", synonymes: ["patronyme"], categorie: "Civil", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "17", terme_source: "prénom", abreviation: "PRN", description: "Prénom", synonymes: ["prenom"], categorie: "Civil", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "18", terme_source: "devise", abreviation: "DEV", description: "Devise monétaire", synonymes: ["monnaie", "currency"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "19", terme_source: "solde", abreviation: "SLD", description: "Solde du compte", synonymes: ["balance"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "20", terme_source: "opération", abreviation: "OPE", description: "Opération bancaire", synonymes: ["operation", "transaction"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "21", terme_source: "pays", abreviation: "PAY", description: "Pays", synonymes: ["nation"], categorie: "Géographie", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "22", terme_source: "ville", abreviation: "VIL", description: "Ville", synonymes: ["commune", "cité"], categorie: "Géographie", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "23", terme_source: "région", abreviation: "REG", description: "Région", synonymes: ["region"], categorie: "Géographie", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "24", terme_source: "statut", abreviation: "STT", description: "Statut", synonymes: ["état", "etat", "status"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "25", terme_source: "description", abreviation: "DSC", description: "Description", synonymes: ["desc"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "26", terme_source: "crédit", abreviation: "CRD", description: "Montant au crédit", synonymes: ["credit"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "27", terme_source: "débit", abreviation: "DBT", description: "Montant au débit", synonymes: ["debit"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "28", terme_source: "taux", abreviation: "TAX", description: "Taux", synonymes: ["pourcentage", "ratio"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "29", terme_source: "contrat", abreviation: "CTR", description: "Contrat", synonymes: ["convention", "accord"], categorie: "Juridique", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "30", terme_source: "produit", abreviation: "PRD", description: "Produit financier", synonymes: ["offre"], categorie: "Commercial", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "31", terme_source: "référence", abreviation: "REF", description: "Référence unique", synonymes: ["reference", "ref"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "32", terme_source: "total", abreviation: "TOT", description: "Total cumulé", synonymes: ["cumul"], categorie: "Finance", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "33", terme_source: "début", abreviation: "DEB", description: "Date ou point de début", synonymes: ["debut", "commencement"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "34", terme_source: "fin", abreviation: "FIN", description: "Date ou point de fin", synonymes: ["terme", "clôture"], categorie: "Général", actif: true, date_maj: "2026-03-01", auteur: "admin" },
  { id: "35", terme_source: "banque", abreviation: "BNQ", description: "Établissement bancaire", synonymes: ["établissement"], categorie: "Structure", actif: true, date_maj: "2026-03-01", auteur: "admin" },
];

// Generate a unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}
