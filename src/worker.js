import Calc from './calc.mjs';

let wasm;

onmessage = async (e) => {
    if (!wasm) {
        wasm = await Calc();
    }
    const [start, end, min, max, borderInfo, uosize] = e.data;
    let borders = new wasm.vectorPairUint64Uint8();
    borderInfo.forEach(bord => {
        let arr = [Number(bord["mask"]), Number(bord["number"])];
        borders.push_back(arr);
    });

    const uint64arr = wasm['findCombs'](start, end, min, max, borders);
    let workerCombs = [];
    const len = uint64arr.size();
    if (uosize <= 53){
        for (let i = 0; i < len; i++){
            workerCombs.push(Number(uint64arr.get(i)));
        }
    }
    else {
        for (let i = 0; i < len; i++){
            workerCombs.push(uint64arr.get(i));
        }
    }
    
    postMessage(workerCombs);
};