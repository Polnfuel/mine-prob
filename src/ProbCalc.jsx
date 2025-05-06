import React, {useEffect, useState} from "react";
import "./ProbCalc.css";
import Grid from "./Grid";
import createWorker from './worker.js?worker&inline';
import Gen from './gen.mjs';

function get2dArray(data, width) {
    let array = [];
    let row = [];
    for (let i = 0; i < data.length; i += 4){
        row.push([data[i], data[i+1], data[i+2], data[i+3]]);
        if ((i / 4 + 1) % width === 0){
            array.push(row);
            row = [];
        }
    }
    return array;
}
function getUserField(array, width, height){
    let userfield = Array.from({length: height}, () => Array.from({length: width}, () => null) );
    for (let j = 101; j < (height - 1) * 26 + 102; j += 26){
        for (let i = 33; i < (width - 1) * 26 + 34; i += 26){
            const w = (i - 33) / 26;
            const h = (j - 101) / 26;
            const pixel = array[j][i];
            if (JSON.stringify(pixel) === JSON.stringify([198, 198, 198, 255])){
                if (JSON.stringify(array[j][i - 13]) === JSON.stringify([255, 255, 255, 255])){
                    userfield[h][w] = 9;
                }
                else if (JSON.stringify(array[j - 6][i]) === JSON.stringify([0, 0, 0, 255])) {
                    userfield[h][w] = 7;
                }
                else {
                    userfield[h][w] = 0;
                }
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 0, 247, 255])){
                userfield[h][w] = 1;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 119, 0, 255])){
                userfield[h][w] = 2;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([236, 0, 0, 255])){
                userfield[h][w] = 3;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 0, 128, 255])){
                userfield[h][w] = 4;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([128, 0, 0, 255])){
                userfield[h][w] = 5;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 128, 128, 255])){
                userfield[h][w] = 6;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([112, 112, 112, 255])){
                userfield[h][w] = 7;
            }
            else if (JSON.stringify(pixel) === JSON.stringify([100, 100, 100, 255])){
                userfield[h][w] = 10;
            }
        }
    }
    return userfield;
}
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
};
const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
};
async function processImage(image) {
    const img = await loadImage(image);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;

    let array = get2dArray(pixels, img.width);

    let width = (img.width - 39) / 26;
    let height = (img.height - 106) / 26;

    const userfield = getUserField(array, width, height);
    return [userfield, width, height];
}

function fldto1d(field){
    let fld = [];
    for (let i = 0; i < field.length; i++){
        for (let j = 0; j < field[0].length; j++){
            fld.push(field[i][j]);
        }
    }
    return fld;
}
function oneDtoFld(dfield, width){
    const height = dfield.length / width
    let fld = Array.from({length: height}, () => Array.from({length: width}, () => null));
    for (let cell = 0; cell < dfield.length; cell++) {
        const row = Math.floor(cell / width);
        const col = cell % width;
        fld[row][col] = dfield[cell];
    }
    return fld;
}
function getNei(cell, width, height){
    let mas;
    if (Math.floor(cell / width) === 0)
    {
        if (cell === 0)
        {
            mas = [1, width, width + 1];
        }
        else if (cell === width - 1)
        {
            mas = [cell - 1, cell - 1 + width, cell + width];
        }
        else
        {
            mas = [cell - 1, cell + 1, cell - 1 + width, cell + width, cell + 1 + width];
        }
    }
    else if (Math.floor(cell / width) === height - 1)
    {
        if (cell === (height - 1) * width)
        {
            mas = [cell - width, cell - width + 1, cell + 1];
        }
        else if (cell === height * width - 1)
        {
            mas = [cell - 1, cell - width - 1, cell - width];
        }
        else
        {
            mas = [cell - 1, cell + 1, cell - width + 1, cell - width - 1, cell - width];
        }
    }
    else
    {
        if (cell % width === 0)
        {
            mas = [cell - width, cell - width + 1, cell + 1, cell + width, cell + width + 1];
        }
        else if (cell % width === width - 1)
        {
            mas = [cell - width - 1, cell - width, cell - 1, cell + width - 1, cell + width];
        }
        else
        {
            mas = [cell - width - 1, cell - width, cell - width + 1, cell - 1, cell + 1, cell + width - 1, cell + width, cell + width + 1];
        }
    }
    return mas;
}
function getNumCount(cell, dfield, width){
    let count = 0;
    const height = dfield.length / width;
    let mas = [];
    mas = getNei(cell, width, height);
    mas.forEach(nei => {
        if (dfield[nei] !== 10 && dfield[nei] !== 9)
            count++;
    });
    return count;
}
function getFlagCount(cell, dfield, width){
    let count = 0;
    const height = dfield.length / width;
    let mas = [];
    mas = getNei(cell, width, height);
    mas.forEach(nei => {
        if (dfield[nei] === 10)
            count++;
    });
    return count;
}
function getClosedCount(cell, dfield, width){
    let count = 0;
    const height = dfield.length / width;
    let mas = [];
    mas = getNei(cell, width, height);
    mas.forEach(nei => {
        if (dfield[nei] === 9)
            count++;
    });
    return count;
}

export default function ProbCalc(){
    const [height, setHeight] = useState("16");
    const [width, setWidth] = useState("30");
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [dfield, setDField] = useState(Array.from({length: 30 * 16}, () => null));
    const [minesleft, setMinesleft] = useState("99");
    const [imageUrl, setImageUrl] = useState("");
    let mines;
    const [wasm, setWasm] = useState(null);

    useEffect(() => {
        Gen().then(setWasm);
    }, []);
    
    const urlPaste = async () => {
        if (!imageUrl) return;
    
        try {
            const response = await fetch(imageUrl, { mode: "cors" });
            if (!response.ok) throw new Error("Couldn't upload image");
    
            const blob = await response.blob();
            if (!blob.type.startsWith("image/")) {
                return;
            }
    
            const imageData = await readFile(blob);
            const [userfield, w, h] = await processImage(imageData);
            const duserfield = fldto1d(userfield);
            setField(userfield);
            setDField(duserfield);
            setWidth(w);
            setHeight(h);
            setImageUrl("");
        } catch (error) {
            console.error(error);
        }
    };
    function make1dGroup(uo, bc, uochecked=0, bcchecked=0){
        for (let u = uochecked; u < uo.length; u++){
            let neis = getNei(uo[u], width, height);
            neis.forEach(nei => {
                if (dfield[nei] < 9){
                    if (!bc.includes(nei)){
                        bc.push(nei);
                    }
                }
            });
            uochecked += 1;
        }
        for (let b = bcchecked; b < bc.length; b++){
            let neis = getNei(bc[b], width, height);
            neis.forEach(nei => {
                if (dfield[nei] === 9){
                    if (!uo.includes(nei)){
                        uo.push(nei);
                    }
                }
            });
            bcchecked += 1;
        }
        if (bcchecked === bc.length && uochecked === uo.length){
            return [uo, bc];
        }
        return make1dGroup(uo, bc, uochecked, bcchecked);
    }
    function make1dGroups(unopenedCells, borderCells){
        if (unopenedCells.length === 0)
            throw new Error();
        let gs = [];
        let uogroupsLength = 0;
        while (uogroupsLength < unopenedCells.length){
            let uoStart;
            if (gs.length !== 0){
                let quit;
                for (let uoc = 0; uoc < unopenedCells.length; uoc++){
                    quit = false;
                    for (let g = 0; g < gs.length; g++){
                        for (let uog = 0; uog < gs[g][0].length; uog++){
                            if (gs[g][0][uog] === unopenedCells[uoc]){
                                quit = true;
                                break;
                            }
                        }
                        if (quit){
                            break;
                        }
                    }
                    if (!quit){
                        uoStart = unopenedCells[uoc];
                        break;
                    }
                }
            }
            else {
                uoStart = unopenedCells[0];
            }
            let uo = [uoStart];
            let bc = [];
            
            let [uogroup, bcgroup] = make1dGroup(uo, bc);
            for (let bc = 0; bc < bcgroup.length; bc++){
                for (let border = 0; border < borderCells.length; border++){
                    if (bcgroup[bc] === borderCells[border][0]){
                        bcgroup[bc] = [bcgroup[bc], borderCells[border][1]];
                        break;
                    }
                }
            }
            uogroupsLength += uogroup.length;
            gs.push([uogroup.sort((a, b) => a - b), bcgroup]);
        }
        return gs;
    }
    async function calc1d(){
        console.time("1d");
        let groups;
        const [unopened, borders] = get1dData();
        try {
            groups = make1dGroups(unopened, borders);
        }
        catch{ console.timeEnd("1d"); return; }
        let combsAll = [];
        let localsAll = [];
        let allAreNumbers = true;
        for (let group = 0; group < groups.length; group++){
            let [unopenedCells, borderCells] = groups[group];
            if (unopenedCells.length > 53) allAreNumbers = false; 
            const [combs, localToGlobal] = await findCombs(unopenedCells, borderCells, unopened);
            combsAll.push(combs);
            localsAll.push(localToGlobal);
        }

        const dfldVec = new wasm.vectorUint8_t();
        dfield.forEach(cell => {
            dfldVec.push_back(cell);
        });
        const loclsVec = new wasm.vectorVectorUint8_t();
        localsAll.forEach(local => {
            const loc = new wasm.vectorUint8_t();
            local.forEach(cell => {
                loc.push_back(cell);
            });
            loclsVec.push_back(loc);
        });
        const globuoVec = new wasm.vectorUint16_t();
        unopened.forEach(cell => {
            globuoVec.push_back(cell);
        });
        
        const dfld = [];
        if (allAreNumbers) {
            const maskGroupsVec = new wasm.VectorVectorUint64_t();
            combsAll.forEach(group => {
                const grp = new wasm.vectorUint64_t();
                group.forEach(cell => {
                    grp.push_back(cell);
                });
                maskGroupsVec.push_back(grp);
            });
            const dretarray = wasm['calculateNumber'](maskGroupsVec, loclsVec, dfldVec, Number(width), Number(height), Number(mines), globuoVec);
            
            for (let i = 0; i < dretarray.size(); i++){
                dfld[i] = dretarray.get(i);
            }
        }
        else {

        }
        console.timeEnd("1d");
        setField(oneDtoFld(dfld, width));
    }
    function get1dData() {
        let unopened = [];
        let borders = [];
        let flags = 0;
        for (let cell = 0; cell < dfield.length; cell++){
            if (dfield[cell] === 9 && getNumCount(cell, dfield, width) > 0){
                unopened.push(cell);
            }
            else if (dfield[cell] !== 9 && dfield[cell] !== 10 && getClosedCount(cell, dfield, width) > 0){
                borders.push([cell, Number(dfield[cell] - getFlagCount(cell, dfield, width))]);
            }
            else if (dfield[cell] === 10){
                flags++;
            }
        }
        mines = minesleft - flags;
        return [unopened, borders];
    }
    async function findCombs(unopenedCells, borderCells, globalUo) {
        let combinations = [];
    
        const localToGlobalBit = new Uint8Array(unopenedCells.length);
        const cellToBit = new Map();
        unopenedCells.forEach((cell, i) => {
            localToGlobalBit[i] = globalUo.indexOf(cell);
            cellToBit.set(cell, i);
        });

        let min = 0;
        const borderInfo = [];
        const seen = new Set();
        for (const [index, number] of borderCells){
            if (number > min) min = number;
            const neighbors = getNei(index, width, height);
            let mask = 0;
            for (const nei of neighbors) {
                const bit = cellToBit.get(nei);
                if (bit !== undefined){
                    mask |= 1 << bit;
                }
            }
            if (!seen.has(mask)){
                seen.add(mask);
                borderInfo.push({mask, number});
            }
        }

        if (unopenedCells.length <= 25) {
            const popCountCache = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                popCountCache[i] = (i & 1) + popCountCache[i >> 1];
            }
            function countBits(n) {
                return (
                    popCountCache[n & 255] +
                    popCountCache[(n >> 8) & 255] +
                    popCountCache[(n >> 16) & 255] +
                    popCountCache[(n >> 24) & 255]
                );
            }
            const limit = 1 << unopenedCells.length;
            for (let mask = 0; mask < limit; mask++){
                const bits = countBits(mask);
                if (bits > mines || bits < min) continue;
                let valid = true;
                for (const { mask: m, number } of borderInfo) {
                    const overlap = mask & m;
                    if (countBits(overlap) !== number){
                        valid = false;
                        break;
                    }
                }
                if (valid){
                    combinations.push(mask);
                }
            }
        }
        else {
            const limit = (2**unopenedCells.length) - 1;
            const threadscount = 4;
            const rangeSize = Math.floor(limit / threadscount) + 1;
            const promises = [];

            for (let i = 0; i < threadscount; i++){
                const start = i * rangeSize;
                const end = start + rangeSize - 1;
                const worker = createWorker();
                const promise = new Promise((resolve, reject) => {
                    worker.onmessage = (e) => {
                        worker.terminate();
                        resolve(e.data);
                    };
                    worker.onerror = (err) => {
                        worker.terminate();
                        reject(err);
                    };
                });
                worker.postMessage([start, end, min, mines, borderInfo, unopenedCells.length]);
                promises.push(promise);
            }
            try {
                const results = await Promise.all(promises);
                combinations = results.flat();
                console.log("Done", combinations.length);
            }
            catch (err) {
                console.error("Error in Worker: ", err);
            }
        }
        return [combinations, localToGlobalBit];
    }
    return (
        <div className="probCalc">
            <div className="pasteItems">
                <div className="button" onClick={urlPaste}>Paste</div>
                <input value={imageUrl} type="text" placeholder="Paste screenshot URL" onChange={(e) => setImageUrl(e.target.value)}/>
            </div>
            <div className="fieldItems">
                <div className="button" onClick={calc1d}>Probs</div>
                <input readOnly value={width} type="text"/>
                <input readOnly value={height} type="text"/>
                <input value={minesleft} type="text" onChange={(e) => setMinesleft(e.target.value)}/>
            </div>
            <Grid field={field}/>
        </div>
    );
}