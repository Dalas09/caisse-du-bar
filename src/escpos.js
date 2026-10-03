// Mise en page d'un ticket pour imprimante thermique 58 mm (32 caractères), commandes ESC/POS.
const WIDTH = 32;

// Table de caractères PC850 (sélectionnée par ESC t 2) pour les accents français.
const CP850 = {
  "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "ä": 0x84, "à": 0x85, "ç": 0x87, "ê": 0x88, "ë": 0x89,
  "è": 0x8a, "ï": 0x8b, "î": 0x8c, "Ä": 0x8e, "É": 0x90, "ô": 0x93, "ö": 0x94, "û": 0x96, "ù": 0x97,
  "Ö": 0x99, "Ü": 0x9a, "À": 0xb7, "Â": 0xb6, "È": 0xd4, "Ê": 0xd2, "Î": 0xd7, "Ô": 0xe2, "Û": 0xea,
  "°": 0xf8, "×": 0x78, "–": 0x2d, "—": 0x2d, "’": 0x27, "€": null,
};

function encode(text) {
  const out = [];
  for (const ch of text.replace(/€/g, "EUR").replace(/[  ]/g, " ")) {
    const c = ch.charCodeAt(0);
    if (c < 0x80) out.push(c);
    else if (CP850[ch] != null) out.push(CP850[ch]);
    else out.push(0x3f);
  }
  return out;
}

const ESC = 0x1b, GS = 0x1d, LF = 0x0a;
const cmd = {
  init: [ESC, 0x40, ESC, 0x74, 0x02],
  left: [ESC, 0x61, 0], center: [ESC, 0x61, 1],
  boldOn: [ESC, 0x45, 1], boldOff: [ESC, 0x45, 0],
  big: [GS, 0x21, 0x11], tall: [GS, 0x21, 0x01], normal: [GS, 0x21, 0x00],
  feed: n => [ESC, 0x64, n], cut: [GS, 0x56, 0x01],
};

function wrap(text, width) {
  const words = String(text).split(" "); const lines = []; let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= width) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.flatMap(l => l.length <= width ? [l] : l.match(new RegExp(`.{1,${width}}`, "g")));
}
function cols(left, right, width = WIDTH) {
  const r = String(right); const lw = width - r.length - 1;
  const ls = wrap(left, lw);
  return ls.map((l, i) => i === ls.length - 1 ? l.padEnd(lw) + " " + r : l);
}

export function ticketBytes(t) {
  const b = [];
  const add = (...parts) => parts.forEach(p => Array.isArray(p) ? b.push(...p) : b.push(...encode(p)));
  const line = s => add(s, [LF]);
  const sep = "-".repeat(WIDTH);

  add(cmd.init, cmd.center, cmd.boldOn, cmd.tall);
  wrap(String(t.bar).toUpperCase(), WIDTH).forEach(line);
  add(cmd.normal, cmd.boldOff);
  line(`Ticket N° ${t.no}`);
  line(`${t.date}  ${t.time}`);
  if (t.table) line(t.table);
  if (t.client) line(`Client : ${t.client}`);
  add(cmd.left); line(sep);
  t.items.forEach(it => cols(`${it.qty} x ${it.name}`, it.amount).forEach(line));
  line(sep);
  if (t.discount) { cols("Sous-total", t.subtotal).forEach(line); cols("Réduction", t.discount).forEach(line); }
  add(cmd.boldOn, cmd.tall);
  cols("TOTAL", t.total).forEach(line);
  add(cmd.normal, cmd.boldOff);
  cols("soit", t.totalEur).forEach(line);
  cols(`Payé (${t.pay})`, t.received).forEach(line);
  if (t.change) cols("Rendu", t.change).forEach(line);
  if (t.cancelled) { add(cmd.center, cmd.boldOn); line("*** TICKET ANNULÉ ***"); add(cmd.boldOff); }
  add(cmd.center); line(sep);
  wrap(t.footer, WIDTH).forEach(line);
  add(cmd.feed(4), cmd.cut);
  return b;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return s;
}
