const DB_NAME = 'macsense-web';
const DB_VERSION = 1;
const PROJECTS = 'projects';
const AUDIO = 'audio';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    let result;
    try { result = fn(objectStore); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('IndexedDB transaction aborted')); };
  });
}

export async function saveProject(project) {
  const copy = structuredClone(project);
  copy.updatedAt = new Date().toISOString();
  await tx(PROJECTS, 'readwrite', store => store.put(copy));
  return copy;
}

export async function loadProject(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS, 'readonly');
    const req = transaction.objectStore(PROJECTS).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function listProjects() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS, 'readonly');
    const req = transaction.objectStore(PROJECTS).getAll();
    req.onsuccess = () => { db.close(); resolve((req.result || []).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function saveAudioBlob(id, blob, metadata = {}) {
  await tx(AUDIO, 'readwrite', store => store.put({ id, blob, metadata, savedAt: new Date().toISOString() }));
}

export async function loadAudioBlob(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(AUDIO, 'readonly').objectStore(AUDIO).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteProject(id) {
  await tx(PROJECTS, 'readwrite', store => store.delete(id));
}
