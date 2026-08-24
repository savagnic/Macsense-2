export const MAIN_CINEMATIC = {
  id: 'macsense-commercial-system-intro',
  title: 'MACSENSE SYSTEM BRIEFING',
  durationSeconds: 195,
  minSeconds: 180,
  maxSeconds: 240,
  storageKey: 'macsense_cinematic_completed_v2',
  beats: [
    { at: 0, label: 'Opening', line: 'MacSense is a browser-native music production system built around measurable sound, controlled AI decisions, and exportable proof.' },
    { at: 18, label: 'Studio Core', line: 'The session surface connects audio import, recording, lyrics, mastering, persistence, and transport in one production workspace.' },
    { at: 38, label: 'SoundGenome', line: 'Every imported or recorded sound can become a genome: transient, harmonicity, brightness, dynamics, width, confidence, and ancestry.' },
    { at: 58, label: 'Genetic Sound', line: 'Families, breeding, resurrection, and evolution turn measured audio traits into reusable creative material with lineage intact.' },
    { at: 82, label: 'Song Revision', line: 'Bar-by-Bar Revision supports the real writing workflow: start with a partial song, compare against a generated draft, then keep, rewrite, lock, or mark each bar.' },
    { at: 106, label: 'Editor Engine', line: 'The legal engine pack adds clip lanes, regions, bar grids, feature extraction, and bounce-plan proof as the bridge toward a mature editor lane.' },
    { at: 130, label: 'Ari Control', line: 'Ari is a co-producer interface for bounded studio commands. Suggestions are previewed before the artist applies them.' },
    { at: 154, label: 'Finish Path', line: 'Mastering, proof export, and local persistence make the session accountable: what changed, what rendered, and what can be delivered.' },
    { at: 176, label: 'Enter Studio', line: 'Enter the studio to record, revise, breed, arrange, master, and export from the same system.' }
  ]
};

export const FEATURE_CINEMATICS = [
  {
    id: 'proof-mode',
    title: 'Proof Mode',
    durationSeconds: 28,
    storageKey: 'macsense_feature_seen_proof_mode_v2',
    line: 'Run a guided product proof that demonstrates engine work, analysis, Ari commands, and export readiness.'
  },
  {
    id: 'vertical-daw',
    title: 'Session Surface',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_vertical_daw_v2',
    line: 'Organize sections, tracks, stems, lyrics, transport, and decisions in a single production workspace.'
  },
  {
    id: 'flow-capture',
    title: 'Flow Capture',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_flow_capture_v2',
    line: 'Record an idea quickly, persist the take locally, and convert it into measured material for the session.'
  },
  {
    id: 'bar-revision',
    title: 'Bar-by-Bar Revision',
    durationSeconds: 32,
    storageKey: 'macsense_feature_seen_bar_revision_v2',
    line: 'Compare seed lyrics against a generated draft, then revise each bar with keep, replace, lock, and needs-work decisions.'
  },
  {
    id: 'ari',
    title: 'Ari Co-Producer',
    durationSeconds: 32,
    storageKey: 'macsense_feature_seen_ari_v2',
    line: 'Ari proposes executable studio changes and keeps the artist in control through preview, apply, and reject decisions.'
  },
  {
    id: 'sound-genetics',
    title: 'Sound Genetics',
    durationSeconds: 33,
    storageKey: 'macsense_feature_seen_sound_genetics_v2',
    line: 'Generate measured sound identities and organize them into families with parentage and confidence scores.'
  },
  {
    id: 'breeding',
    title: 'Breeding Chamber',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_breeding_v2',
    line: 'Create child sound identities from selected parent genomes and preserve the inheritance record.'
  },
  {
    id: 'resurrection',
    title: 'Resurrection Lineage',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_resurrection_v2',
    line: 'Bring a previous sound identity back into the active family tree without losing its source ancestry.'
  },
  {
    id: 'engine-pack',
    title: 'Legal Engine Pack',
    durationSeconds: 30,
    storageKey: 'macsense_feature_seen_engine_pack_v2',
    line: 'Use permissive editor concepts for clip lanes, regions, transport grids, and feature extraction while preserving license boundaries.'
  },
  {
    id: 'vocal-scanner',
    title: 'Vocal Preset Scanner',
    durationSeconds: 32,
    storageKey: 'macsense_feature_seen_vocal_scanner_v2',
    line: 'Translate vocal intent into editable tuning, EQ, compression, reverb, and delay settings.'
  },
  {
    id: 'mastering',
    title: 'Mastering Chamber',
    durationSeconds: 32,
    storageKey: 'macsense_feature_seen_mastering_v2',
    line: 'Shape the master against loudness and true peak targets before exporting a 48 kHz WAV.'
  },
  {
    id: 'export',
    title: 'Proof Export',
    durationSeconds: 25,
    storageKey: 'macsense_feature_seen_export_v2',
    line: 'Export proof data and rendered audio artifacts so the session can be reviewed, repeated, and delivered.'
  }
];

export function assertCinematicSpec() {
  if (MAIN_CINEMATIC.durationSeconds < MAIN_CINEMATIC.minSeconds || MAIN_CINEMATIC.durationSeconds > MAIN_CINEMATIC.maxSeconds) {
    throw new Error('Main MacSense cinematic must run 3-4 minutes.');
  }
  if (MAIN_CINEMATIC.beats.length < 8) throw new Error('Main MacSense cinematic needs enough story beats to explain the system.');
  for (const beat of MAIN_CINEMATIC.beats) {
    if (!beat.label || !beat.line) throw new Error('Main cinematic beats need labels and copy.');
  }
  for (const feature of FEATURE_CINEMATICS) {
    if (feature.durationSeconds < 25 || feature.durationSeconds > 35) {
      throw new Error(`${feature.title} cinematic must be 25-35 seconds.`);
    }
    if (!feature.storageKey || !feature.line) throw new Error(`${feature.title} cinematic is incomplete.`);
  }
  const required = ['proof-mode','vertical-daw','flow-capture','bar-revision','ari','sound-genetics','breeding','resurrection','engine-pack','vocal-scanner','mastering','export'];
  const present = new Set(FEATURE_CINEMATICS.map(f => f.id));
  for (const id of required) if (!present.has(id)) throw new Error(`Missing feature cinematic: ${id}`);
  return true;
}
