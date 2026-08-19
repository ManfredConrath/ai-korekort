/* ============================================================
   AI-kørekort: Firebase-konfiguration
   Projekt: ai-korekort (Firebase Spark/gratis plan)
   Disse værdier er offentlige projekt-identifikatorer, ikke
   hemmeligheder, adgangen styres af Firestore Security Rules,
   ikke af at skjule denne fil. Se js/auth.js.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAF-r-Sz4DO3n-RyAQq2ZDFTI8EesCZC-k",
  authDomain: "ai-korekort.firebaseapp.com",
  projectId: "ai-korekort",
  storageBucket: "ai-korekort.firebasestorage.app",
  messagingSenderId: "357179136807",
  appId: "1:357179136807:web:1b6ed280ffed803a53a702",
};

// Hvis Firebase-CDN-scripts blev blokeret eller ikke kunne hentes (fx pga.
// offline eller netværksrestriktioner), skal resten af sitet stadig virke,
// auth.js opdager selv at "firebase" mangler og falder tilbage til
// lokal-kun-tilstand. Se auth.js.
if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
}
