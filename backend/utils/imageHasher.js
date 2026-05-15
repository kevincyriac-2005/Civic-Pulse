const { Jimp } = require('jimp');
const { getImageBuffer } = require('./saveImage');

/**
 * Generates a perceptual hash (aHash) for an image URL or base64 string.
 * @param {string} source - URL or base64 data URI
 * @returns {Promise<string>} 64-bit binary string
 */
exports.generateHash = async (source) => {
    try {
        const { buffer } = await getImageBuffer(source);
        const image = await Jimp.read(buffer);

        image.resize(8, 8).grayscale();

        let total = 0;
        const pixels = [];

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
            const luma = this.bitmap.data[idx];
            total += luma;
            pixels.push(luma);
        });

        const mean = total / 64;
        let hash = '';

        for (const pixel of pixels) {
            hash += pixel >= mean ? '1' : '0';
        }

        return hash;
    } catch (error) {
        console.error("Hash generation failed:", error.message);
        return null;
    }
};

/**
 * Calculates the Hamming distance between two binary hashes.
 * @param {string} hash1
 * @param {string} hash2
 * @returns {number} Distance (0 to 64). Lower is more similar.
 */
exports.calculateHammingDistance = (hash1, hash2) => {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64; // Max distance on error

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
};
