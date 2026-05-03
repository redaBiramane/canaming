import { createClient } from '@supabase/supabase-js';

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

  // 2. Init Supabase
  // Note: Vercel will use these from your environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Fetch data
    const [{ data: dictionary }, { data: stopWordsSetting }] = await Promise.all([
      supabase.from('dictionary').select('*').eq('actif', true),
      supabase.from('app_settings').select('value').eq('key', 'stop_words').single()
    ]);

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
    const dict = dictionary || [];

    // 4. Transform
    const words = splitWords(keyword);
    const mappings = [];
    
    for (const word of words) {
      if (stopWords.has(normalize(word))) continue;

      const { entry, alternatives, matchType } = findMatch(word, dict);

      mappings.push({
        original: word,
        transformed: entry ? entry.abreviation : word.toUpperCase(),
        status: matchType === "none" ? "inconnu" : (alternatives.length > 0 ? "ambigu" : "ok"),
        match_type: matchType,
        meaning: entry ? entry.terme_source : null
      });
    }

    const result = {
      original: keyword,
      transformed: mappings.map(m => m.transformed).join('_'),
      details: mappings,
      debug: {
        dictionary_count: dict.length,
        stop_words_count: stopWords.size,
      },
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
