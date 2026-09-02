/**
 * DOCUMENT REGISTER MODULE
 * ------------------------------------------------------------
 * WHAT THIS FEATURE DOES:
 * 1. Upload a document (SOP, policy, etc.) with a title + category.
 * 2. List all documents, most recently updated first.
 * 3. If you upload a NEW file under a title+category that already
 *    exists, it becomes a new VERSION of that same document (old
 *    versions are kept, not deleted — this matters for audit trail).
 * 4. Staff can mark a document "read & acknowledged," tied to the
 *    specific version they acknowledged.
 *
 * DATA MODEL (Firestore) — for your reference / future debugging:
 *
 * documents/{docId}
 *    title, category, createdAt, updatedAt,
 *    currentVersion (number), currentFileName, currentFileUrl,
 *    currentFilePath, currentFileSize, currentUploadedBy, currentUploadedAt
 *
 * documents/{docId}/versions/{versionId}
 *    versionNumber, fileName, fileUrl, filePath, fileSize,
 *    uploadedBy, uploadedAt
 *
 * documents/{docId}/acknowledgments/{ackId}
 *    staffName, versionNumberAcknowledged, timestamp
 *    (ackId is a sanitized "name_v#" so re-clicking "I've read this"
 *    doesn't create duplicate records — see utils.js makeAckId)
 *
 * WHY THREE LEVELS INSTEAD OF ONE: keeping versions and acknowledgments
 * as their own subcollections means old acknowledgments stay correctly
 * tied to the version they were made against. If someone acknowledged
 * v1 and you upload v2, the app can tell you that acknowledgment is now
 * stale and needs to be redone — which is exactly what an HSE document
 * control process needs (ISO 45001 Clause 7.5.3).
 * ------------------------------------------------------------
 */

const documentsCollection = db.collection("documents");

let unsubscribeDocumentsListener = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  populateStaffDropdown(document.getElementById("uploadedBy"));
  wireUploadForm();
  startDocumentsListener();
});

/* ============================================================
   UPLOAD FLOW
   ============================================================ */

function wireUploadForm() {
  const form = document.getElementById("uploadForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("docTitle").value.trim();
    const category = document.getElementById("docCategory").value;
    const uploadedBy = document.getElementById("uploadedBy").value;
    const fileInput = document.getElementById("docFile");
    const file = fileInput.files[0];

    if (!title || !category || !uploadedBy || !file) {
      showToast("Please fill in every field and choose a file.", "error");
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.errors.join(" "), "error");
      return;
    }

    if (!navigator.onLine) {
      showToast(
        "You're offline. File uploads need an internet connection — please try again once you have signal.",
        "error"
      );
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking for existing document…";

    try {
      const existingDoc = await findExistingDocument(title, category);

      if (existingDoc) {
        const nextVersion = existingDoc.data().currentVersion + 1;
        const confirmed = confirm(
          `"${title}" (${category}) already exists at version ${existingDoc.data().currentVersion}.\n\n` +
          `Uploading this file will create version ${nextVersion} and become the current version. ` +
          `The previous version stays available in Version History.\n\nContinue?`
        );
        if (!confirmed) {
          resetUploadButton(submitBtn);
          return;
        }
        await uploadNewVersion(existingDoc.id, nextVersion, file, uploadedBy);
        showToast(`Uploaded version ${nextVersion} of "${title}".`, "success");
      } else {
        submitBtn.textContent = "Uploading…";
        await uploadFirstVersion(title, category, file, uploadedBy);
        showToast(`"${title}" uploaded as version 1.`, "success");
      }

      form.reset();
    } catch (err) {
      console.error("Upload failed:", err);
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      resetUploadButton(submitBtn);
    }
  });
}

function resetUploadButton(btn) {
  btn.disabled = false;
  btn.textContent = "Upload Document";
}

/** Looks for an existing document with the same title AND category. */
async function findExistingDocument(title, category) {
  const snapshot = await documentsCollection
    .where("title", "==", title)
    .where("category", "==", category)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

/** Creates a brand-new document record (version 1). */
async function uploadFirstVersion(title, category, file, uploadedBy) {
  const docRef = await documentsCollection.add({
    title,
    category,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    currentVersion: 1,
    currentFileName: file.name,
    currentFileUrl: null,
    currentFilePath: null,
    currentFileSize: file.size,
    currentUploadedBy: uploadedBy,
    currentUploadedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const { url, path } = await uploadFileToStorage(docRef.id, 1, file);

  await docRef.update({ currentFileUrl: url, currentFilePath: path });

  await docRef.collection("versions").add({
    versionNumber: 1,
    fileName: file.name,
    fileUrl: url,
    filePath: path,
    fileSize: file.size,
    uploadedBy,
    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/** Adds a new version to an existing document and updates the "current" pointer. */
async function uploadNewVersion(docId, versionNumber, file, uploadedBy) {
  const docRef = documentsCollection.doc(docId);
  const { url, path } = await uploadFileToStorage(docId, versionNumber, file);

  await docRef.collection("versions").add({
    versionNumber,
    fileName: file.name,
    fileUrl: url,
    filePath: path,
    fileSize: file.size,
    uploadedBy,
    uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await docRef.update({
    currentVersion: versionNumber,
    currentFileName: file.name,
    currentFileUrl: url,
    currentFilePath: path,
    currentFileSize: file.size,
    currentUploadedBy: uploadedBy,
    currentUploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/** Uploads the actual file bytes to Firebase Storage and returns its URL + path. */
async function uploadFileToStorage(docId, versionNumber, file) {
  const path = `documents/${docId}/v${versionNumber}_${file.name}`;
  const ref = storage.ref(path);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  return { url, path };
}

/* ============================================================
   LISTING DOCUMENTS
   ============================================================ */

function startDocumentsListener() {
  if (unsubscribeDocumentsListener) unsubscribeDocumentsListener();

  const listEl = document.getElementById("documentList");

  unsubscribeDocumentsListener = documentsCollection
    .orderBy("updatedAt", "desc")
    .onSnapshot(
      (snapshot) => {
        if (snapshot.empty) {
          listEl.innerHTML = '<p class="empty-state">No documents uploaded yet.</p>';
          return;
        }
        listEl.innerHTML = "";
        snapshot.forEach((doc) => {
          listEl.appendChild(renderDocumentCard(doc.id, doc.data()));
        });
      },
      (err) => {
        console.error("Failed to load documents:", err);
        listEl.innerHTML = '<p class="empty-state error">Could not load documents. Check your connection.</p>';
      }
    );
}

function renderDocumentCard(docId, data) {
  const card = document.createElement("div");
  card.className = "doc-card";
  card.innerHTML = `
    <div class="doc-card__header">
      <h3>${escapeHtml(data.title)}</h3>
      <span class="doc-card__badge">${escapeHtml(data.category)}</span>
    </div>
    <p class="doc-card__meta">
      Version ${data.currentVersion} · ${formatFileSize(data.currentFileSize)}<br>
      Uploaded by ${escapeHtml(data.currentUploadedBy)} on ${formatDateTime(data.currentUploadedAt)}
    </p>
    <div class="doc-card__actions">
      <a href="${data.currentFileUrl || "#"}" target="_blank" rel="noopener"
         class="btn btn--small ${data.currentFileUrl ? "" : "btn--disabled"}">Download</a>
      <button class="btn btn--small btn--secondary" data-action="history">Version History</button>
      <button class="btn btn--small btn--secondary" data-action="acknowledge">Read &amp; Acknowledge</button>
    </div>
    <div class="doc-card__expand" data-panel="history" hidden></div>
    <div class="doc-card__expand" data-panel="acknowledge" hidden></div>
  `;

  card.querySelector('[data-action="history"]').addEventListener("click", () =>
    toggleHistoryPanel(card, docId)
  );
  card.querySelector('[data-action="acknowledge"]').addEventListener("click", () =>
    toggleAcknowledgePanel(card, docId, data.currentVersion)
  );

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ============================================================
   VERSION HISTORY PANEL
   ============================================================ */

async function toggleHistoryPanel(card, docId) {
  const panel = card.querySelector('[data-panel="history"]');
  const ackPanel = card.querySelector('[data-panel="acknowledge"]');
  ackPanel.hidden = true;

  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  panel.innerHTML = '<p class="loading">Loading version history…</p>';

  try {
    const snapshot = await documentsCollection
      .doc(docId)
      .collection("versions")
      .orderBy("versionNumber", "desc")
      .get();

    if (snapshot.empty) {
      panel.innerHTML = '<p class="empty-state">No version history found.</p>';
      return;
    }

    const rows = snapshot.docs
      .map((doc) => {
        const v = doc.data();
        return `
          <tr>
            <td>v${v.versionNumber}</td>
            <td>${escapeHtml(v.fileName)}</td>
            <td>${escapeHtml(v.uploadedBy)}</td>
            <td>${formatDateTime(v.uploadedAt)}</td>
            <td><a href="${v.fileUrl}" target="_blank" rel="noopener">Download</a></td>
          </tr>
        `;
      })
      .join("");

    panel.innerHTML = `
      <table class="history-table">
        <thead>
          <tr><th>Ver.</th><th>File</th><th>By</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    console.error("Failed to load version history:", err);
    panel.innerHTML = '<p class="empty-state error">Could not load version history.</p>';
  }
}

/* ============================================================
   READ & ACKNOWLEDGE PANEL
   ============================================================ */

async function toggleAcknowledgePanel(card, docId, currentVersion) {
  const panel = card.querySelector('[data-panel="acknowledge"]');
  const historyPanel = card.querySelector('[data-panel="history"]');
  historyPanel.hidden = true;

  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  panel.innerHTML = '<p class="loading">Loading acknowledgment status…</p>';

  try {
    const snapshot = await documentsCollection
      .doc(docId)
      .collection("acknowledgments")
      .where("versionNumberAcknowledged", "==", currentVersion)
      .get();

    const acknowledgedNames = new Set(snapshot.docs.map((d) => d.data().staffName));

    const staffRows = STAFF_LIST.filter((n) => !n.startsWith("--"))
      .map((name) => {
        const acked = acknowledgedNames.has(name);
        return `<li class="ack-row ${acked ? "ack-row--done" : ""}">
          <span>${acked ? "✅" : "⬜"} ${escapeHtml(name)}</span>
        </li>`;
      })
      .join("");

    panel.innerHTML = `
      <p class="ack-summary">${acknowledgedNames.size} of ${STAFF_LIST.length - 1} staff have acknowledged version ${currentVersion}.</p>
      <ul class="ack-list">${staffRows}</ul>
      <div class="ack-action">
        <select class="ack-select"></select>
        <button class="btn btn--small">I've Read This</button>
      </div>
    `;

    const select = panel.querySelector(".ack-select");
    populateStaffDropdown(select);

    panel.querySelector(".ack-action button").addEventListener("click", async () => {
      const staffName = select.value;
      if (!staffName) {
        showToast("Select your name first.", "error");
        return;
      }
      try {
        const ackId = makeAckId(staffName, currentVersion);
        await documentsCollection
          .doc(docId)
          .collection("acknowledgments")
          .doc(ackId)
          .set({
            staffName,
            versionNumberAcknowledged: currentVersion,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        showToast(`Thanks, ${staffName} — marked as read.`, "success");
        toggleAcknowledgePanel(card, docId, currentVersion); // close
        toggleAcknowledgePanel(card, docId, currentVersion); // reopen refreshed
      } catch (err) {
        console.error("Failed to save acknowledgment:", err);
        showToast("Could not save — check your connection and try again.", "error");
      }
    });
  } catch (err) {
    console.error("Failed to load acknowledgments:", err);
    panel.innerHTML = '<p class="empty-state error">Could not load acknowledgment status.</p>';
  }
}
