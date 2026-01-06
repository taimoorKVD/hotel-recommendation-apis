/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a, b) {
    // ✅ Defensive guards
    if (!Array.isArray(a) || !Array.isArray(b)) return 0;
    if (a.length === 0 || b.length === 0) return 0;
    if (a.length !== b.length) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] ** 2;
        magB += b[i] ** 2;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 0;

    return dot / denom;
}

