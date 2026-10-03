import { useRef } from "react";
import { Platform, PermissionsAndroid, Share, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import html from "./src/caisseHtml";
import { ticketBytes, toBase64 } from "./src/escpos";

async function askBluetooth() {
  if (Platform.OS !== "android") return true;
  if (Platform.Version >= 31) {
    const r = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ]);
    if (r[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }
  if (!(await RNBluetoothClassic.isBluetoothEnabled())) {
    try { await RNBluetoothClassic.requestBluetoothEnabled(); } catch { return false; }
  }
  return true;
}

async function print(address, ticket) {
  let device = null;
  const connected = await RNBluetoothClassic.getConnectedDevices();
  device = connected.find(d => d.address === address) || null;
  if (!device) device = await RNBluetoothClassic.connectToDevice(address, { delimiter: "", charset: "ascii" });
  await RNBluetoothClassic.writeToDevice(address, toBase64(ticketBytes(ticket)), "base64");
}

export default function App() {
  const web = useRef(null);
  const reply = msg => web.current?.injectJavaScript(`window.__fromNative && window.__fromNative(${JSON.stringify(msg)}); true;`);

  async function onMessage(e) {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    try {
      if (msg.type === "share") {
        await Share.share({ message: msg.text, title: msg.filename });
      } else if (msg.type === "listPrinters") {
        if (!(await askBluetooth())) return reply({ type: "error", message: "Autorisez le Bluetooth pour imprimer." });
        const devices = await RNBluetoothClassic.getBondedDevices();
        reply({ type: "printers", devices: devices.map(d => ({ name: d.name, address: d.address })) });
      } else if (msg.type === "print") {
        if (!(await askBluetooth())) return reply({ type: "error", message: "Autorisez le Bluetooth pour imprimer." });
        await print(msg.address, msg.ticket);
        reply({ type: "printed" });
      }
    } catch (err) {
      reply({ type: "error", message: "Impression impossible. Vérifiez que l'imprimante est allumée et proche du téléphone." });
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WebView
        ref={web}
        source={{ html, baseUrl: "https://caisse-du-bar.app/" }}
        originWhitelist={["*"]}
        domStorageEnabled
        javaScriptEnabled
        onMessage={onMessage}
        setSupportMultipleWindows={false}
        style={styles.root}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#f6f3ee" } });
