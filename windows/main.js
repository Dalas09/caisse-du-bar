// Caisse du Bar pour Windows : la même page que l'application Android, dans une fenêtre Electron.
// Les données restent sur l'ordinateur (stockage local) et se synchronisent avec les téléphones par le code de liaison.
// L'impression passe par n'importe quelle imprimante installée dans Windows (thermique 58 mm USB ou Bluetooth avec son pilote).
const { app, BrowserWindow, ipcMain, dialog, clipboard, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
app.setAppUserModelId("com.caissedubar.windows");
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 480, height: 860, minWidth: 360, minHeight: 600, title: "Caisse du Bar", backgroundColor: "#f4f0ea",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, "caisse.html"));
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

const reply = msg => win && win.webContents.send("to-page", msg);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Ticket au format 58 mm, mis en page en HTML puis envoyé au pilote Windows de l'imprimante.
function ticketHtml(t) {
  const row = (l, r, b) => `<div class="r${b ? " b" : ""}"><span>${esc(l)}</span><span>${esc(r)}</span></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:0} html,body{margin:0} body{width:48mm;padding:2mm 3mm 6mm;font:11px/1.35 Consolas,"Courier New",monospace;color:#000}
    .c{text-align:center} .h{font-size:15px;font-weight:700} .b{font-weight:700} .big{font-size:14px}
    .r{display:flex;justify-content:space-between;gap:6px} .r span:first-child{overflow-wrap:anywhere} .r span:last-child{white-space:nowrap}
    hr{border:0;border-top:1px dashed #000;margin:4px 0}
  </style></head><body>
    <div class="c h">${esc(t.bar)}</div>
    ${t.cancelled ? `<div class="c b">*** TICKET ANNULÉ ***</div>` : ""}
    <div class="c">Ticket N° ${esc(t.no)}</div>
    <div class="c">${esc(t.date)} à ${esc(t.time)}</div>
    ${t.table ? `<div class="c">${esc(t.table)}</div>` : ""}${t.client ? `<div class="c">Client : ${esc(t.client)}</div>` : ""}
    <hr>${(t.items || []).map(i => row(`${i.qty} x ${i.name}`, i.amount)).join("")}<hr>
    ${t.subtotal ? row("Sous-total", t.subtotal) + row("Réduction", t.discount) : ""}
    <div class="big">${row("TOTAL", t.total, true)}</div>${row("", t.totalEur)}
    ${row("Paiement", t.pay)}${t.change ? row("Reçu", t.received) + row("Rendu", t.change) : ""}
    <hr><div class="c">${esc(t.footer)}</div>
  </body></html>`;
}

async function printTicket(deviceName, ticket) {
  const pw = new BrowserWindow({ show: false, width: 220, height: 600, webPreferences: { javascript: false } });
  try {
    await pw.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(ticketHtml(ticket)));
    await new Promise((resolve, reject) => pw.webContents.print(
      { silent: true, deviceName, printBackground: false, margins: { marginType: "none" } },
      (ok, why) => ok ? resolve() : reject(new Error(why))));
  } finally { pw.destroy(); }
}

ipcMain.on("from-page", async (_e, data) => {
  let msg; try { msg = JSON.parse(data); } catch { return; }
  try {
    if (msg.type === "listPrinters") {
      const ps = await win.webContents.getPrintersAsync();
      reply({ type: "printers", devices: ps.map(p => ({ name: p.displayName || p.name, address: p.name })) });
    } else if (msg.type === "print") {
      await printTicket(msg.address, msg.ticket);
      reply({ type: "printed" });
    } else if (msg.type === "share") {
      if (msg.filename) {
        const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath("documents"), msg.filename) });
        if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, "﻿" + msg.text, "utf8"); reply({ type: "toast", message: "Fichier enregistré." }); }
      } else { clipboard.writeText(msg.text); reply({ type: "toast", message: "Ticket copié. Collez-le dans WhatsApp ou un e-mail." }); }
    }
  } catch (err) {
    reply({ type: "error", message: msg.type === "print" ? "Impression impossible. Vérifiez que l'imprimante est allumée et installée dans Windows." : "Opération impossible." });
  }
});
