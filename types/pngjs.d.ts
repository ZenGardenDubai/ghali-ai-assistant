declare module "pngjs" {
  import { Readable } from "stream";

  interface PNGOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    checkCRC?: boolean;
    deflateChunkSize?: number;
    deflateLevel?: number;
    deflateStrategy?: number;
    deflateFactory?: unknown;
    filterType?: number | number[];
    colorType?: number;
    inputColorType?: number;
    bitDepth?: number;
    inputHasAlpha?: boolean;
    bgColor?: { red: number; green: number; blue: number };
    skipRescale?: boolean;
  }

  class PNG {
    constructor(options?: PNGOptions);
    width: number;
    height: number;
    data: Buffer;
    pack(): Readable;
    parse(data: Buffer | string, callback?: (error: Error | null, data: PNG) => void): PNG;
  }

  export { PNG };
}
