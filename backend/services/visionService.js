require('dotenv').config();
const vision = require('@google-cloud/vision');

// Initialize the Vision API client
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn("Vision API disabled — credentials not found");
}

let clientOptions = {};
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
const client = new vision.ImageAnnotatorClient(clientOptions);

/**
 * Analyzes an image buffer using Google Cloud Vision API.
 * Returns a simplified list of labels and scores.
 * @param {Buffer} imageBuffer - The image data as a buffer.
 * @returns {Promise<Array<{description: string, score: number}>>}
 */
exports.analyzeImage = async (imageBuffer) => {
    try {
        const [result] = await client.labelDetection({
            image: {
                content: imageBuffer
            }
        });

        const labels = result.labelAnnotations || [];

        // Normalize and filter results
        // We map to a simpler structure and filter out very low confidence matches (< 50%)
        // to reduce noise, although the classifier handles prioritization.
        return labels
            .filter(label => label.score >= 0.5)
            .map(label => ({
                description: label.description.toLowerCase(),
                score: label.score
            }));

    } catch (error) {
        console.error("Vision API Error:", error.message);
        throw error; // Propagate error to be handled (fail-open) in the controller
    }
};
