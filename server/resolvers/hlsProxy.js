// Proxy de HLS con CORS universal y descifrado de padding/PNG para navegadores
import { UA } from './common.js';
import { rewritePlaylist } from './hlsRewrite.js';

export async function proxyHls(req, res, targetUrl, referer = '') {
  if (!targetUrl || !/^https?:/.test(targetUrl)) {
    res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' }).end('URL inválida');
    return;
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    const headers = { 'User-Agent': UA };
    if (referer) headers.Referer = referer;
    if (req.headers.range) headers.Range = req.headers.range;

    const up = await fetch(targetUrl, { headers, redirect: 'follow', signal: ac.signal });
    if (!up.ok && up.status !== 206) {
      res.writeHead(up.status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
        .end(`Error upstream: ${up.status}`);
      return;
    }

    const buf = Buffer.from(await up.arrayBuffer());
    const headAscii = buf.subarray(0, 160).toString('utf8').trimStart();
    const isPlaylist = headAscii.startsWith('#EXTM3U') || headAscii.includes('#EXTINF');

    if (isPlaylist) {
      const rewritten = rewritePlaylist(buf.toString('utf8'), targetUrl, referer);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(rewritten);
      return;
    }

    // Segmento binario de video (.ts / .m4s)
    const outHeaders = {
      'Content-Type': 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    };

    const cr = up.headers.get('content-range');
    if (cr) outHeaders['Content-Range'] = cr;

    let payload = buf;
    if (buf.length > 70 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      const iendIdx = buf.indexOf(Buffer.from('IEND'));
      if (iendIdx !== -1) payload = buf.subarray(iendIdx + 8);
    }

    outHeaders['Content-Length'] = payload.length;
    res.writeHead(up.status === 206 ? 206 : 200, outHeaders);
    res.end(payload);
  } catch (err) {
    if (ac.signal.aborted) return;
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    }
    res.end(err.message || 'Error proxying HLS');
  }
}
