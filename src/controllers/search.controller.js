import { searchHotels } from "../services/search.service.js";
import { logEvent } from "../repositories/events.repo.js";

export async function search(req, res) {
    try {
        const context = {
            ab_group: req.headers["x-ab-group"] || "A",
            user_id: req.headers["x-user-id"] || "anon",
        };

        const result = await searchHotels(req.body, context);

        const hotels = Array.isArray(result?.hotels) ? result.hotels : [];

        // 🔴 Non-blocking impression logging (SAFE)
        hotels.forEach(hotel => {
            logEvent({
                user_id: context.user_id,
                hotel_id: hotel.id,
                event_type: "impression",
                ab_group: context.ab_group,
            }).catch(() => {});
        });

        res.json({
            success: true,
            ab_group: context.ab_group,
            ...result,
            hotels,
            total_results: hotels.length,
        });
    } catch (err) {
        console.error("Search controller error:", err);
        res.status(500).json({
            error: err.message || "Search failed",
        });
    }
}