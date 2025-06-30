export const log = (
  message: string,
  type: "log" | "error" | "warn" = "log",
  ...args: any[]
) => {
  const prefix = "[App]";
  console[type](`${prefix} ${message}`, ...args);
}; 