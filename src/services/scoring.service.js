/**
 * Hybrid scoring engine
 * NEVER throws
 * ALWAYS returns an array
 */

export async function buildHybridScores({
                                            vectorResults,
                                            hotelMap,
                                            intentSignals = {},
                                            ab_group = "A",
                                        }) {
    // ✅ GUARARDS
    if (!Array.isArray(vectorResults) || vectorResults.length === 0) {
        return [];
    }

    if (!(hotelMap instanceof Map) || hotelMap.size === 0) {
        return [];
    }

    /* ----------------------------------------
       A/B ranking weights
    ---------------------------------------- */
    const WEIGHTS = ab_group === "B"
        ? {
            vector: 0.5,
            rating: 0.3,
            price: 0.2,
        }
        : {
            vector: 0.6,
            rating: 0.25,
            price: 0.15,
        };

    /* ----------------------------------------
       Intent multipliers (soft boost)
    ---------------------------------------- */
    const intentBoost = {
        budget: intentSignals.budget || 0,
        comfort: intentSignals.comfort || 0,
        luxury: intentSignals.luxury || 0,
        family: intentSignals.family || 0,
        business: intentSignals.business || 0,
        romantic: intentSignals.romantic || 0,
    };

    /* ----------------------------------------
       Score & enrich
    ---------------------------------------- */
    return vectorResults
        .map(v => {
            const hotel = hotelMap.get(v.hotel_id);
            if (!hotel) return null;

            const priceScore = hotel.price_per_night
                ? 1 / Number(hotel.price_per_night)
                : 0;

            const ratingScore = Number(hotel.star_rating || 0) / 5;

            let finalScore =
                WEIGHTS.vector * (v.score || 0) +
                WEIGHTS.rating * ratingScore +
                WEIGHTS.price * priceScore;

            // Soft intent boost
            finalScore +=
                intentBoost.budget * 0.05 +
                intentBoost.comfort * 0.04 +
                intentBoost.luxury * 0.03;

            return {
                ...hotel,
                vector_score: v.score || 0,
                price_score: priceScore,
                rating_score: ratingScore,
                final_score: finalScore,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.final_score - a.final_score);
}
