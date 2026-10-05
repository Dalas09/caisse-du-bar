// Regénère src/caisseHtml.js à partir de web/caisse-bar.html (la même page que l'artifact claude.ai).
const fs = require("fs");
let body = fs.readFileSync(__dirname + "/web/caisse-bar.html", "utf8");
// Code administrateur de départ : seule son empreinte est injectée, depuis le secret GitHub ADMIN_PIN_HASH.
if (process.env.ADMIN_PIN_HASH) body = body.replace('const DEFAULT_ADMIN_PIN = ""', `const DEFAULT_ADMIN_PIN = "${process.env.ADMIN_PIN_HASH.replace(/[^0-9a-f]/g, "")}"`);
// Synchronisation entre téléphones : adresse et clé publique Supabase (variables GitHub SYNC_URL et SYNC_ANON).
if (process.env.SYNC_URL && process.env.SYNC_ANON) body = body.replace('const SYNC_URL = "", SYNC_ANON = ""', `const SYNC_URL = ${JSON.stringify(process.env.SYNC_URL.replace(/\/+$/, ""))}, SYNC_ANON = ${JSON.stringify(process.env.SYNC_ANON)}`);
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">` +
  `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;
fs.writeFileSync(__dirname + "/src/caisseHtml.js", "// Fichier généré par build-html.js — ne pas modifier à la main.\nexport default " + JSON.stringify(html) + ";\n");
console.log("src/caisseHtml.js écrit (" + html.length + " caractères)");
// Même page pour le programme Windows (dossier windows/, construit avec Electron).
fs.writeFileSync(__dirname + "/windows/caisse.html", html.replace(",user-scalable=no", ""));
console.log("windows/caisse.html écrit");
