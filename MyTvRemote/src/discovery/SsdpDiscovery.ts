import dgram from 'dgram';

export interface SsdpSearchOptions {
  st?: string[]; // search targets
  timeoutMs?: number;
  attempts?: number;
}

export interface SsdpResponse {
  location?: string;
  server?: string;
  usn?: string;
  st?: string;
  address: string;
}

export async function ssdpSearch(options: SsdpSearchOptions = {}): Promise<SsdpResponse[]> {
  const { st = ['ssdp:all'], timeoutMs = 1000, attempts = 1 } = options;
  const addr = '239.255.255.250';
  const port = 1900;
  const responses: SsdpResponse[] = [];

  for (let i = 0; i < attempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    const batch = await new Promise<SsdpResponse[]>((resolve) => {
      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      const collected: SsdpResponse[] = [];
      const timer = setTimeout(() => {
        try { socket.close(); } catch {}
        resolve(collected);
      }, timeoutMs);

      socket.on('message', (msg, rinfo) => {
        const text = msg.toString();
        const headers = parseHeaders(text);
        collected.push({
          location: headers.location,
          server: headers.server,
          usn: headers.usn,
          st: headers.st,
          address: rinfo.address,
        });
      });

      socket.on('error', () => {
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve(collected);
      });

      socket.bind(() => {
        for (const target of st) {
          const req =
            `M-SEARCH * HTTP/1.1\r\n` +
            `HOST: ${addr}:${port}\r\n` +
            `MAN: "ssdp:discover"\r\n` +
            `MX: 1\r\n` +
            `ST: ${target}\r\n` +
            `\r\n`;
          socket.send(Buffer.from(req), port, addr);
        }
      });
    });
    for (const r of batch) responses.push(r);
  }

  // de-duplicate by LOCATION or address+ST
  const seen = new Set<string>();
  return responses.filter((r) => {
    const key = r.location ?? `${r.address}|${r.st}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = line.slice(idx + 1).trim();
      out[k] = v;
    }
  }
  return out;
}

