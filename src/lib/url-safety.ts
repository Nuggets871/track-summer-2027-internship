// Guard for every URL the application fetches on the user's behalf (the
// "paste a link" workflow). Node's fetch follows redirects and will happily
// reach loopback, RFC1918, link-local and cloud-metadata addresses, which is
// a server-side request forgery vector once the app is reachable by anyone
// other than its owner (see the Docker/Traefik deployment in README).
//
// `assertPublicHttpUrl` rejects anything that is not plain http(s) or that
// resolves to a private address. It is deliberately synchronous-cheap for
// literal IPs and only does a DNS lookup for hostnames.

import { lookup } from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "metadata",
  "metadata.google.internal",
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fe80")) return true; // link-local
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  return false;
}

/**
 * Returns the parsed URL when it is safe to fetch, and throws otherwise.
 * Callers treat a throw the same as any other fetch failure (fail closed).
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL invalide.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Seules les URLs http(s) sont autorisées.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("Cette adresse n'est pas autorisée.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error("Cette adresse réseau privée n'est pas autorisée.");
    return url;
  }

  const { address } = await lookup(hostname);
  if (isPrivateIp(address)) {
    throw new Error("Cette adresse réseau privée n'est pas autorisée.");
  }
  return url;
}
