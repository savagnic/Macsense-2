export const MAIN_CINEMATIC = {
  id: 'ari-system-intro',
  title: 'ARI AWAKENING · MACSENSE SYSTEM INTRO',
  durationSeconds: 210,
  minSeconds: 180,
  maxSeconds: 240,
  storageKey: 'macsense_cinematic_completed',
  beats: [
    { at: 0, line: 'This is not a loop pack. This is a living studio.' },
    { at: 20, line: 'MacSense listens to the song as structure, signal, and memory.' },
    { at: 42, line: 'Every take becomes measurable DNA: transient, harmonicity, brightness, dynamics, width, confidence, lineage.' },
    { at: 68, line: 'Flow Capture catches the raw idea before it evaporates.' },
    { at: 92, line: 'The Vertical DAW turns sketches into sections, tracks, stems, lyrics, and decisions.' },
    { at: 118, line: 'Sound Genetics breeds tone without erasing ancestry.' },
    { at: 142, line: 'The Vocal Scanner builds a chain around the voice: tune, EQ, compression, reverb, delay.' },
    { at: 166, line: 'Mastering reads loudness and true peak before exporting a real 48 kHz WAV.' },
    { at: 188, line: 'Ari is not a chatbot bolted to the side. Ari proposes bounded studio changes you can inspect and apply.' },
    { at: 206, line: 'Vinny, enter the system. Record, breed, arrange, master, export. The browser is the instrument.' }
  ]
};

export const FEATURE_CINEMATICS = [
  {
    id: 'vertical-daw',
    title: 'Vertical DAW',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_vertical_daw',
    line: 'Build the song top to bottom: sections, stems, controls, lyrics, transport, and decisions in one living surface.'
  },
  {
    id: 'flow-capture',
    title: 'Flow Capture',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_flow_capture',
    line: 'Hit record before the idea gets polite. MacSense captures the take and turns it into measured material.'
  },
  {
    id: 'lyrics-studio',
    title: 'Lyrics Studio',
    durationSeconds: 28,
    storageKey: 'macsense_feature_seen_lyrics_studio',
    line: 'Write in the record, then let Ari propose rewrites without contaminating the original words.'
  },
  {
    id: 'ari',
    title: 'Ari Co-Producer',
    durationSeconds: 35,
    storageKey: 'macsense_feature_seen_ari',
    line: 'Ari sees the session, proposes executable studio commands, and waits for the artist to approve the move.'
  },
  {
    id: 'sound-genetics',
    title: 'Sound Genetics',
    durationSeconds: 33,
    storageKey: 'macsense_feature_seen_sound_genetics',
    line: 'Every sound receives a genome and every hybrid remembers its parents.'
  },
  {
    id: 'breeding',
    title: 'Breeding Chamber',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_breeding',
    line: 'Choose two measured sounds, pick inherited traits, and create a new identity without losing lineage.'
  },
  {
    id: 'resurrection',
    title: 'Resurrection Ritual',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_resurrection',
    line: 'Dormant takes stay useful. Bring a sound back into the active bloodline with ancestry intact.'
  },
  {
    id: 'vocal-scanner',
    title: 'Vocal Preset Scanner',
    durationSeconds: 35,
    storageKey: 'macsense_feature_seen_vocal_scanner',
    line: 'Match closely, fit the voice, or blend styles with an editable Auto-Tune, EQ, compression, reverb, and delay chain.'
  },
  {
    id: 'mastering',
    title: 'Mastering Chamber',
    durationSeconds: 32,
    storageKey: 'macsense_feature_seen_mastering',
    line: 'Shape the master against loudness and true peak, then export a real 48 kHz WAV.'
  },
  {
    id: 'arrangement',
    title: 'Arrangement View',
    durationSeconds: 28,
    storageKey: 'macsense_feature_seen_arrangement',
    line: 'Reorder the song arc without breaking the section model that the studio and Ari share.'
  },
  {
    id: 'export',
    title: 'Export Master',
    durationSeconds: 25,
    storageKey: 'macsense_feature_seen_export',
    line: 'Render the session offline and leave with a real master file, not a fake success banner.'
  }
];

export function assertCinematicSpec() {
  if (MAIN_CINEMATIC.durationSeconds < MAIN_CINEMATIC.minSeconds || MAIN_CINEMATIC.durationSeconds > MAIN_CINEMATIC.maxSeconds) {
    throw new Error('Main Ari cinematic must run 3-4 minutes.');
  }
  if (MAIN_CINEMATIC.beats.length < 8) throw new Error('Main Ari cinematic needs enough story beats to explain the system.');
  for (const feature of FEATURE_CINEMATICS) {
    if (feature.durationSeconds < 25 || feature.durationSeconds > 35) {
      throw new Error(`${feature.title} cinematic must be 25-35 seconds.`);
    }
    if (!feature.storageKey || !feature.line) throw new Error(`${feature.title} cinematic is incomplete.`);
  }
  const required = ['vertical-daw','flow-capture','lyrics-studio','ari','sound-genetics','breeding','resurrection','vocal-scanner','mastering','arrangement','export'];
  const present = new Set(FEATURE_CINEMATICS.map(f => f.id));
  for (const id of required) if (!present.has(id)) throw new Error(`Missing feature cinematic: ${id}`);
  return true;
}
