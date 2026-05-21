// Offline queue for BMS readings that fail to reach Supabase.
// Backed by IndexedDB (raw, no extra dependency).
//
// Each item stores the SOC + voltage + current at the moment they were read,
// plus an ISO timestamp so we can backdate the row when it eventually syncs.

const DB_NAME = "scooter-battery";
const STORE_NAME = "bms_queue";
const DB_VERSION = 1;

export type QueuedReading = {
  id?: number;
  soc: number;
  voltage: number | null;
  current: number | null;
  cycles?: number | null;
  maxTempC?: number | null;
  loggedAtIso: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueReading(item: Omit<QueuedReading, "id">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllQueued(): Promise<QueuedReading[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const items = req.result as QueuedReading[];
      items.sort((a, b) => a.loggedAtIso.localeCompare(b.loggedAtIso));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueued(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countQueued(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
