# AI-kørekort for undervisere

Et selvstudiesite til undervisere i Aabenraa Kommune om brug af kunstig intelligens i
undervisningen. Baseret på PUC Aabenraas kursusmateriale "Undervisere grundkursus" /
"Undervisere kørekort".

## Sådan er det bygget
- Rent HTML/CSS/JS – ingen build-trin, ingen server nødvendig.
- Fremdrift (gennemførte kapitler + reflektionsnoter) gemmes altid i besøgendes egen browser
  (`localStorage`) – sitet virker fuldt ud uden login.
- Valgfrit login (brugernavn + kode) via Firebase Authentication + Cloud Firestore gør det
  muligt at fortsætte kørekortet på en anden enhed/browser – fremdriften synkroniseres til
  skyen og hentes/merges automatisk ved login. Er Firebase ikke tilgængeligt (fx blokeret
  netværk), falder sitet automatisk tilbage til ren lokal tilstand uden fejl.
- Kapitler låses op i rækkefølge; certifikatet genereres som PNG direkte i browseren via
  `<canvas>`, når alle 7 kapitler er markeret som gennemført.

## Struktur
```
index.html               Forside med kapiteloversigt og fremdrift
certifikat.html          Certifikat-generator (navn + skole)
kapitler/kapitel1-7.html  De 7 kapitler
css/style.css             Designsystem (inkl. login-modal)
js/progress.js            Fremdrift/lås-logik (localStorage)
js/firebase-config.js     Firebase-projektkonfiguration (offentlige nøgler)
js/auth.js                Login/opret bruger + sky-synkronisering (Firebase)
js/certificate.js         Certifikat-tegning (canvas)
assets/puc-logo.jpg       PUC Aabenraa-logo
```

## Login / brugerkonti
Backend: Firebase-projekt `ai-korekort` (gratis Spark-plan), Authentication
(Email/Password-provider, brugernavn omsættes internt til `brugernavn@ai-korekort.local`) +
Cloud Firestore (`progress/{uid}`, låst med security rules så hver bruger kun kan læse/skrive
sit eget dokument).

## Kør lokalt
```
python3 -m http.server 8000
```
Åbn derefter `http://localhost:8000/`.

## Hosting
Sitet er lavet til GitHub Pages (branch: `main`, mappe: `/root`).
