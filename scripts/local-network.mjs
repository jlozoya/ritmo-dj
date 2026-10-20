import { networkInterfaces } from 'node:os';

// Prefer Wi-Fi/Ethernet over host-only adapters used by containers and VMs.
const virtualAdapter =
  /vethernet|virtual|vmware|vbox|docker|wsl|tailscale|tun\d|tap\d|utun\d/i;

export function getLocalNetworkHosts(interfaces = networkInterfaces()) {
  const adapters = Object.entries(interfaces).sort(
    ([left], [right]) =>
      Number(virtualAdapter.test(left)) - Number(virtualAdapter.test(right)),
  );
  return [
    ...new Set(
      adapters.flatMap(([, addresses]) =>
        (addresses ?? [])
          .filter((address) => address.family === 'IPv4' && !address.internal)
          .map((address) => address.address),
      ),
    ),
  ];
}
