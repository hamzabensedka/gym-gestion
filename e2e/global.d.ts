export {};

declare global {
  interface Window {
    __gymSimulateQrScan?: (decodedText: string) => void;
  }
}
