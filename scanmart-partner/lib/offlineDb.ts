/**
 * ScanMart — Offline Sale Queue (IndexedDB)
 * Replaces the localStorage approach with a robust, size-unlimited IDB store.
 */

const DB_NAME = "scanmart_offline";
const STORE_NAME = "sales_queue";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** Save a sale to the offline queue */
export async function idbAddSale(sale: {
    id: string;
    saleRecord: Record<string, unknown>;
    items: Record<string, unknown>[];
    stockUpdates: { id: string; newStock: number }[];
}): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(sale);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get all queued offline sales */
export async function idbGetQueue(): Promise<any[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

/** Remove a successfully synced sale from the queue */
export async function idbRemoveSale(id: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get count of pending offline sales */
export async function idbQueueCount(): Promise<number> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
