const COMMAND_RE = /<ari_command\s+type="([^"]+)"([^>]*)\/>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

export function parseAriCommands(text) {
  const commands = [];
  for (const match of text.matchAll(COMMAND_RE)) {
    const attrs = {};
    for (const attr of match[2].matchAll(ATTR_RE)) attrs[attr[1]] = attr[2];
    commands.push({ type: match[1], ...attrs });
  }
  return commands;
}

export function stripAriCommands(text) {
  return String(text || '').replace(COMMAND_RE, '').trim();
}

export class AriGatewayClient {
  constructor({ baseUrl = '', getAccessToken = async () => null, timeoutMs = 30000 } = {}) {
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.getAccessToken = getAccessToken;
    this.timeoutMs = timeoutMs;
  }

  async chat({ message, project, history = [] }) {
    if (!this.baseUrl) throw new Error('Ari gateway URL is not configured');
    const token = await this.getAccessToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/v1/ari/chat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [...history.slice(-20), { role: 'user', parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: buildSystemInstruction(project) }] }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Ari gateway HTTP ${response.status}`);
      const text = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || payload.text || '';
      if (!text) throw new Error('Ari returned no content');
      return { text: stripAriCommands(text), commands: parseAriCommands(text), raw: payload };
    } finally {
      clearTimeout(timer);
    }
  }
}

export function buildSystemInstruction(project) {
  const summary = {
    bpm: project.bpm,
    sections: project.sections,
    tracks: project.tracks.map(({ id, name, volume, pan, muted, solo }) => ({ id, name, volume, pan, muted, solo })),
    mastering: project.mastering,
    genomes: project.genomes.slice(-20),
    lyrics: project.lyrics.slice(0, 6000)
  };
  return `You are Ari, MACSENSE AI's bounded co-producer. Be concise and creatively specific. Never claim an action happened unless a command is emitted. Creative mutations must be proposed for confirmation. Project context: ${JSON.stringify(summary)}. Supported self-closing commands: <ari_command type="set_tempo" bpm="120"/>, <ari_command type="set_track_state" track_id="id" muted="false" solo="false" volume="1" pan="0"/>, <ari_command type="rewrite_lyrics" updated="..." reason="..."/>, <ari_command type="set_master_preset" preset="streaming_clean"/>, <ari_command type="breed_sounds" parent_a="id" parent_b="id" traits="brightness,dynamics"/>.`;
}

export function executeAriCommand(command, handlers) {
  switch (command.type) {
    case 'set_tempo': return handlers.setTempo?.(Number(command.bpm));
    case 'set_track_state': return handlers.setTrackState?.(command.track_id, {
      muted: command.muted === 'true', solo: command.solo === 'true',
      volume: command.volume === undefined ? undefined : Number(command.volume),
      pan: command.pan === undefined ? undefined : Number(command.pan)
    });
    case 'rewrite_lyrics': return handlers.rewriteLyrics?.(command.updated || '', command.reason || 'Ari rewrite');
    case 'set_master_preset': return handlers.setMasterPreset?.(command.preset);
    case 'breed_sounds': return handlers.breedSounds?.(command.parent_a, command.parent_b, String(command.traits || '').split(',').filter(Boolean));
    default: throw new Error(`Unsupported Ari command: ${command.type}`);
  }
}
