// Custom storage adapter that handles localStorage restrictions in preview environments
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorage implements StorageAdapter {
  private storage = new Map<string, string>();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
    // Broadcast to other tabs/windows in the same origin
    this.broadcastUpdate(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
    this.broadcastUpdate(key, null);
  }

  private broadcastUpdate(key: string, value: string | null) {
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('supabase-auth');
        channel.postMessage({ type: 'storage-update', key, value });
      }
    } catch (error) {
      console.warn('[STORAGE] Broadcasting failed:', error);
    }
  }
}

class SmartStorageAdapter implements StorageAdapter {
  private fallbackStorage = new MemoryStorage();
  private storageType: 'localStorage' | 'memory' = 'memory';
  private testKey = '__supabase_storage_test__';

  constructor() {
    this.detectStorageCapability();
    this.setupBroadcastListener();
  }

  private detectStorageCapability() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Test if localStorage is actually writable
        localStorage.setItem(this.testKey, 'test');
        localStorage.removeItem(this.testKey);
        this.storageType = 'localStorage';
        console.log('[STORAGE] Using localStorage');
      } else {
        console.log('[STORAGE] localStorage not available, using memory storage');
      }
    } catch (error) {
      console.warn('[STORAGE] localStorage test failed, falling back to memory storage:', error);
      this.storageType = 'memory';
    }
  }

  private setupBroadcastListener() {
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('supabase-auth');
        channel.onmessage = (event) => {
          if (event.data?.type === 'storage-update') {
            const { key, value } = event.data;
            if (value === null) {
              this.fallbackStorage.removeItem(key);
            } else {
              this.fallbackStorage.setItem(key, value);
            }
          }
        };
      }
    } catch (error) {
      console.warn('[STORAGE] BroadcastChannel setup failed:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.storageType === 'localStorage') {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('[STORAGE] localStorage.getItem failed:', error);
      this.storageType = 'memory';
    }
    
    return this.fallbackStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    try {
      if (this.storageType === 'localStorage') {
        localStorage.setItem(key, value);
        return;
      }
    } catch (error) {
      console.warn('[STORAGE] localStorage.setItem failed:', error);
      this.storageType = 'memory';
    }
    
    this.fallbackStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    try {
      if (this.storageType === 'localStorage') {
        localStorage.removeItem(key);
        return;
      }
    } catch (error) {
      console.warn('[STORAGE] localStorage.removeItem failed:', error);
      this.storageType = 'memory';
    }
    
    this.fallbackStorage.removeItem(key);
  }

  isUsingMemoryStorage(): boolean {
    return this.storageType === 'memory';
  }
}

export const customStorage = new SmartStorageAdapter();
export { SmartStorageAdapter, MemoryStorage };