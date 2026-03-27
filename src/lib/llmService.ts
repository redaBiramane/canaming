// LLM Service for intelligent column naming transformation
// Calls OpenAI API with the dictionary as context

import { DictionaryEntry } from './dictionary';

export interface LLMTransformResult {
  transformedQuery: string;
  mappings: { original: string; transformed: string; reason: string }[];
  explanation: string;
}

/**
 * Build the system prompt that teaches the LLM the naming conventions
 */
export function buildSystemPrompt(dictionary: DictionaryEntry[]): string {
  const dictRules = dictionary
    .filter((e) => e.actif)
    .map((e) => {
      const synonyms = e.synonymes.length > 0 ? ` (synonymes: ${e.synonymes.join(', ')})` : '';
      return `- "${e.terme_source}" → ${e.abreviation}${synonyms}`;
    })
    .join('\n');

  return `Tu es un expert en normalisation de noms de colonnes SQL pour le Crédit Agricole.

RÈGLES DE NOMMAGE :
1. Chaque mot dans un nom de colonne doit être remplacé par son abréviation selon le dictionnaire ci-dessous.
2. Les mots sont séparés par des underscores (_).
3. Si un mot n'est pas dans le dictionnaire, le garder en MAJUSCULES tel quel.
4. Préserver la structure SQL (SELECT, FROM, WHERE, JOIN, etc.) — ne modifier QUE les noms de colonnes et alias.
5. Préserver les blocs Jinja ({{ }}, {% %}) intacts.
6. Préserver les noms de tables, les fonctions SQL, et les constantes.

DICTIONNAIRE DE NOMMAGE :
${dictRules}

INSTRUCTIONS DE RÉPONSE :
Tu dois répondre UNIQUEMENT avec un JSON valide au format suivant, sans texte autour :
{
  "transformedQuery": "le SQL transformé complet",
  "mappings": [
    { "original": "nom_original", "transformed": "NOM_TRANSFORME", "reason": "explication courte" }
  ],
  "explanation": "résumé des changements"
}`;
}

/**
 * Call OpenAI API to transform a SQL query using the dictionary
 */
export async function transformWithLLM(
  query: string,
  dictionary: DictionaryEntry[],
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<LLMTransformResult> {
  const systemPrompt = buildSystemPrompt(dictionary);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Transforme les noms de colonnes de cette requête SQL selon le dictionnaire de nommage :\n\n${query}`,
        },
      ],
      temperature: 0.1, // Low temperature for deterministic output
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData as any)?.error?.message || `Erreur API OpenAI (${response.status})`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = (data as any).choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Réponse vide de l\'API OpenAI');
  }

  // Parse the JSON response — handle potential markdown code blocks
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      transformedQuery: parsed.transformedQuery || query,
      mappings: parsed.mappings || [],
      explanation: parsed.explanation || '',
    };
  } catch {
    // If JSON parsing fails, return the raw content as the transformed query
    return {
      transformedQuery: content,
      mappings: [],
      explanation: 'L\'IA a retourné une réponse non structurée.',
    };
  }
}
