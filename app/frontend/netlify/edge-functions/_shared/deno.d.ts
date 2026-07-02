/**
 * Minimal ambient type declarations for Netlify Edge Functions (Deno runtime).
 * Lives in a subfolder so Netlify's bundler doesn't treat it as a function entry point.
 * Avoids requiring the @netlify/edge-functions npm package at type-check time.
 */

declare module "@netlify/edge-functions" {
  export interface Context {
    [key: string]: any;
    next: (options?: { sendConditionalRequest?: boolean }) => Promise<Response>;
    nextRequest: (request: Request, options?: { sendConditionalRequest?: boolean }) => Promise<Response>;
  }

  export interface Config {
    path?: string | string[];
    excludedPath?: string | string[];
    pattern?: RegExp | RegExp[];
    excludedPattern?: RegExp | RegExp[];
    method?: string | string[];
    onError?: "continue" | "fail" | "fallback";
    cache?: "manual";
  }
}

declare const Netlify: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
};
