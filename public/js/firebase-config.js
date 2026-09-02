/**
 * FIREBASE CONFIGURATION
 * ------------------------------------------------------------
 * WHAT THIS FILE DOES:
 * Connects the app to your Firebase project (database + file storage).
 *
 * WHAT YOU MUST DO BEFORE THIS APP WILL WORK:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (any name, e.g. "safetylog").
 * 3. In the project, click the "</>" (web) icon to register a web app.
 * 4. Firebase will show you a config object that looks like the one
 *    below but with real values. COPY THAT and paste it in place of
 *    firebaseConfig below.
 * 5. In the Firebase Console, enable:
 *    - Firestore Database (Build > Firestore Database > Create database
 *      > Start in "production mode" — we supply our own rules file)
 *    - Storage (Build > Storage > Get started)
 * 6. Upload firestore.rules and storage.rules (from the project root)
 *    using the Firebase Console's Rules tab for each product, OR the
 *    Firebase CLI (`firebase deploy --only firestore:rules,storage`)
 *    if you set up the CLI later.
 *
 * SECURITY NOTE (please read):
 * Phase 1 has no login system yet, so firestore.rules and storage.rules
 * are currently set to allow anyone with the app URL to read AND write
 * data. That is fine for a closed pilot you control the link to, but it
 * is not safe for a public rollout. This is flagged again in
 * firestore.rules and storage.rules directly — don't skip reading those
 * before sharing the app link widely.
 * ------------------------------------------------------------
 */

const firebaseConfig = {
  apiKey: "AIzaSyDch92cXA6yqfa8DjkaVMX8ik150LXx4sQ",
  authDomain: "safetylog-9fc29.firebaseapp.com",
  projectId: "safetylog-9fc29",
  storageBucket: "safetylog-9fc29.firebasestorage.app",
  messagingSenderId: "636674248670",
  appId: "1:636674248670:web:778757152f72c61150d74f"
};


// Initialize Firebase (using the "compat" SDK — this lets us use plain
// <script> tags with no build tools, which matches the "no React unless
// needed" and "no dev environment" setup for this project).
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence for Firestore.
// WHAT THIS MEANS IN PLAIN LANGUAGE:
// Document titles, categories, version numbers, and "read/acknowledged"
// records will be cached on the phone. If a user is offline, they can
// still browse the list and mark things as read — those changes queue
// up and sync automatically once the phone reconnects.
//
// IMPORTANT LIMITATION — FLAGGING THIS CLEARLY:
// This offline queueing applies to Firestore DATA only. The actual
// FILE UPLOAD (the PDF/Word doc itself) requires a live internet
// connection at the moment of upload — Firebase Storage does not queue
// file uploads while offline the way Firestore queues data writes. If
// a user tries to upload a document with no signal, the upload will
// fail with a clear error (handled in documents.js) rather than silently
// queuing. This is a real constraint of the platform, not a bug — if
// true offline file upload becomes essential later, that requires
// custom queueing logic (e.g. storing the file in IndexedDB and
// retrying on reconnect), which is a meaningful chunk of extra
// engineering we have not built yet.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open at once without synchronizeTabs support — rare,
    // but if you see this in the console, only one browser tab will have
    // offline access at a time.
    console.warn("Offline persistence could not be enabled: multiple tabs open.");
  } else if (err.code === "unimplemented") {
    console.warn("This browser does not support offline persistence.");
  }
});
