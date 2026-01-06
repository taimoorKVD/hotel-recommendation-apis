import { getHotelById, getRoomsByHotelId } from "../repositories/hotels.repo.js";
import { safeJsonParse } from "../utils/json.js";

export async function getById(req, res) {
    try {
        const hotelId = Number(req.params.id);

        if (!hotelId) {
            return res.status(400).json({
                success: false,
                error: "Invalid hotel id",
            });
        }

        /* ----------------------------------------
           1️⃣ Fetch hotel
        ---------------------------------------- */
        const hotel = await getHotelById(hotelId);

        if (!hotel) {
            return res.status(404).json({
                success: false,
                error: "Hotel not found",
            });
        }

        hotel.amenities = safeJsonParse(hotel.amenities);

        /* ----------------------------------------
           2️⃣ Fetch rooms
        ---------------------------------------- */
        const rooms = await getRoomsByHotelId(hotelId);

        const safeRooms = Array.isArray(rooms)
            ? rooms.map(r => ({
                ...r,
                room_amenities: safeJsonParse(r.room_amenities),
            }))
            : [];

        /* ----------------------------------------
           3️⃣ Response
        ---------------------------------------- */
        res.json({
            success: true,
            hotel: {
                ...hotel,
                rooms: safeRooms,
            },
        });
    } catch (err) {
        console.error("Hotel fetch error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch hotel",
        });
    }
}
