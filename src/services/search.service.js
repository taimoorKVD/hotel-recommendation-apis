import { semanticHotelSearch } from "./vectorSearch.service.js";
import { buildHybridScores } from "./scoring.service.js";
import { checkAvailability } from "./availability.service.js";
import { getHotelsForSearch } from "../repositories/hotels.repo.js";
import { inferIntentSignals } from "./intent.service.js";
import { safeJsonParse } from "../utils/json.js";
import { understandQuery } from "./queryUnderstanding.service.js";

/**
 * Main search orchestrator
 * Natural-language first. Params optional.
 */
export async function searchHotels(params = {}, context = {}) {
    const {
        query,
        min_price,
        max_price,
        min_rating,
        check_in,
        check_out,
        guests,
        page = 1,
        page_size = 10,
    } = params;

    const {
        user_id = "anon",
        ab_group = "A",
    } = context;

    if (!query || !query.trim()) {
        throw new Error("Search query is required");
    }

    /* ----------------------------------------
       1️⃣ Understand query (LLM)
    ---------------------------------------- */
    let extracted = {};

    try {
        extracted = await understandQuery(query);
    } catch (err) {
        console.warn("⚠️ Query understanding failed:", err.message);
    }

    const resolvedCity = extracted.city || null;
    const resolvedHotelType = extracted.hotel_type || null;
    const resolvedMinRating =
        extracted.min_rating ?? min_rating ?? null;

    /* ----------------------------------------
       2️⃣ Load hotels (DB source of truth)
    ---------------------------------------- */
    const hotels = await getHotelsForSearch();
    const hotelMap = new Map();

    if (Array.isArray(hotels)) {
        hotels.forEach(h => {
            hotelMap.set(h.id, {
                ...h,
                amenities: safeJsonParse(h.amenities),
            });
        });
    }

    /* ----------------------------------------
       3️⃣ Semantic vector search (Qdrant)
    ---------------------------------------- */
    let vectorResults = [];
    let queryEmbedding = null;

    try {
        const vectorResponse = await semanticHotelSearch({
            query,
            city: resolvedCity,
            min_price,
            max_price,
            min_rating: resolvedMinRating,
            user_id,
        });

        vectorResults = Array.isArray(vectorResponse?.vectorResults)
            ? vectorResponse.vectorResults
            : [];

        queryEmbedding = vectorResponse?.queryEmbedding || null;
    } catch (err) {
        console.warn("⚠️ Semantic search failed, fallback engaged:", err.message);
    }

    /* ----------------------------------------
       4️⃣ Intent inference (non-blocking)
    ---------------------------------------- */
    let intentSignals = {};

    try {
        if (Array.isArray(queryEmbedding)) {
            intentSignals = await inferIntentSignals(queryEmbedding);
        }
    } catch (err) {
        console.warn("⚠️ Intent inference skipped:", err.message);
    }

    /* ----------------------------------------
       5️⃣ Hybrid scoring (semantic-first)
    ---------------------------------------- */
    let ranked = [];
    let used_semantic = false;

    if (vectorResults.length > 0) {
        const rankedResponse = await buildHybridScores({
            vectorResults,
            hotelMap,
            intentSignals,
            ab_group,
        });

        ranked = Array.isArray(rankedResponse)
            ? rankedResponse
            : Array.isArray(rankedResponse?.results)
                ? rankedResponse.results
                : [];

        used_semantic = ranked.length > 0;
    }

    /* ----------------------------------------
       6️⃣ INTENT-AWARE FALLBACK (CRITICAL)
    ---------------------------------------- */
    if (ranked.length === 0) {
        ranked = Array.from(hotelMap.values()).filter(hotel => {
            if (resolvedCity &&
                hotel.city?.toLowerCase() !== resolvedCity.toLowerCase()) {
                return false;
            }

            if (resolvedHotelType &&
                hotel.hotel_type !== resolvedHotelType) {
                return false;
            }

            if (resolvedMinRating &&
                Number(hotel.star_rating) < resolvedMinRating) {
                return false;
            }

            return true;
        });

        // Rank fallback by quality
        ranked.sort((a, b) => {
            const ratingDiff =
                Number(b.star_rating || 0) - Number(a.star_rating || 0);
            if (ratingDiff !== 0) return ratingDiff;
            return Number(b.price_per_night || 0) - Number(a.price_per_night || 0);
        });

        used_semantic = false;
    }

    /* ----------------------------------------
       7️⃣ Availability filtering
    ---------------------------------------- */
    let available = ranked;

    if (check_in && check_out) {
        const checked = await checkAvailability(
            ranked,
            check_in,
            check_out,
            guests || 1
        );

        available = Array.isArray(checked) ? checked : [];
    }

    /* ----------------------------------------
       8️⃣ Pagination
    ---------------------------------------- */
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.max(Number(page_size) || 10, 1);
    const offset = (currentPage - 1) * pageSize;

    const pagedHotels = available.slice(offset, offset + pageSize);

    /* ----------------------------------------
       9️⃣ Final response
    ---------------------------------------- */
    return {
        success: true,
        query,
        used_semantic,
        extracted, // 👈 optional, useful for frontend explanations
        total_results: available.length,
        page: currentPage,
        page_size: pageSize,
        hotels: pagedHotels,
    };
}
