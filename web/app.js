const $ = (id) => document.getElementById(id);
let recorder; let chunks = []; let startedAt; let timerId; let recordingUrl;
const setStatus = (text) => { $('status').textContent = text; };
const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;

$('record').addEventListener('click', async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('This browser does not support microphone recording.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = []; recorder = new MediaRecorder(stream); startedAt = Date.now();
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (recordingUrl) URL.revokeObjectURL(recordingUrl); recordingUrl = URL.createObjectURL(blob);
      $('player').src = recordingUrl; $('player').hidden = false; $('download').href = recordingUrl; $('download').download = `macsense-${new Date().toISOString().replaceAll(':','-')}.webm`; $('download').hidden = false;
      setStatus('Recording ready'); clearInterval(timerId);
    });
    recorder.start(); $('record').disabled = true; $('stop').disabled = false; setStatus('Recording…');
    timerId = setInterval(() => { $('timer').textContent = formatTime(Math.floor((Date.now() - startedAt) / 1000)); }, 250);
  } catch (error) { setStatus(error.message); }
});
$('stop').addEventListener('click', () => { if (recorder?.state === 'recording') recorder.stop(); $('record').disabled = false; $('stop').disabled = true; });
$('ask').addEventListener('click', async () => {
  const gateway = $('gateway').value.trim().replace(/\/$/, ''); const token = $('token').value.trim(); const prompt = $('prompt').value.trim();
  if (!gateway || !prompt) { $('result').textContent = 'Enter a gateway URL and prompt first.'; return; }
  $('ask').disabled = true; $('result').textContent = 'Ari is thinking…';
  try {
    const headers = { 'Content-Type': 'application/json' }; if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${gateway}/v1/ari/chat`, { method: 'POST', headers, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error || `Gateway returned ${response.status}`);
    const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || JSON.stringify(body, null, 2); $('result').textContent = text; setStatus('Ari response received');
  } catch (error) { $('result').textContent = `Could not reach Ari: ${error.message}`; setStatus('Ari unavailable'); }
  finally { $('ask').disabled = false; }
});
