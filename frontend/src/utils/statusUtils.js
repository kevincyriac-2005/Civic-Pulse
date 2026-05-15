/**
 * STATUS UTILITY
 * 
 * Maps Canonical & Legacy statuses to consistent Human-Readable labels and UI Badge Colors.
 */

export const STATUS_DISPLAY_MAP = {
    // Canonical
    "REPORTED": "Pending",
    "ASSIGNED": "Assigned",
    "IN_PROGRESS": "In Progress",
    "VERIFICATION_PENDING": "Pending Review",
    "RESOLVED": "Resolved",
    "REJECTED": "Rejected",

    // Legacy support
    "Pending": "Pending",
    "Open": "Pending",
    "Scheduled": "Assigned",
    "In Progress": "In Progress",
    "InProgress": "In Progress",
    "In-Progress": "In Progress",
    "Resolved - Pending Officer Review": "Pending Review",
    "Withdrawn": "Withdrawn"
};

export const STATUS_COLORS = {
    // Canonical
    "REPORTED": "#64748b",             // Gray
    "ASSIGNED": "#3b82f6",             // Blue
    "IN_PROGRESS": "#f97316",          // Orange
    "VERIFICATION_PENDING": "#eab308", // Yellow
    "RESOLVED": "#10b981",             // Green
    "REJECTED": "#ef4444",             // Red

    // Legacy support
    "Pending": "#64748b",
    "Open": "#64748b",
    "Scheduled": "#3b82f6",
    "InProgress": "#f97316",
    "In Progress": "#f97316",
    "In-Progress": "#f97316",
    "Resolved - Pending Officer Review": "#eab308",
    "Withdrawn": "#ef4444"
};

/**
 * Returns the human-readable label for any given status payload.
 * Defaults back to the raw string if not found.
 */
export const getStatusLabel = (status) => {
    return STATUS_DISPLAY_MAP[status] || status;
};

/**
 * Returns the standardized hex color code for the badge representation of a status.
 * Defaults to gray.
 */
export const getStatusColor = (status) => {
    return STATUS_COLORS[status] || "#64748b";
};

/**
 * Normalizes any legacy string from the database payload into the new Canonical model.
 * This guarantees frontend tabs and filters work regardless of the physical DB state.
 */
export const normalizeStatus = (legacyStatus) => {
    if (!legacyStatus) return legacyStatus;

    const statusStr = String(legacyStatus);

    const map = {
        "Pending": "REPORTED",
        "Open": "REPORTED",
        "Assigned": "ASSIGNED",
        "Scheduled": "ASSIGNED",
        "In Progress": "IN_PROGRESS",
        "InProgress": "IN_PROGRESS",
        "In-Progress": "IN_PROGRESS",
        "Resolved - Pending Officer Review": "VERIFICATION_PENDING",
        "Resolved": "RESOLVED",
        "Rejected": "REJECTED",
        "Withdrawn": "REJECTED"
    };

    // Direct match
    if (map[statusStr]) return map[statusStr];

    // Canonical passthrough
    const canonicals = ["REPORTED", "ASSIGNED", "IN_PROGRESS", "VERIFICATION_PENDING", "RESOLVED", "REJECTED"];
    if (canonicals.includes(statusStr.toUpperCase())) return statusStr.toUpperCase();

    // Case-insensitive fallback
    const found = Object.keys(map).find(key => key.toLowerCase() === statusStr.toLowerCase());
    return found ? map[found] : statusStr;
};

/**
 * HELPER: Is the task in a 'Pending' or 'Assigned' state?
 */
export const isStatusPending = (status) => {
    const norm = normalizeStatus(status);
    return norm === "REPORTED" || norm === "ASSIGNED";
};

/**
 * HELPER: Is the task currently being executed?
 */
export const isStatusInProgress = (status) => {
    const norm = normalizeStatus(status);
    return norm === "IN_PROGRESS";
};

/**
 * HELPER: Is the task completed (either fully or pending review)?
 */
export const isStatusResolved = (status) => {
    const norm = normalizeStatus(status);
    return norm === "RESOLVED" || norm === "VERIFICATION_PENDING";
};
