import { getPool } from "../config/db.js";
import {safeJsonParse} from "../utils/json.js";

export async function buildUserPreferenceText(user_id, days = 90) {
    const pool = getPool();

    const [rows] = await pool.query(
        `
    SELECT h.name, h.city, h.hotel_type, h.amenities, e.event_type
    FROM user_events e
    JOIN hotels h ON h.id = e.hotel_id
    WHERE e.user_id = ?
      AND e.created_at >= NOW() - INTERVAL ? DAY
    `,
        [user_id, days]
    );

    if (!rows.length) return [];

    return rows.map(r => {
        const weight =
            r.event_type === "booking" ? "strongly prefers" :
                r.event_type === "click" ? "likes" :
                    "viewed";

        return `
User ${weight} ${r.hotel_type} hotels in ${r.city}.
Amenities: ${safeJsonParse(r.amenities)}.
`;
    });
}
