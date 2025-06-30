export const playHaptic = (type: "light" | "medium" | "heavy") => {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    try {
      switch (type) {
        case "light":
          window.navigator.vibrate(20);
          break;
        case "medium":
          window.navigator.vibrate(50);
          break;
        case "heavy":
          window.navigator.vibrate([100, 30, 100]);
          break;
        default:
          break;
      }
    } catch (e) {
      console.warn("Haptic feedback is not supported or failed.", e);
    }
  }
}; 