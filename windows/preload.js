// Même passerelle que l'application Android : la page envoie ses demandes (imprimantes, impression, partage) au programme.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ReactNativeWebView", {
  platform: "windows",
  postMessage: data => ipcRenderer.send("from-page", data),
});
ipcRenderer.on("to-page", (_e, msg) => window.postMessage({ __fromNative: msg }, "*"));
