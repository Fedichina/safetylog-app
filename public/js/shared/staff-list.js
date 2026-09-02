/**
 * STAFF LIST (temporary, no-login placeholder)
 * ------------------------------------------------------------
 * Phase 1 has no authentication yet, so instead of a real login we use
 * this hardcoded list of names in a dropdown. Anyone using the app picks
 * their own name before uploading a document or acknowledging one.
 *
 * EDIT THIS LIST to match your actual colleagues before you test with
 * them. Keep names consistent (e.g. always "Yahuza Lawan", not sometimes
 * "Yahuza" and sometimes "Mr. Lawan") — the app treats each exact string
 * as a distinct person when tracking who has acknowledged a document.
 *
 * FLAGGING FOR LATER: because this is just a dropdown with no password,
 * anyone can select anyone else's name. That's a real limitation for
 * audit-trail integrity (a core HSE requirement — ISO 45001 Clause 7.5
 * expects controlled, attributable records). It's acceptable for a first
 * internal pilot but should be replaced with real authentication
 * (Firebase Auth, e.g. email/password or a simple PIN per person) before
 * this is used as an actual compliance record. This should be
 * a Phase 2/3 discussion, not something to overlook.
 * ------------------------------------------------------------
 */

const STAFF_LIST = [
  "Dr. Johnson Addah",
  "Mr. Yahuza Lawan",
  "Engr. Milton",
  "Mr. Victor Ohiosimuan",
  "Mr. Stephen",
  "Mr. Hussein",
  "Mr. Alamoh",
  "Mrs. Tolulope Sholarin",
  "Mr. Idris Jeremiah",
  "-- Add your staff names in staff-list.js --"
];

/**
 * Fills a <select> element with the staff list as <option> elements.
 * @param {HTMLSelectElement} selectEl
 */
function populateStaffDropdown(selectEl) {
  selectEl.innerHTML = '<option value="" disabled selected>Select your name…</option>';
  STAFF_LIST.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    selectEl.appendChild(opt);
  });
}
