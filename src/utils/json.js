export function safeJsonParse(value) {
    if (Array.isArray(value)) return value;

    if (typeof value !== "string") return [];

    // Try JSON first
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
    } catch (_) {}

    // Fallback: comma-separated string
    return value
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
}