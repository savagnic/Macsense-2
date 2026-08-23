export class FlowRecorder {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.startedAt = 0;
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable in this browser');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => globalThis.MediaRecorder?.isTypeSupported?.(type));
    this.recorder = new MediaRecorder(this.stream, preferred ? { mimeType: preferred } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = event => { if (event.data?.size) this.chunks.push(event.data); };
    this.startedAt = performance.now();
    await new Promise((resolve, reject) => {
      this.recorder.onstart = resolve;
      this.recorder.onerror = event => reject(event.error || new Error('Recording failed'));
      this.recorder.start(250);
    });
    return { startedAt: this.startedAt };
  }

  async stop() {
    if (!this.recorder || this.recorder.state === 'inactive') throw new Error('No recording is active');
    const durationMs = performance.now() - this.startedAt;
    const recorder = this.recorder;
    const blob = await new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }));
      recorder.onerror = event => reject(event.error || new Error('Recording failed'));
      recorder.stop();
    });
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null; this.recorder = null; this.chunks = [];
    return { blob, durationMs };
  }

  cancel() {
    try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch {}
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null; this.recorder = null; this.chunks = [];
  }
}
