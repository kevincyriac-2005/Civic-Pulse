/**
 * STATUS MAPPING UTILITY
 * 
 * Maps legacy database statuses to the new Canonical Status Model:
 * REPORTED, ASSIGNED, IN_PROGRESS, VERIFICATION_PENDING, RESOLVED, REJECTED
 */

const STATUS_MAP = {
    // Legacy -> Canonical
    "Pending": "REPORTED",
    "Open": "REPORTED",
    "Assigned": "ASSIGNED",
    "Scheduled": "ASSIGNED", // Merging Scheduled into Assigned
    "In Progress": "IN_PROGRESS",
    "InProgress": "IN_PROGRESS",
    "In-Progress": "IN_PROGRESS",
    "Resolved - Pending Officer Review": "VERIFICATION_PENDING",
    "Resolved": "RESOLVED",
    "Rejected": "REJECTED",
    "Withdrawn": "REJECTED", // Merging Withdrawn into Rejected

    // Canonical -> Canonical (Passthrough)
    "REPORTED": "REPORTED",
    "ASSIGNED": "ASSIGNED",
    "IN_PROGRESS": "IN_PROGRESS",
    "VERIFICATION_PENDING": "VERIFICATION_PENDING",
    "RESOLVED": "RESOLVED",
    "REJECTED": "REJECTED"
};

/**
 * Maps any incoming status string to the strict Canonical enum value.
 * Falls back to the original string if no map exists to allow Mongo validation to throw naturally.
 */
const mapToCanonical = (legacyStatus) => {
    if (!legacyStatus) return legacyStatus;

    // Check direct map first
    if (STATUS_MAP[legacyStatus]) {
        return STATUS_MAP[legacyStatus];
    }

    // Helper to catch case-insensitive edge cases
    const normalizedKey = Object.keys(STATUS_MAP).find(
        key => key.toLowerCase() === legacyStatus.toLowerCase()
    );

    return normalizedKey ? STATUS_MAP[normalizedKey] : legacyStatus;
};

module.exports = { STATUS_MAP, mapToCanonical };
