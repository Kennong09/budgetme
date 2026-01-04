import { Transaction, Category } from '../hooks';
import { env } from '../../../utils/env';

export interface CategorySuggestion {
  transactionId: string;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Analyzes transactions using AI to suggest appropriate categories.
 * Uses OpenRouter API with Claude 3.5 Sonnet for intelligent categorization.
 * 
 * @param transactions - Uncategorized transactions to analyze
 * @param existingCategories - Available categories to choose from
 * @returns Array of category suggestions with confidence scores
 */
export const suggestCategories = async (
  transactions: Transaction[],
  existingCategories: Category[]
): Promise<CategorySuggestion[]> => {
  try {
    const apiKey = env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenRouter API key not found. AI categorization unavailable.');
      return [];
    }

    // Prepare transaction data for AI analysis
    const transactionData = transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      description: tx.description || '',
      notes: tx.notes || '',
      date: tx.date
    }));

    // Prepare category options
    const categoryOptions = existingCategories
      .filter(cat => cat.type === 'expense')
      .map(cat => ({
        id: cat.id,
        name: cat.category_name
      }));

    const prompt = `You are a financial categorization expert. Analyze the following transactions and suggest the most appropriate category for each one.

Available categories:
${JSON.stringify(categoryOptions, null, 2)}

Transactions to categorize:
${JSON.stringify(transactionData, null, 2)}

For each transaction, suggest:
1. The category_id (or null if none fit well)
2. The category_name
3. A confidence score (0-100)
4. A brief reasoning

Return your response as a JSON array with this exact structure:
[
  {
    "transactionId": "uuid",
    "suggestedCategoryId": number | null,
    "suggestedCategoryName": "string",
    "confidence": number,
    "reasoning": "string"
  }
]

Be conservative with confidence scores. Only suggest categories with >70% confidence if you're very sure.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BudgetMe - Category Suggestions'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent categorization
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in API response');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const suggestions: CategorySuggestion[] = JSON.parse(jsonMatch[0]);
    return suggestions;

  } catch (error) {
    console.error('Error in suggestCategories:', error);
    return [];
  }
};

/**
 * Analyzes transaction description using simple heuristics as fallback.
 * Used when AI API is unavailable.
 * 
 * @param transaction - Transaction to analyze
 * @param categories - Available categories
 * @returns Suggested category or null
 */
export const fallbackCategorySuggestion = (
  transaction: Transaction,
  categories: Category[]
): CategorySuggestion | null => {
  const description = (transaction.description || '').toLowerCase();
  const notes = (transaction.notes || '').toLowerCase();
  const text = `${description} ${notes}`;

  // Simple keyword matching
  const patterns = [
    { keywords: ['grocery', 'food', 'supermarket', 'market'], category: 'Groceries' },
    { keywords: ['gas', 'fuel', 'petrol', 'station'], category: 'Transportation' },
    { keywords: ['restaurant', 'cafe', 'dining', 'food'], category: 'Dining Out' },
    { keywords: ['electric', 'water', 'utility', 'bill'], category: 'Utilities' },
    { keywords: ['rent', 'mortgage', 'housing'], category: 'Housing' },
    { keywords: ['doctor', 'hospital', 'medical', 'health'], category: 'Healthcare' },
    { keywords: ['movie', 'entertainment', 'concert'], category: 'Entertainment' },
    { keywords: ['shopping', 'clothes', 'clothing'], category: 'Shopping' }
  ];

  for (const pattern of patterns) {
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        const matchedCategory = categories.find(
          cat => cat.category_name.toLowerCase() === pattern.category.toLowerCase()
        );
        
        if (matchedCategory) {
          return {
            transactionId: transaction.id,
            suggestedCategoryId: matchedCategory.id,
            suggestedCategoryName: matchedCategory.category_name,
            confidence: 60, // Lower confidence for heuristic matching
            reasoning: `Matched keyword "${keyword}" in transaction text`
          };
        }
      }
    }
  }

  return null;
};
