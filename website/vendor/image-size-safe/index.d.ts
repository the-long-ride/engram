export interface ISizeCalculationResult {
  width: number;
  height: number;
  type?: string;
}
export declare const imageSize: (input: Uint8Array) => ISizeCalculationResult;
export declare const types: string[];
export declare const disableTypes: (types: string[]) => void;
