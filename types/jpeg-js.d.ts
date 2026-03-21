declare module "jpeg-js" {
  interface RawImageData {
    width: number;
    height: number;
    data: Uint8Array;
  }
  interface DecodeOptions {
    useTArray?: boolean;
    colorTransform?: boolean;
    formatAsRGBA?: boolean;
    tolerantDecoding?: boolean;
    maxResolutionInMP?: number;
    maxMemoryUsageInMB?: number;
  }
  function decode(
    jpegData: Buffer | Uint8Array | ArrayBuffer,
    opts?: DecodeOptions
  ): RawImageData;
  export = { decode };
}
