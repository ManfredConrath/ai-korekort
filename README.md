# AI-kørekort for undervisere

Et selvstudiesite til undervisere i Aabenraa Kommune om brug af kunstig intelligens i
undervisningen. Baseret på PUC Aabenraas kursusmateriale "Undervisere grundkursus" /
"Undervisere kørekort".

## Sådan er det bygget
- Rent HTML/CSS/JS – ingen build-trin, ingen server nødvendig.
- Fremdrift (gennemførte kapitler + reflektionsnoter) gemmes i besøgendes egen browser
  (`localStorage`) – ingen backend eller database.
- Kapitler låses op i rækkefølge; certifikatet genereres som PNG direkte i browseren via
  `<canvas>`, når alle 7 kapitler er markeret som gennemført.

## Struktur
```
index.html            Forside med kapiteloversigt og fremdrift
certifikat.html        Certifikat-generator (navn + skole)
kapitler/kapitel1-7.html  De 7 kapitler
css/style.css           Designsystem
js/progress.js          Fremdrift/lås-logik (localStorage)
js/certificate.js       Certifikat-tegning (canvas)
assets/puc-logo.jpg      PUC Aabenraa-logo
```

## Kør lokalt
```
python3 -m http.server 8000
```
Åbn derefter `http://localhost:8000/`.

## Hosting
Sitet er lavet til GitHub Pages (branch: `main`, mappe: `/root`).
