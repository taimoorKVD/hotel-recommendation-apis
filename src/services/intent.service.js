import { createEmbedding } from "./embedding.service.js";
import { cosineSimilarity } from "../utils/math.util.js";

/**
 * Semantic intent anchors
 */
const INTENT_ANCHORS = {
    budget: "cheap affordable low cost budget hotel",
    luxury: "luxury premium five star high end hotel",
    comfort: "comfortable cozy relaxing hotel",
    family: "family friendly kids children hotel",
    business: "business travel conference work hotel",
    romantic: "romantic honeymoon couple getaway hotel",
};

let anchorVectors = null;

async function loadAnchorVectors() {
    if (anchorVectors) return anchorVectors;

    anchorVectors = {};

    for (const [intent, text] of Object.entries(INTENT_ANCHORS)) {
        try {
            const vec = await createEmbedding(text);
            if (Array.isArray(vec)) {
                anchorVectors[intent] = vec;
            }
        } catch (err) {
            console.warn(`⚠️ Failed to embed intent anchor: ${intent}`);
        }
    }

    return anchorVectors;
}

/**
 * Infer continuous intent signals
 * NEVER throws
 */
export async function inferIntentSignals(queryEmbedding) {
    if (!Array.isArray(queryEmbedding)) {
        return {};
    }

    const anchors = await loadAnchorVectors();
    const signals = {};

    for (const [intent, vector] of Object.entries(anchors)) {
        signals[intent] = cosineSimilarity(queryEmbedding, vector);
    }

    return signals;
}
