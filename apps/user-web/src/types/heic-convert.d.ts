declare module "heic-convert" {
  interface ConvertOptions {
    /** The HEIC file buffer */
    buffer: Buffer
    /** Output format - 'JPEG' or 'PNG' */
    format: "JPEG" | "PNG"
    /** Quality for JPEG output (0-1) */
    quality?: number
  }

  /**
   * Convert HEIC/HEIF image to JPEG or PNG
   */
  function convert(options: ConvertOptions): Promise<ArrayBuffer>

  export default convert
}
