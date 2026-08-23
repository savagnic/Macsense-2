export function audioBufferToWav(buffer, { float32 = false } = {}) {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = float32 ? 4 : 2;
  const format = float32 ? 3 : 1;
  const blockAlign = channels * bytesPerSample;
  const dataBytes = frames * blockAlign;
  const out = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(out);
  const writeAscii = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeAscii(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true);
  view.setUint16(22, channels, true); view.setUint32(24, rate, true); view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(36, 'data'); view.setUint32(40, dataBytes, true);
  const planes = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let p = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const x = Math.max(-1, Math.min(1, planes[c][i]));
      if (float32) { view.setFloat32(p, x, true); p += 4; }
      else { view.setInt16(p, x < 0 ? x * 0x8000 : x * 0x7fff, true); p += 2; }
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
