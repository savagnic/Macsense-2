const XML_COMMAND_RE = /<ari_command\s+type="([^"]+)"([^>]*)\/>/g;
const JSON_COMMAND_RE = /<ari_command>\s*([\s\S]*?)\s*<\/ari_command>/g;
const ATTR_RE = /(\w+)="([^"]*)"/g;

export function parseAriCommands(text) {
  const commands = [];
  for (const match of String(text || '').matchAll(XML_COMMAND_RE)) {
    const attrs = {};
    for (const attr of match[2].matchAll(ATTR_RE)) attrs[attr[1]] = attr[2];
    commands.push({ type: match[1], ...attrs });
  }
  for (const match of String(text || '').matchAll(JSON_COMMAND_RE)) {
    try {
      const command = JSON.parse(match[1]);
      if (command && typeof command.type === 'string') commands.push(command);
    } catch { }
  }
  return commands;
}

export function stripAriCommands(text) {
  return String(text || '').replace(XML_COMMAND_RE, '').replace(JSON_COMMAND_RE, '').trim();
}

export class AriGatewayClient {
  constructor({ baseUrl = '', getAccessToken = async () => null, timeoutMs = 30000 } = {}) {
    const sameOrigin = typeof location !== 'undefined' ? location.origin : '';
    this.baseUrl = String(baseUrl || sameOrigin).replace(/\/$/, '');
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
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
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
    } finally { clearTimeout(timer); }
  }
}

export function buildSystemInstruction(project) {
  const summary = {
    bpm: project.bpm,
    sections: project.sections,
    tracks: project.tracks.map(({ id, name, volume, pan, muted, solo }) => ({ id, name, volume, pan, muted, solo })),
    mastering: project.mastering,
    vocalPreset: project.vocalPreset || null,
    genomes: project.genomes.slice(-20),
    lyrics: project.lyrics.slice(0, 6000)
  };
  return `You are Ari, MACSENSE AI's real bounded co-producer. You can critique freely, but never claim a mutation happened unless you emit one command. All creative mutations are proposals the artist must apply. Project context: ${JSON.stringify(summary)}. Prefer the current self-closing command syntax. Supported commands: set_tempo(bpm), set_track_state(track_id, muted, solo, volume, pan), rewrite_lyrics(updated, reason), reorder_sections(order as comma-separated ids), set_master_preset(preset), update_effects(track_id, reverb, delay, filter, volume), breed_sounds(parent_a, parent_b, traits), resurrect_sound(take_id). You may also emit the Android-compatible legacy form <ari_command>{"type":"update_bpm","bpm_value":140,"explanation":"..."}</ari_command> and corresponding update_lyrics, reorder_sections, apply_preset, update_effects, breed_sounds, resurrect_sound fields. Never emit unsupported commands.`;
}

export function executeAriCommand(command, handlers) {
  switch (command.type) {
    case 'set_tempo':
    case 'update_bpm': return handlers.setTempo?.(Number(command.bpm ?? command.bpm_value));
    case 'set_track_state': return handlers.setTrackState?.(command.track_id, {
      muted: asBool(command.muted), solo: asBool(command.solo),
      volume: numOrUndefined(command.volume), pan: numOrUndefined(command.pan)
    });
    case 'rewrite_lyrics': return handlers.rewriteLyrics?.(command.updated ?? command.value ?? '', command.reason ?? command.explanation ?? 'Ari rewrite', command.section_id);
    case 'update_lyrics': return handlers.rewriteLyrics?.(command.value ?? '', command.explanation ?? 'Ari rewrite', command.section_id);
    case 'reorder_sections': {
      const order = Array.isArray(command.section_order) ? command.section_order : String(command.order || '').split(',').map(x => x.trim()).filter(Boolean);
      return handlers.reorderSections?.(order);
    }
    case 'set_master_preset':
    case 'apply_preset': return handlers.setMasterPreset?.(command.preset ?? command.preset_name);
    case 'update_effects': return handlers.updateEffects?.(command.track_id ?? command.section_id, {
      reverb: numOrUndefined(command.reverb), delay: numOrUndefined(command.delay), filter: numOrUndefined(command.filter), volume: numOrUndefined(command.volume)
    });
    case 'breed_sounds': return handlers.breedSounds?.(
      command.parent_a ?? command.parent_take_id,
      command.parent_b ?? command.parent_take_id_2,
      command.traits ? String(command.traits).split(',').filter(Boolean) : undefined,
      numOrUndefined(command.trait_bias), command.tags
    );
    case 'resurrect_sound': return handlers.resurrectSound?.(command.take_id, command.tags);
    default: throw new Error(`Unsupported Ari command: ${command.type}`);
  }
}

function asBool(value) { return value === true || value === 'true' ? true : value === false || value === 'false' ? false : undefined; }
function numOrUndefined(value) { return value === undefined || value === null || value === '' ? undefined : Number(value); }
