declare module '*.mjs' {
    interface VectorUint8 {
        push_back(value: number): void;
        get(index: number): number;
        set(index: number): void;
        size(): number;
        resize(count: number, value?: number): void;
        delete(): void;
    }
    interface CalculationModule {
        vectorUint8_t: {
            new(): VectorUint8;
        };

        probabilities : (field: VectorUint8, w: number, h: number, m: number) => VectorUint8;
    }
    const Calc: () => Promise<CalculationModule>;
    export default Calc;
}