// Minimal type declaration for sharp so TypeScript resolves the module.
// The actual package is installed at runtime in the Convex Node.js action.
declare module "sharp" {
  interface Sharp {
    png(options?: Record<string, unknown>): Sharp;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer | Uint8Array): Sharp;
  export = sharp;
}
