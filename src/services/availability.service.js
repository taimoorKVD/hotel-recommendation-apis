import { getAvailabilityByHotel } from "../repositories/rooms.repo.js";

export async function checkAvailability(hotels, checkIn, checkOut, guests = 1) {
    // ✅ GUARANTEE: always return an array
    if (!Array.isArray(hotels) || hotels.length === 0) {
        return [];
    }

    const available = [];

    for (const hotel of hotels) {
        const bookings = await getAvailabilityByHotel(
            hotel.id,
            checkIn,
            checkOut,
            guests
        );

        // bookings is always an array (repo guarantees this)
        const hasAvailability = bookings.some(
            b => Number(b.available_rooms) > Number(b.booked)
        );

        if (hasAvailability) {
            available.push({
                ...hotel,
                available_rooms: bookings,
            });
        }
    }

    return available;
}
