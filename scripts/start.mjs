// Starts Metro on whichever network this laptop is actually on.
//
// Expo advertises one address in the QR code, and the phone has to be able to
// reach it. On a machine with a single network card that is never a question.
// This one has several -- Wi-Fi, a mobile hotspot, and the link-local adapters
// Windows leaves behind -- so Expo sometimes picks one the phone cannot see,
// and the app sits on "Downloading..." for ever with no error.
//
// The usual workaround is REACT_NATIVE_PACKAGER_HOSTNAME, set by hand with
// setx. That works until the laptop joins a different network, and then it is
// worse than nothing: a stale value points the phone at an address that no
// longer exists anywhere. That has now cost two debugging sessions.
//
// So the address is worked out fresh at every start instead of being
// remembered. Nothing to update, and nothing to go stale.
//
//   npm start            -- same network, fastest
//   npm start -- --tunnel  -- different networks, or Wi-Fi with client
//                             isolation (most school and cafe networks)
//
// Anything after `--` is passed through to expo, so --tunnel, --clear, --go
// and the rest all still work.

import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';

// Which address a phone could plausibly reach us on.
//
// 169.254.x.x is what Windows assigns to an adapter that asked for a DHCP
// lease and never got one -- a disconnected card, in other words. It is listed
// exactly like a working connection, which is the trap, so it is ruled out
// first.
function candidateAddresses() {
  const found = [];
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      if (address.address.startsWith('169.254.')) continue;
      found.push({ name, address: address.address });
    }
  }
  return found;
}

// A hotspot this laptop is sharing wins over a network it has merely joined.
// If the phone is on our hotspot it can only reach us there, and if it is not,
// Windows still lists the hotspot adapter and Expo may pick it over the Wi-Fi
// the phone is actually on.
//
// 192.168.137.x is the fixed range Windows Internet Connection Sharing uses,
// which makes a hotspot recognisable without having to ask the OS what kind of
// adapter each one is.
function pickAddress() {
  const candidates = candidateAddresses();
  if (candidates.length === 0) return null;

  const hotspot = candidates.find((c) => c.address.startsWith('192.168.137.'));
  if (hotspot) return hotspot;

  const wifi = candidates.find((c) => /wi-?fi|wlan/i.test(c.name));
  return wifi ?? candidates[0];
}

const passthrough = process.argv.slice(2);
const tunnelling = passthrough.includes('--tunnel');
const chosen = pickAddress();

// A tunnel goes out through the internet and comes back, so the LAN address is
// irrelevant -- setting it would only be misleading.
const env = { ...process.env };
if (tunnelling) {
  delete env.REACT_NATIVE_PACKAGER_HOSTNAME;
  console.log('Starting through a tunnel. Any network will work; the first load is slow.\n');
} else if (chosen) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = chosen.address;
  console.log(`Serving on ${chosen.address} (${chosen.name}).`);
  console.log('Your phone must be on this same network.');
  console.log('If it just sits on "Downloading", the network is probably blocking');
  console.log('phone-to-laptop traffic -- run: npm start -- --tunnel\n');
} else {
  delete env.REACT_NATIVE_PACKAGER_HOSTNAME;
  console.log('No network connection found. Letting Expo decide.\n');
}

// shell: true because on Windows `expo` is a .cmd shim, which spawn cannot
// execute directly. stdio inherited so Metro keeps its interactive keypresses
// -- r to reload, m for the menu.
const child = spawn('npx', ['expo', 'start', ...passthrough], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
