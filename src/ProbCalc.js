import React, {useState} from "react";
import "./ProbCalc.css";
import Grid from "./Grid";

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
                    userfield[h][w] = "C";
                }
                else if (JSON.stringify(array[j - 6][i]) === JSON.stringify([0, 0, 0, 255])) {
                    userfield[h][w] = "7";
                }
                else {
                    userfield[h][w] = "0";
                }
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 0, 247, 255])){
                userfield[h][w] = "1";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 119, 0, 255])){
                userfield[h][w] = "2";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([236, 0, 0, 255])){
                userfield[h][w] = "3";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 0, 128, 255])){
                userfield[h][w] = "4";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([128, 0, 0, 255])){
                userfield[h][w] = "5";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([0, 128, 128, 255])){
                userfield[h][w] = "6";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([112, 112, 112, 255])){
                userfield[h][w] = "8";
            }
            else if (JSON.stringify(pixel) === JSON.stringify([100, 100, 100, 255])){
                userfield[h][w] = "F";
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
function oneDarrayToCellArray(darray, width){
    let arr = Array.from({length: darray.length}, () => null);
    for (let cell = 0; cell < darray.length; cell++){
        const row = Math.floor(darray[cell] / width);
        const col = darray[cell] % width;
        arr[cell] = [row, col];
    }
    return arr;
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
        if (dfield[nei] !== "F" && dfield[nei] !== "C")
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
        if (dfield[nei] === "F")
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
        if (dfield[nei] === "C")
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
    const [floatingtiles, setFloatingtiles] = useState([]);
    let mines;

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
                if (Number(dfield[nei]) > 0){
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
                if (dfield[nei] === "C"){
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
    function calc1d(){
        let fld = [...dfield];
        console.time("1d");
        let groups;
        const [unopened, borders] = get1dData();
        try {
            groups = make1dGroups(unopened, borders);
        }
        catch{ console.timeEnd("1d"); return; }
        let combsAll = [];
        let localsAll = [];
        for (let group = 0; group < groups.length; group++){
            let [unopenedCells, borderCells] = groups[group];
            const [combs, localToGlobal] = findCombs(unopenedCells, borderCells, unopened);
            combsAll.push(combs);
            localsAll.push(localToGlobal);
        }
        if (groups.length > 0) {
            let combinations = genCombs(combsAll, mines, localsAll);
            let fltiles = [];
            let closedtiles = 0;
            for (let cell = 0; cell < dfield.length; cell++){
                if (dfield[cell] === "C"){
                    closedtiles++;
                    if (getNumCount(cell, dfield, width) === 0){
                        fltiles.push(cell);
                    }
                }
            }

            const density = mines / closedtiles;
            const mvalue = (1 - density) / density;
            let maxcount = 0;
            combinations.values().forEach(len => {
                if (len > maxcount) maxcount = len;
            });
            const floatingtiles = closedtiles - unopened.length;

            let combs = new Map();
            let sumweights = 0;
            let sumweightsFl = 0;
            let weightsFl = 0;
            function C(fl, m){
                let result = 1;
                for (let i = 0; i < m; i++){
                    result = result * (fl - i) / (i + 1);
                }
                return result;
            }
            for (const entry of combinations) {
                const weight = 1 * (mvalue**(maxcount-entry[1]));
                sumweights += weight;
                const flCount = weight * C(floatingtiles, mines - entry[1]);
                sumweightsFl += flCount;
                weightsFl += flCount * (mines - entry[1]) / floatingtiles;
                combs.set(entry[0], [entry[1], weight]);
            }
            const flProb = weightsFl / sumweightsFl;
            fltiles.forEach(tile => {
                fld[tile] = Math.floor(flProb * 100);
            });
            for (let uo = 0; uo < unopened.length; uo++) {
                let weights = 0;
                for (const combo of combs) {
                    if ((combo[0] >> BigInt(uo)) & 1n) {
                        weights += combo[1][1];
                    }
                }
                fld[unopened[uo]] = Math.floor(weights / sumweights * 100);
            }
            setDField(fld);
            let fi = oneDtoFld(fld, width);
            console.timeEnd("1d");
            setField(fi);
            setFloatingtiles(oneDarrayToCellArray(fltiles, width));
        }
    }
    function get1dData() {
        let unopened = [];
        let borders = [];
        let flags = 0;
        for (let cell = 0; cell < dfield.length; cell++){
            if (dfield[cell] === "C" && getNumCount(cell, dfield, width) > 0){
                unopened.push(cell);
            }
            else if (dfield[cell] !== "C" && dfield[cell] !== "F" && getClosedCount(cell, dfield, width) > 0){
                borders.push([cell, Number(dfield[cell] - getFlagCount(cell, dfield, width))]);
            }
            else if (dfield[cell] === "F"){
                flags++;
            }
        }
        mines = minesleft - flags;
        return [unopened, borders];
    }
    function findCombs(unopenedCells, borderCells, globalUo) {
        const combinations = [];
    
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

        return [combinations, localToGlobalBit];
    }
    function genCombs(maskGroups, maxMines, localsAll) {
        const result = new Map();

        const cachedGroups = maskGroups.map((group, i) => {
            const localToGlobal = localsAll[i];
            return group.map(localMask => {
                let globalMask = 0n;
                let count = 0;
                for (let j = 0; j < localToGlobal.length; j++) {
                    if ((localMask >> j) & 1) {
                        globalMask |= 1n << BigInt(localToGlobal[j]);
                        count++;
                    }
                }
                return { mask: globalMask, count };
            });
        });
    
        function backtrack(index, currentMask, usedMines) {
            if (usedMines > maxMines) return;
    
            if (index === cachedGroups.length) {
                result.set(currentMask, usedMines);
                return;
            }
    
            for (const { mask, count } of cachedGroups[index]) {
                backtrack(index + 1, currentMask | mask, usedMines + count);
            }
        }
    
        backtrack(0, 0n, 0);
        return result;
    }
    return (
        <div className="probCalc">
            <div className="pasteItems">
                <button type="button" onClick={urlPaste}>Paste</button>
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL"/>
            </div>
            <div className="fieldItems">
                <button type="button" onClick={calc1d}>Probs</button>
                <input style={{width: "50px"}} value={width} type="text" onChange={(e) => setWidth(e.target.value)}/>
                <input style={{width: "50px"}} value={height} type="text" onChange={(e) => setHeight(e.target.value)} />
                <input style={{width: "50px"}} value={minesleft} type="text" onChange={(e) => setMinesleft(e.target.value)} />
            </div>
            <Grid field={field} fl={floatingtiles} />
        </div>
    );
}