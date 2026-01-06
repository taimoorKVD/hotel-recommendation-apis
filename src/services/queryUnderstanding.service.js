import {openai} from "../config/openai.js";

/**
 * Converts free-text query into structured constraints
 */
export async function understandQuery(query) {
    const prompt = `
You are a travel search understanding engine.

Extract structured search constraints from the query.

Query:
"${query}"

Return ONLY valid JSON:
{
  "city": string | null,
  "country": string | null,
  "hotel_type": "Luxury" | "Budget" | "Business" | "Family" | "Boutique" | "Resort" | null,
  "min_rating": number | null,
  "price_level": "cheap" | "mid" | "luxury" | null,
  "intent": string
}

Rules:
- City may appear in any form (uppercase/lowercase)
- Country may be implied
- Hotel type must match enum
- Infer intent from tone (vacation, honeymoon, business, etc.)
`;

    const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
            {role: "system", content: "You extract search intent as JSON only."},
            {role: "user", content: prompt},
        ],
    });

    return JSON.parse(res.choices[0].message.content);
}
