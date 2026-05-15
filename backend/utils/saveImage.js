const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const uploadDir = path.join(projectRoot, "uploads");
const dataUriRegex = /^data:image\/([a-zA-Z0-9+.-]+);base64,/;

function ensureUploadDir() {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

function isBase64Image(value) {
    return typeof value === "string" && value.startsWith("data:image");
}

function isUploadPath(value) {
    return typeof value === "string" && value.startsWith("/uploads/");
}

function getExtensionFromMime(mimeType = "") {
    const normalizedMime = String(mimeType).toLowerCase();
    const subtype = normalizedMime.split("/")[1] || "jpeg";
    const cleanSubtype = subtype.split(";")[0].split("+")[0];

    if (cleanSubtype === "jpeg" || cleanSubtype === "jpg") {
        return "jpg";
    }

    if (cleanSubtype === "png" || cleanSubtype === "webp" || cleanSubtype === "gif" || cleanSubtype === "bmp") {
        return cleanSubtype;
    }

    return "jpg";
}

function detectMimeFromBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return null;
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return "image/png";
    }

    if (
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}

function buildFilename(extension = "jpg") {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
}

function getUploadFilePath(relativeUploadPath) {
    const safeRelativePath = String(relativeUploadPath).split("?")[0].split("#")[0];
    const normalizedRelativePath = safeRelativePath.replace(/^\/+/, "");
    const absolutePath = path.resolve(projectRoot, normalizedRelativePath);

    if (!absolutePath.startsWith(uploadDir)) {
        throw new Error("Invalid upload path");
    }

    return absolutePath;
}

async function getImageBuffer(inputImage) {
    if (!inputImage) {
        throw new Error("Image input is required");
    }

    if (Buffer.isBuffer(inputImage)) {
        return { buffer: inputImage, extension: "jpg" };
    }

    if (typeof inputImage === "object" && Buffer.isBuffer(inputImage.buffer)) {
        const ext = getExtensionFromMime(inputImage.mimetype || inputImage.mimeType);
        return { buffer: inputImage.buffer, extension: ext };
    }

    if (typeof inputImage !== "string") {
        throw new Error("Unsupported image input type");
    }

    if (isBase64Image(inputImage)) {
        const match = inputImage.match(dataUriRegex);
        const extension = getExtensionFromMime(match ? `image/${match[1]}` : "image/jpeg");
        const base64Data = inputImage.split(";base64,").pop();
        return {
            buffer: Buffer.from(base64Data, "base64"),
            extension
        };
    }

    if (isUploadPath(inputImage)) {
        const filePath = getUploadFilePath(inputImage);
        return {
            buffer: fs.readFileSync(filePath),
            extension: path.extname(filePath).replace(".", "") || "jpg"
        };
    }

    if (inputImage.startsWith("http://") || inputImage.startsWith("https://")) {
        const response = await fetch(inputImage);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return {
            buffer: Buffer.from(arrayBuffer),
            extension: getExtensionFromMime(response.headers.get("content-type"))
        };
    }

    throw new Error("Unsupported image format");
}

async function saveImage(inputImage) {
    if (isUploadPath(inputImage)) {
        return inputImage;
    }

    // Remote URLs are allowed for read compatibility in getImageBuffer(),
    // but the write path must reject them to prevent SSRF from user input.
    if (typeof inputImage === "string" && (inputImage.startsWith("http://") || inputImage.startsWith("https://"))) {
        throw new Error("Remote URLs are not accepted in saveImage(). Provide a Base64 data URI or buffer only.");
    }

    ensureUploadDir();

    const { buffer, extension } = await getImageBuffer(inputImage);
    // These are security controls on the write path to limit what can be persisted,
    // independent of any higher-level business rules about how images are used.
    const MAX_BYTES = 10 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
        throw new Error("Image exceeds maximum allowed size of 10MB.");
    }

    // These are security controls on the write path to prevent arbitrary file uploads,
    // independent of any higher-level business rules about accepted complaint content.
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    const detectedMime = detectMimeFromBuffer(buffer);
    if (!detectedMime || !allowedMimes.includes(detectedMime)) {
        throw new Error("Invalid image type. Only JPEG, PNG, and WebP are allowed.");
    }

    const filename = buildFilename(extension);
    const absoluteFilePath = path.join(uploadDir, filename);

    fs.writeFileSync(absoluteFilePath, buffer);

    return `/uploads/${filename}`;
}

module.exports = {
    ensureUploadDir,
    getImageBuffer,
    isBase64Image,
    isUploadPath,
    saveImage,
    uploadDir,
    getUploadFilePath
};
