/**
 * Taxonomy Map: Mapping Keywords to Civic Issue Types
 * This defines the "Brain" of the automatic classification.
 */
const TAXONOMY_MAP = {
    'Road': ['pothole', 'road', 'asphalt', 'tar', 'highway', 'street', 'pavement', 'road damage'],
    'Sanitation': ['litter', 'waste', 'garbage', 'trash', 'rubbish', 'plastic', 'bin', 'dumpster'],
    'Lighting': ['streetlight', 'lamp', 'darkness', 'lighting', 'light fixture'],
    'Public Safety': ['fire', 'smoke', 'hazard', 'accident', 'crash', 'collision'],
    'Water': ['flood', 'leak', 'water', 'drain', 'sewer', 'puddle']
};

/**
 * Determines the civic category based on Vision API labels.
 * @param {Array<{description: string, score: number}>} labels - Normalized labels from Vision Service.
 * @returns {{category: string, confidence: number, matchedKeyword: string}}
 */
exports.determineCategory = (labels) => {
    if (!labels || labels.length === 0) {
        return {
            category: 'Unclassified',
            confidence: 0,
            matchedKeyword: null
        };
    }

    // Iterate through labels (assuming they are sorted by score descending from Vision API, 
    // but the service ensures we receive them. We process them in order of importance).

    // We prefer a higher confidence match, so we iterate through the Taxonomies against the labels.
    // Optimization: Check the top 5 labels against the map.

    for (const label of labels) {
        // label.description is already lowercased in visionService
        const keyword = label.description;

        for (const [category, keywords] of Object.entries(TAXONOMY_MAP)) {
            if (keywords.includes(keyword)) {
                return {
                    category: category,
                    confidence: label.score,
                    matchedKeyword: keyword
                };
            }
        }
    }

    // Fallback if no specific taxonomy is matched
    return {
        category: 'General',
        confidence: 0,
        matchedKeyword: null
    };
};
