/**
 * IndexedDB-based video storage for offline playback.
 *
 * Stores video blobs in IndexedDB so they can be played locally
 * without any network requests. Provides save, load, delete,
 * and listing capabilities.
 */

const DB_NAME = "neptube-offline-videos";
const DB_VERSION = 1;
const STORE_NAME = "videos";

export interface OfflineVideo {
  id: string; // video ID
  title: string;
  blob: Blob;
  thumbnailURL: string | null;
  mimeType: string;
  size: number;
  savedAt: number; // timestamp
}

export interface OfflineVideoMeta {
  id: string;
  title: string;
  thumbnailURL: string | null;
  mimeType: string;
  size: number;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Save a video blob to IndexedDB for offline playback
 */
export async function saveVideoOffline(
  videoId: string,
  title: string,
  videoUrl: string,
  thumbnailURL: string | null,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  // Fetch the video with progress tracking
  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const mimeType = response.headers.get("content-type") || "video/mp4";

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Could not read response body");

  const chunks: ArrayBuffer[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value.buffer as ArrayBuffer);
    loaded += value.length;
    if (onProgress && total > 0) {
      onProgress(loaded, total);
    }
  }

  const blob = new Blob(chunks, { type: mimeType });

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineVideo = {
      id: videoId,
      title,
      blob,
      thumbnailURL,
      mimeType,
      size: blob.size,
      savedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * Load a video blob from IndexedDB and return an object URL
 */
export async function getOfflineVideoURL(videoId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(videoId);

      req.onsuccess = () => {
        const result = req.result as OfflineVideo | undefined;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Check if a video is saved offline
 */
export async function isVideoOffline(videoId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(videoId);

      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

/**
 * Delete an offline video
 */
export async function deleteOfflineVideo(videoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(videoId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/**
 * List all offline videos (metadata only, no blobs)
 */
export async function listOfflineVideos(): Promise<OfflineVideoMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result as OfflineVideo[]).map(
          ({ id, title, thumbnailURL, mimeType, size, savedAt }) => ({
            id,
            title,
            thumbnailURL,
            mimeType,
            size,
            savedAt,
          })
        );
        resolve(results);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

/**
 * Get total storage used by offline videos
 */
export async function getOfflineStorageUsed(): Promise<number> {
  const videos = await listOfflineVideos();
  return videos.reduce((total, v) => total + v.size, 0);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get the best video source URL — preferring offline, then proxy, then direct.
 */
export function getVideoSourceUrl(videoId: string, originalUrl: string): string {
  // The proxy URL enables byte-range streaming (chunked loading)
  return `/api/video/stream?url=${encodeURIComponent(originalUrl)}`;
}
