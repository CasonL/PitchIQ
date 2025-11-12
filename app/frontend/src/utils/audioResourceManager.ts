// Audio Resource Manager - Centralized audio resource cleanup
// Prevents conflicts between voice agents by managing shared audio resources

interface AudioResourceTracker {
  contexts: Set<AudioContext>;
  streams: Set<MediaStream>;
  worklets: Set<AudioWorkletNode>;
}

class AudioResourceManager {
  private static instance: AudioResourceManager;
  private resources: AudioResourceTracker = {
    contexts: new Set(),
    streams: new Set(),
    worklets: new Set()
  };

  static getInstance(): AudioResourceManager {
    if (!AudioResourceManager.instance) {
      AudioResourceManager.instance = new AudioResourceManager();
    }
    return AudioResourceManager.instance;
  }

  // Register audio resources for tracking
  registerContext(context: AudioContext): void {
    this.resources.contexts.add(context);
    // Store reference globally for cleanup
    if (!(window as any).__audioContexts) {
      (window as any).__audioContexts = [];
    }
    (window as any).__audioContexts.push(context);
  }

  registerStream(stream: MediaStream): void {
    this.resources.streams.add(stream);
  }

  registerWorklet(worklet: AudioWorkletNode): void {
    this.resources.worklets.add(worklet);
  }

  // Cleanup specific resources
  cleanupContext(context: AudioContext): Promise<void> {
    return new Promise((resolve) => {
      if (context.state !== 'closed') {
        context.close()
          .then(() => {
            this.resources.contexts.delete(context);
            resolve();
          })
          .catch(() => {
            this.resources.contexts.delete(context);
            resolve();
          });
      } else {
        this.resources.contexts.delete(context);
        resolve();
      }
    });
  }

  cleanupStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      track.stop();
    });
    this.resources.streams.delete(stream);
  }

  cleanupWorklet(worklet: AudioWorkletNode): void {
    try {
      worklet.disconnect();
    } catch {}
    this.resources.worklets.delete(worklet);
  }

  // Force cleanup all resources
  async forceCleanupAll(): Promise<void> {
    console.log('🧹 AudioResourceManager: Force cleaning all audio resources');
    
    // Cleanup worklets first
    for (const worklet of this.resources.worklets) {
      this.cleanupWorklet(worklet);
    }

    // Cleanup streams
    for (const stream of this.resources.streams) {
      this.cleanupStream(stream);
    }

    // Cleanup contexts with delay
    const contextCleanupPromises = Array.from(this.resources.contexts).map(context => 
      this.cleanupContext(context)
    );

    await Promise.all(contextCleanupPromises);

    // Clear global references
    (window as any).__audioContexts = [];
    
    console.log('✅ AudioResourceManager: All resources cleaned');
  }

  // Get resource counts for debugging
  getResourceCounts(): { contexts: number; streams: number; worklets: number } {
    return {
      contexts: this.resources.contexts.size,
      streams: this.resources.streams.size,
      worklets: this.resources.worklets.size
    };
  }
}

export const audioResourceManager = AudioResourceManager.getInstance();
