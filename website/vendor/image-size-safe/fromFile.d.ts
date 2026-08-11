import type { ISizeCalculationResult } from './index';
export declare const imageSizeFromFile: (filePath: string) => Promise<ISizeCalculationResult>;
export declare const setConcurrency: (value: number) => void;
