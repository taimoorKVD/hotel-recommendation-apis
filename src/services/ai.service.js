import { openai } from "../config/openai.js";
import {safeJsonParse} from "../utils/json.js";

export async function getAIRecommendations(userQuery, availableHotels) {
    try {
        const hotelSummary = availableHotels.map(h => ({
            id: h.id,
            name: h.name,
            city: h.city,
            country: h.country,
            price: h.price_per_night,
            rating: h.star_rating,
            type: h.hotel_type,
            amenities: safeJsonParse(h.amenities),
        }));

        const prompt = `
User query (natural language):
"${userQuery}"

Available hotels:
${JSON.stringify(hotelSummary, null, 2)}

TASK:
- Understand the user's intent in plain English
- Rank hotels from BEST match to WORST match
- Consider:
  • price sensitivity (cheap / budget / luxury)
  • comfort & rating
  • amenities mentioned or implied
  • family / business / leisure intent

Respond ONLY with a JSON array of hotel IDs in ranked order:

[
  { "hotel_id": 12, "match_score": 92, "reason": "Why this matches" }
]

Do NOT limit the number of results.
Return valid JSON only.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a hotel ranking engine. Return valid JSON only." },
                { role: "user", content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 1500,
        });

        const content = response.choices[0].message.content.trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Invalid JSON from AI");

        return JSON.parse(jsonMatch[0]);

    } catch (err) {
        console.error("AI ranking error:", err);
        return [];
    }
}
