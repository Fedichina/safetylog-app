/**
 * SHARED UTILITY FUNCTIONS
 * ------------------------------------------------------------
 * Small helper functions used by more than one feature module, so we
 * write them once here instead of copy-pasting into documents.js,
 * toolbox-talks.js, and future modules.
 * ------------------------------------------------------------
 */

/** Formats a Firestore Timestamp (or JS Date) as "12 Aug 2026, 3:45 PM" */
function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Formats bytes as a human-readable size, e.g. "2.3 MB" */
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Turns a name + version number into a safe Firestore document ID.
 * Firestore IDs can't contain slashes and shouldn't rely on spaces
 * being handled consistently, so we sanitize.
 * e.g. "Mr. Yahuza Lawan", 2  ->  "mr-yahuza-lawan_v2"
 */
function makeAckId(staffName, versionNumber) {
  const safeName = staffName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${safeName}_v${versionNumber}`;
}

/**
 * Shows a brief on-screen message (success or error) at the bottom of
 * the screen. Used instead of alert() so it doesn't block the UI on a
 * small phone screen.
 */
function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast--${type} toast--visible`;
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3500);
}

/** Basic client-side file validation before we attempt an upload. */
function validateFile(file) {
  const MAX_SIZE_MB = 15;
  const ALLOWED_EXTENSIONS = [
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"
  ];

  const errors = [];
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) {
    errors.push(`File is ${sizeMB.toFixed(1)} MB — max allowed is ${MAX_SIZE_MB} MB.`);
  }

  const ext = file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`File type ".${ext}" isn't allowed. Use: ${ALLOWED_EXTENSIONS.join(", ")}.`);
  }

  return { valid: errors.length === 0, errors };
}
