/* ============================================================
   AI-kørekort: diskret besøgstæller (forsiden)
   Bruger den Firestore, der allerede er sat op til fremdrift/login.
   Tæller én gang pr. browser-session (sessionStorage), ikke pr.
   sideindlæsning. Fejler stille, hvis Firestore-reglerne endnu
   ikke tillader det, eller hvis Firebase ikke kunne indlæses,
   tælleren vises simpelthen ikke.
   ============================================================ */

(function () {
  if (typeof firebase === "undefined") return;

  var db = firebase.firestore();
  var ref = db.collection("stats").doc("visits");
  var SESSION_KEY = "aikorekort_visit_counted_v1";

  function showCount(n) {
    var el = document.getElementById("visit-counter");
    var numEl = document.getElementById("visit-count");
    if (!el || !numEl || typeof n !== "number") return;
    numEl.textContent = n.toLocaleString("da-DK");
    el.style.display = "block";
  }

  var alreadyCountedThisSession = sessionStorage.getItem(SESSION_KEY) === "1";

  if (alreadyCountedThisSession) {
    ref.get().then(function (snap) {
      if (snap.exists) showCount(snap.data().count || 0);
    }).catch(function () {});
    return;
  }

  ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true })
    .then(function () {
      sessionStorage.setItem(SESSION_KEY, "1");
      return ref.get();
    })
    .then(function (snap) {
      if (snap.exists) showCount(snap.data().count || 0);
    })
    .catch(function () {
      // Firestore-regler tillader endnu ikke skrivning, eller offline. Vis intet.
    });
})();
