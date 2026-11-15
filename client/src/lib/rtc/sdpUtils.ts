// Ajuste y optimización de SDP (Opus FEC/DTX)
export function mungeOpusSdp(sdp: string, maxAvgBitrate: number): string {
  const match = sdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!match) return sdp;
  const pt = match[1];
  const br = Math.max(24000, Math.min(128000, maxAvgBitrate || 48000));
  const extraParams = `stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=0;cbr=0;ptime=20;maxplaybackrate=48000;maxaveragebitrate=${br}`;
  const fmtpRegex = new RegExp(`(a=fmtp:${pt}\\s+[^\\r\\n]+)`);

  if (fmtpRegex.test(sdp)) {
    return sdp.replace(fmtpRegex, (m) => {
      const cleaned = m.replace(
        /;?(stereo|sprop-stereo|useinbandfec|usedtx|cbr|ptime|maxplaybackrate|maxaveragebitrate)=\d+/gi,
        ''
      );
      return `${cleaned};${extraParams}`;
    });
  }

  return sdp.replace(
    new RegExp(`(a=rtpmap:${pt}\\s+opus\/48000[^\\r\\n]*)`),
    `$1\r\na=fmtp:${pt} minptime=10;${extraParams}`
  );
}
