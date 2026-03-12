/**
 * AXC (AEGIS Extreme Cache) - IndexedDB Interface
 */
export const axcCache = {
    NAME: 'AEGIS_Plugin_Cache',
    STORE: 'packs',
    VERSION: 1,
    _instance: null,

    open: async function () {
        if (this._instance) return this._instance;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.NAME, this.VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE);
                }
            };
            request.onsuccess = () => {
                this._instance = request.result;
                resolve(this._instance);
            };
            request.onerror = () => reject(request.error);
        });
    },

    get: async function (key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.STORE, 'readonly');
            const request = transaction.objectStore(this.STORE).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    set: async function (key, value) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.STORE, 'readwrite');
            const request = transaction.objectStore(this.STORE).put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
