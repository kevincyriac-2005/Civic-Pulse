const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const Complaint = require("../model/Complaint");

const uploadDir = path.resolve(__dirname, "../uploads");

function ensureUploadDir() {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

function isBase64Image(value) {
    return typeof value === "string" && value.startsWith("data:image");
}

function isUploadPath(value) {
    return typeof value === "string" && value.startsWith("/uploads");
}

function saveBase64Image(image) {
    const base64Data = image.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
    const filePath = path.join(uploadDir, filename);

    /*
     * MAINTENANCE SCRIPT — NOT A LIVE UPLOAD HANDLER
     * This write bypasses saveImage() validation intentionally
     * for one-off migration use only.
     * If this script is ever adapted for live data migration,
     * replace this writeFileSync with saveImage() and apply
     * MIME type and size validation before writing.
     */
    fs.writeFileSync(filePath, buffer);

    return {
        dbPath: `/uploads/${filename}`,
        filePath
    };
}

async function migrateComplaintImages() {
    const complaints = await Complaint.find({
        $or: [
            { beforeImageUrl: { $regex: "^data:image" } },
            { afterImageUrl: { $regex: "^data:image" } }
        ]
    });

    let migratedImages = 0;

    for (const complaint of complaints) {
        const updates = {};
        const createdFiles = [];
        const migratedFields = [];

        if (isBase64Image(complaint.beforeImageUrl) && !isUploadPath(complaint.beforeImageUrl)) {
            const savedImage = saveBase64Image(complaint.beforeImageUrl);
            updates.beforeImageUrl = savedImage.dbPath;
            createdFiles.push(savedImage.filePath);
            migratedFields.push("beforeImage");
        }

        if (isBase64Image(complaint.afterImageUrl) && !isUploadPath(complaint.afterImageUrl)) {
            const savedImage = saveBase64Image(complaint.afterImageUrl);
            updates.afterImageUrl = savedImage.dbPath;
            createdFiles.push(savedImage.filePath);
            migratedFields.push("afterImage");
        }

        if (Object.keys(updates).length > 0) {
            try {
                await Complaint.updateOne(
                    { _id: complaint._id },
                    { $set: updates }
                );
            } catch (error) {
                for (const createdFile of createdFiles) {
                    if (fs.existsSync(createdFile)) {
                        fs.unlinkSync(createdFile);
                    }
                }

                throw error;
            }

            for (const field of migratedFields) {
                migratedImages += 1;
                console.log(`Migrated complaint ${complaint._id} ${field}`);
            }
        }
    }

    console.log(`Total migrated images: ${migratedImages}`);
}

async function main() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("MONGO_URI is missing in backend/.env");
    }

    ensureUploadDir();
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    await migrateComplaintImages();
}

main()
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    });
