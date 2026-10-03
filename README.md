# Caisse du Bar (application Android)

Caisse, tables et additions séparées, stock, charges, chiffre d'affaires jour/semaine/mois en FCFA et en euros,
et impression des tickets sur une imprimante thermique Bluetooth 58 mm (ESC/POS).

- `web/caisse-bar.html` : l'écran de l'application (la même page que l'artifact claude.ai).
- `build-html.js` : copie cette page dans `src/caisseHtml.js` pour l'application.
- `App.js` : l'application Expo (WebView + Bluetooth). `src/escpos.js` met le ticket en forme pour l'imprimante.
- `.github/workflows/build-apk.yml` : construit `caisse-du-bar.apk` sur GitHub à chaque envoi sur `main`
  et le publie dans « Releases ».

Les données sont gardées sur le téléphone (elles ne sont pas partagées avec l'artifact en ligne).
L'impression Bluetooth « classique » fonctionne sur Android ; l'iPhone ne parle qu'aux imprimantes Bluetooth Low Energy (MFi).
