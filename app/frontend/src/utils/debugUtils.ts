/**
 * Debug utilities for voice agents
 * 
 * To enable debug mode, run in browser console:
 * window.DEBUG_VOICE_AGENT = true
 * 
 * To disable:
 * window.DEBUG_VOICE_AGENT = false
 */

export const debugLog = (message: string, ...args: any[]) => {
  if ((window as any).DEBUG_VOICE_AGENT === true) {
    console.log(`🔍 ${message}`, ...args);
  }
};

export const debugWarn = (message: string, ...args: any[]) => {
  if ((window as any).DEBUG_VOICE_AGENT === true) {
    console.warn(`⚠️ ${message}`, ...args);
  }
};

export const debugError = (message: string, ...args: any[]) => {
  // Always show errors, but with debug prefix when in debug mode
  if ((window as any).DEBUG_VOICE_AGENT === true) {
    console.error(`🚨 ${message}`, ...args);
  } else {
    console.error(message, ...args);
  }
};

export const isDebugEnabled = (): boolean => {
  return (window as any).DEBUG_VOICE_AGENT === true;
};

// Initialize debug mode instructions
if (typeof window !== 'undefined') {
  (window as any).enableVoiceDebug = () => {
    (window as any).DEBUG_VOICE_AGENT = true;
    console.log('🎯 Voice agent debug mode ENABLED. You will now see detailed logs.');
    console.log('💡 To disable: window.DEBUG_VOICE_AGENT = false or window.disableVoiceDebug()');
  };
  
  (window as any).disableVoiceDebug = () => {
    (window as any).DEBUG_VOICE_AGENT = false;
    console.log('🔇 Voice agent debug mode DISABLED. Logs will be minimal.');
  };
  
  // Show instructions on first load
  if (!(window as any).DEBUG_INSTRUCTIONS_SHOWN) {
    console.log('💡 Voice Agent Debug Controls:');
    console.log('   enableVoiceDebug()  - Show detailed logs');
    console.log('   disableVoiceDebug() - Hide detailed logs');
    (window as any).DEBUG_INSTRUCTIONS_SHOWN = true;
  }
} 