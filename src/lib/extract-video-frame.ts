/**
 * Extracts a frame from a video at a specific timestamp
 * Uses native browser canvas - no external dependencies needed!
 */

export interface ExtractedFrame {
  blob: Blob;
  file: File;
  dataUrl: string;
  timestamp: number;
}

/**
 * Extract a single frame from a video URL at a specific timestamp
 * @param videoUrl - URL of the video (can be blob URL or remote URL)
 * @param timestamp - Time in seconds to extract frame from (default: 1)
 * @param quality - JPEG quality 0-1 (default: 0.9)
 */
export async function extractVideoFrame(
  videoUrl: string,
  timestamp: number = 1,
  quality: number = 0.9
): Promise<ExtractedFrame> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous"; // Enable CORS for remote videos
    video.muted = true;
    video.preload = "metadata";

    // Set up event handlers
    video.onloadedmetadata = () => {
      // Clamp timestamp to video duration
      const seekTime = Math.min(timestamp, video.duration - 0.1);
      video.currentTime = Math.max(0, seekTime);
    };

    video.onseeked = () => {
      try {
        // Create canvas with video dimensions
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"));
              return;
            }

            // Create file from blob
            const fileName = `thumbnail-${Date.now()}.jpg`;
            const file = new File([blob], fileName, { type: "image/jpeg" });

            // Get data URL for preview
            const dataUrl = canvas.toDataURL("image/jpeg", quality);

            // Clean up
            video.remove();

            resolve({
              blob,
              file,
              dataUrl,
              timestamp: video.currentTime,
            });
          },
          "image/jpeg",
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error("Failed to load video"));
    };

    // Start loading video
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Extract multiple frames from a video at different timestamps
 * Useful for letting users choose their preferred thumbnail
 * @param videoUrl - URL of the video
 * @param frameCount - Number of frames to extract (default: 3)
 */
export async function extractMultipleFrames(
  videoUrl: string,
  frameCount: number = 3
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const frames: ExtractedFrame[] = [];

      // Calculate timestamps evenly distributed throughout the video
      // Skip first 0.5s and last 0.5s to avoid black frames
      const startTime = Math.min(0.5, duration * 0.1);
      const endTime = Math.max(duration - 0.5, duration * 0.9);
      const interval = (endTime - startTime) / (frameCount - 1);

      video.remove();

      // Extract frames sequentially
      for (let i = 0; i < frameCount; i++) {
        const timestamp = startTime + interval * i;
        try {
          const frame = await extractVideoFrame(videoUrl, timestamp);
          frames.push(frame);
        } catch (error) {
          console.error(`Failed to extract frame at ${timestamp}s:`, error);
        }
      }

      if (frames.length === 0) {
        reject(new Error("Failed to extract any frames from video"));
      } else {
        resolve(frames);
      }
    };

    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
    };

    video.src = videoUrl;
    video.load();
  });
}

/**
 * Get video duration without loading the entire video
 */
export async function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.remove();
      resolve(duration);
    };

    video.onerror = () => {
      reject(new Error("Failed to load video metadata"));
    };

    video.src = videoUrl;
    video.load();
  });
}
