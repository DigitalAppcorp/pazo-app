declare module 'qrcode-generator' {
  interface QRCodeModel {
    addData(data: string, mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }

  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

  function qrcode(typeNumber?: number, errorCorrectionLevel?: ErrorCorrectionLevel): QRCodeModel

  export default qrcode
}
