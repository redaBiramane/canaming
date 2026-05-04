import { createClient } from '@supabase/supabase-js';
// Trigger deployment to pick up SUPABASE_SERVICE_ROLE_KEY

// Standalone transformation logic for the API
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitWords(columnName: string): string[] {
  return columnName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function findMatch(word: string, dictionary: any[]) {
  const normalizedWord = normalize(word);
  const singularWord = normalizedWord.replace(/s$/, "");

  const exact = dictionary.find(
    (e) => e.actif && normalize(e.terme_source) === normalizedWord
  );
  if (exact) return { entry: exact, alternatives: [], matchType: "exact" };

  const exactSingular = dictionary.find(
    (e) => e.actif && normalize(e.terme_source) === singularWord
  );
  if (exactSingular) return { entry: exactSingular, alternatives: [], matchType: "exact" };

  const synonymMatches = dictionary.filter(
    (e) =>
      e.actif &&
      e.synonymes?.some((s: string) => normalize(s) === normalizedWord || normalize(s) === singularWord)
  );

  if (synonymMatches.length > 0) {
    return { entry: synonymMatches[0], alternatives: synonymMatches.slice(1), matchType: "synonym" };
  }

  const abbrevMatch = dictionary.find(
    (e) => e.actif && normalize(e.abreviation) === normalizedWord.toUpperCase()
  );
  if (abbrevMatch) return { entry: abbrevMatch, alternatives: [], matchType: "exact" };

  return { entry: null, alternatives: [], matchType: "none" };
}

export default async function handler(req: any, res: any) {
  // 1. Get input
  const keyword = req.query.keyword || req.body?.keyword;

  if (!keyword) {
    return res.status(400).json({ 
      error: 'Missing keyword parameter',
      usage: '/api/transform?keyword=your_word'
    });
  }

  // 2. Init Supabase — use SERVICE_ROLE_KEY to bypass RLS
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Fetch ALL dictionary rows using pagination (Supabase limits to 1000/request)
    const allRows: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('dictionary')
        .select('*')
        .eq('actif', true)
        .order('terme_source')
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    // Fetch stop words
    const { data: stopWordsSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'stop_words')
      .maybeSingle();

    let stopWordsArray: string[] = [];
    if (stopWordsSetting?.value) {
      try {
        const parsed = JSON.parse(stopWordsSetting.value);
        if (Array.isArray(parsed)) stopWordsArray = parsed;
      } catch (e) {
        console.error("Error parsing stop words", e);
      }
    }

    const stopWords = new Set(stopWordsArray.map(w => normalize(w)));

    // Build multi-word lookup map
    const multiWordMap = new Map<string, any>();
    let maxGroupLen = 1;
    for (const entry of allRows) {
      const normalized = normalize(entry.terme_source);
      const wordCount = normalized.split(/\s+/).length;
      if (wordCount > 1) {
        multiWordMap.set(normalized, entry);
        maxGroupLen = Math.max(maxGroupLen, wordCount);
      }
      // Check synonyms too
      if (entry.synonymes) {
        const syns = Array.isArray(entry.synonymes) ? entry.synonymes : [];
        for (const syn of syns) {
          const normSyn = normalize(syn);
          const synWc = normSyn.split(/\s+/).length;
          if (synWc > 1) {
            multiWordMap.set(normSyn, entry);
            maxGroupLen = Math.max(maxGroupLen, synWc);
          }
        }
      }
    }

    // 4. Transform with greedy multi-word matching
    const words = splitWords(keyword);
    const mappings = [];
    
    let i = 0;
    while (i < words.length) {
      if (stopWords.has(normalize(words[i]))) { i++; continue; }

      // Try longest group first
      let matched = false;
      for (let len = Math.min(maxGroupLen, words.length - i); len > 1; len--) {
        const group = words.slice(i, i + len);
        const groupNorm = group.map(w => normalize(w)).join(" ");

        const multiEntry = multiWordMap.get(groupNorm);
        if (multiEntry) {
          mappings.push({
            original: group.join("_"),
            transformed: multiEntry.abreviation,
            status: "ok",
            match_type: "exact_multi",
            meaning: multiEntry.terme_source
          });
          i += len;
          matched = true;
          break;
        }

        // Also check terme_source with underscores
        const directMatch = allRows.find(
          (e: any) => e.actif && normalize(e.terme_source).replace(/[_\s]+/g, " ") === groupNorm
        );
        if (directMatch) {
          mappings.push({
            original: group.join("_"),
            transformed: directMatch.abreviation,
            status: "ok",
            match_type: "exact_multi",
            meaning: directMatch.terme_source
          });
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // Single word fallback
      const word = words[i];
      const { entry, alternatives, matchType } = findMatch(word, allRows);

      mappings.push({
        original: word,
        transformed: entry ? entry.abreviation : word.toUpperCase(),
        status: matchType === "none" ? "inconnu" : (alternatives.length > 0 ? "ambigu" : "ok"),
        match_type: matchType,
        meaning: entry ? entry.terme_source : null
      });
      i++;
    }

    const result = {
      original: keyword,
      transformed: mappings.map(m => m.transformed).join('_'),
      details: mappings,
      dictionary_size: dict.length,
      timestamp: new Date().toISOString()
    };

    // 5. Response
    // Add CORS headers to allow external access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(200).json(result);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
