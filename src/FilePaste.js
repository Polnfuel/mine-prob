import React, {useState} from "react";
import "./FilePaste.css";
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
function getNeighbors(cell, field){
    let mas = [];
    let neis = [];
    const x = cell[0];
    const y = cell[1];
    mas = [[x-1, y-1], [x, y-1], [x+1, y-1], [x-1, y], [x+1, y], [x-1, y+1], [x, y+1], [x+1, y+1]];
    mas.forEach(coord => {
        if (coord[0] >= 0 && coord[1] >= 0 && coord[0] < field.length && coord[1] < field[0].length){
            neis.push(coord);
        }
    });
    return neis;
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
function findValidBombCombinations(unopenedCells, borderCellsWithNumbers, minesleft) {
    const combinations = [];

    function isCombinationValid(bombCombination) {
        for (const [x, y, number] of borderCellsWithNumbers) {
            let bombCount = 0;
            for (const [bx, by] of bombCombination) {
                if (
                    (bx >= x - 1 && bx <= x + 1) &&
                    (by >= y - 1 && by <= y + 1)
                ) {
                    bombCount++;
                }
            }
            if (bombCount !== number) return false;
        }
        return true;
    }

    function backtrack(index, currentCombination, remainingMines) {
        if (currentCombination.length > minesleft) return; 
        
        if (index === unopenedCells.length) {
            if (isCombinationValid(currentCombination)) {
                combinations.push([...currentCombination]);
            }
            return;
        }

        if (remainingMines > 0) {
            currentCombination.push(unopenedCells[index]);
            backtrack(index + 1, currentCombination, remainingMines - 1);
            currentCombination.pop();
        }
        
        backtrack(index + 1, currentCombination, remainingMines);
    }

    backtrack(0, [], minesleft);
    return combinations;
}
function GetFlagCount(i, j, field){
    let count = 0;
    let mas = [];
    mas = [[i-1, j-1], [i, j-1], [i+1, j-1], [i-1, j], [i+1, j], [i-1, j+1], [i, j+1], [i+1, j+1]];
    mas.forEach(coord => {
        if (coord[0] >= 0 && coord[1] >= 0 && coord[0] < field.length && coord[1] < field[0].length){
            if (field[coord[0]][coord[1]] === "F"){
                count++;
            }
        }
    });
    return count;
}
function GetNumbersCount(i, j, field){
    let count = 0;
    let mas = [];
    mas = [[i-1, j-1], [i, j-1], [i+1, j-1], [i-1, j], [i+1, j], [i-1, j+1], [i, j+1], [i+1, j+1]];
    mas.forEach(coord => {
        if (coord[0] >= 0 && coord[1] >= 0 && coord[0] < field.length && coord[1] < field[0].length){
            if (field[coord[0]][coord[1]] !== "F" && field[coord[0]][coord[1]] !== "C"){
                count++;
            }
        }
    });
    return count;
}
function GetClosedCount(i, j, field){
    let count = 0;
    let mas = [];
    mas = [[i-1, j-1], [i, j-1], [i+1, j-1], [i-1, j], [i+1, j], [i-1, j+1], [i, j+1], [i+1, j+1]];
    mas.forEach(coord => {
        if (coord[0] >= 0 && coord[1] >= 0 && coord[0] < field.length && coord[1] < field[0].length){
            if (field[coord[0]][coord[1]] === "C"){
                count++;
            }
        }
    });
    return count;
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

export default function FilePaste(){
    const [height, setHeight] = useState("16");
    const [width, setWidth] = useState("30");
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [dfield, setDField] = useState(Array.from({length: 30 * 16}, () => null));
    const [minesleft, setMinesleft] = useState("99");
    const [imageUrl, setImageUrl] = useState("");
    const [groups, setGroups] = useState([]);
    const [floatingtiles, setFloatingtiles] = useState([]);

    const urlPaste = async () => {
        if (!imageUrl) return;
    
        try {
            const response = await fetch(imageUrl, { mode: "cors" });
            if (!response.ok) throw new Error("Не удалось загрузить изображение");
    
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
            setGroups([]);
        } catch (error) {
            console.error(error);
        }
    };
    function make1dGroup(uo, bc, uochecked, bcchecked){
        for (let u = uochecked; u < uo.length; u++){
            let neis = getNei(uo[u], Number(width), Number(height));
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
            let neis = getNei(bc[b], Number(width), Number(height));
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
            return [uo, bc, uochecked, bcchecked];
        }
        else {
            [uo, bc, uochecked, bcchecked] = make1dGroup(uo, bc, uochecked, bcchecked);
            if (bcchecked === bc.length && uochecked === uo.length){
                return [uo, bc, uochecked, bcchecked];
            }
        }
    }
    function makeGroup(uo, bc, uochecked, bcchecked){
        for (let u = uochecked; u < uo.length; u++){
            let neis = getNeighbors(uo[u], field);
            neis.forEach(nei => {
                if (Number(field[nei[0]][nei[1]]) > 0){
                    let contains = false;
                    for (let b = 0; b < bc.length; b++){
                        if (nei[0] === bc[b][0] && nei[1] === bc[b][1]){
                            contains = true;
                            break;
                        }
                    }
                    if (!contains){
                        bc.push(nei);
                    }
                }
            });
            uochecked += 1;
        }
        for (let b = bcchecked; b < bc.length; b++){
            let neis = getNeighbors(bc[b], field);
            neis.forEach(nei => {
                if (field[nei[0]][nei[1]] === "C"){
                    let contains = false;
                    for (let u = 0; u < uo.length; u++){
                        if (nei[0] === uo[u][0] && nei[1] === uo[u][1]){
                            contains = true;
                            break;
                        }
                    }
                    if (!contains){
                        uo.push(nei);
                    }
                }
            });
            bcchecked += 1;
        }
        if (bcchecked === bc.length && uochecked === uo.length){
            return [uo, bc, uochecked, bcchecked];
        }
        else{
            [uo, bc, uochecked, bcchecked] = makeGroup(uo, bc, uochecked, bcchecked);
            if (bcchecked === bc.length && uochecked === uo.length){
                return [uo, bc, uochecked, bcchecked];
            }
        }
    }
    function make1dGroups(){
        const [unopenedCells, borderCells, mines] = get1dData();
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
            let uochecked = 0;
            let bcchecked = 0;
            let [uogroup, bcgroup] = make1dGroup(uo, bc, uochecked, bcchecked);
            for (let bc = 0; bc < bcgroup.length; bc++){
                for (let border = 0; border < borderCells.length; border++){
                    if (bcgroup[bc] === borderCells[border][0]){
                        bcgroup[bc] = [bcgroup[bc], borderCells[border][1]];
                        break;
                    }
                }
            }
            uogroupsLength += uogroup.length;
            gs.push([uogroup.sort((a, b) => a - b), bcgroup, mines]);
        }
        return gs;
    }
    function makeGroups(){
        const [unopenedCells, borderCells, mines] = getData();
        let gs = [];
        let uogroupsLength = 0;
        while(uogroupsLength < unopenedCells.length) {
            let uoStart;
            if (gs.length !== 0) {
                let quit;
                for (let uoc = 0; uoc < unopenedCells.length; uoc++){
                    quit = false;
                    for (let g = 0; g < gs.length; g++){
                        for (let uog = 0; uog < gs[g][0].length; uog++){
                            if (gs[g][0][uog][0] === unopenedCells[uoc][0] && gs[g][0][uog][1] === unopenedCells[uoc][1]){
                                quit = true;
                                break;
                            }
                        }
                        if (quit){
                            break;
                        }
                    }
                    if (!quit) {
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
            let uochecked = 0;
            let bcchecked = 0;
            let [uogroup, bcgroup] = makeGroup(uo, bc, uochecked, bcchecked);
            for (let bc = 0; bc < bcgroup.length; bc++){
                for (let border = 0; border < borderCells.length; border++){
                    if (bcgroup[bc][0] === borderCells[border][0] && bcgroup[bc][1] === borderCells[border][1]){
                        bcgroup[bc].push(borderCells[border][2]);
                        break;
                    }
                }
            }
            uogroupsLength += uogroup.length;
            gs.push([uogroup, bcgroup, mines]);
        }
        setGroups(gs);
        return gs;
    }
    function calc1d(){
        let fld = [...dfield];
        console.time("1d");
        const groups = make1dGroups();
        let combsAll = [];
        let localsAll = [];
        const [unopened, border, mines] = get1dData();
        console.time("combs");
        for (let group = 0; group < groups.length; group++){
            let [unopenedCells, borderCells, mines] = groups[group];
            const [combs, localToGlobal] = fff(unopenedCells, borderCells, mines, Number(width), Number(height), unopened);
            combsAll.push(combs);
            localsAll.push(localToGlobal);
        }
        console.timeEnd("combs");
        if (groups.length > 0) {
            let combinations = genCombs(combsAll, mines, localsAll);
            let fltiles = [];
            let closedtiles = 0;
            for (let cell = 0; cell < dfield.length; cell++){
                if (dfield[cell] === "C"){
                    closedtiles++;
                    if (getNumCount(cell, dfield, Number(width)) === 0){
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
            let fi = oneDtoFld(fld, Number(width));
            console.timeEnd("1d");
            setField(fi);
            setFloatingtiles(oneDarrayToCellArray(fltiles, Number(width)));
        }
    }
    function calculation(){
        let fld = field.map(row => [...row]);
        console.time("Calculation");
        const groups = makeGroups();
        let combsAll = [];
        console.time("combos");
        for (let group = 0; group < groups.length; group++){
            const [unopenedCells, borderCells, mines] = groups[group];
            const combs = findValidBombCombinations(unopenedCells, borderCells, mines);
            combsAll.push(combs);
        }
        console.timeEnd("combos");
        if (groups.length > 0){
            const [unopenedCells, borderCells, mines] = getData();
            const combine = (a, b) => {
                const result = [];
                for (const x of a) {
                    for (const y of b) {
                        const totalLength = x.reduce((sum, part) => sum + part.length, 0) + y.length;
                        if (totalLength <= mines) {
                            result.push(x.concat([y]));
                        }
                    }
                }
                return result;
            };
            let combinations = combsAll.reduce((acc, group) => {
                return combine(acc, group);
            }, [[]]).map(combination => combination.flat());

            
            let fltiles = [];
            for (let i = 0; i < fld.length; i++) {
                for (let j = 0; j < fld[0].length; j++){
                    if (fld[i][j] === "C" && GetNumbersCount(i, j, fld) === 0){
                        fltiles.push([i, j]);
                    }
                }
            }
            setFloatingtiles(fltiles);
            let closedtiles = 0;
            field.forEach(row => {
                row.forEach(cell => {
                    if (cell === "C"){
                        closedtiles++;
                    }
                });
            });
            const density = mines / closedtiles;
            const mvalue = (1 - density) / density;
            let maxcount = 0;
            combinations.forEach(combo => {
                if (combo.length > maxcount) maxcount = combo.length;
            });
            const floatingtiles = closedtiles - unopenedCells.length;

            let combs = [];
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
            combinations.forEach(combo => {
                const weight = 1 * (mvalue**(maxcount-combo.length));
                sumweights += weight;
                const flCount = weight * C(floatingtiles, mines - combo.length); 
                sumweightsFl += flCount;
                weightsFl += flCount * (mines - combo.length) / floatingtiles;
                combs.push([[...combo], weight]);
            });
            const flProb = weightsFl / sumweightsFl;
            fltiles.forEach(tile => {
                fld[tile[0]][tile[1]] = Math.floor(flProb * 100);
            });
            unopenedCells.forEach(cell => {
                let weights = 0;
                combs.forEach(combo => {
                    for (let c = 0; c < combo[0].length; c++){
                        if (combo[0][c][0] === cell[0] && combo[0][c][1] === cell[1]){
                            weights += combo[1];
                            break;
                        }
                    }
                });
                fld[cell[0]][cell[1]] = Math.floor(weights / sumweights * 100);
            });
            setField(fld);
        }
        console.timeEnd("Calculation");
    }
    function getData(){
        let unopened = [];
        let borders = [];
        let flags = 0;
        for (let row = 0; row < field.length; row++){
            for (let col = 0; col < field[0].length; col++){
                if (field[row][col] === "C" && GetNumbersCount(row, col, field) > 0){
                    unopened.push([row, col]);
                }
                if (field[row][col] !== "C" && field[row][col] !== "F" && GetClosedCount(row, col, field) > 0){
                    borders.push([row, col, Number(field[row][col])  - GetFlagCount(row, col, field)])
                }
                if (field[row][col] === "F"){
                    flags++;
                }
            }
        }
        return [unopened, borders, minesleft - flags];
    }
    function get1dData() {
        let unopened = [];
        let borders = [];
        let flags = 0;
        for (let cell = 0; cell < dfield.length; cell++){
            if (dfield[cell] === "C" && getNumCount(cell, dfield, Number(width)) > 0){
                unopened.push(cell);
            }
            else if (dfield[cell] !== "C" && dfield[cell] !== "F" && getClosedCount(cell, dfield, Number(width)) > 0){
                borders.push([cell, Number(dfield[cell] - getFlagCount(cell, dfield, Number(width)))]);
            }
            else if (dfield[cell] === "F"){
                flags++;
            }
        }
        return [unopened, borders, minesleft - flags];
    }
    function fff(unopenedCells, borderCells, minesLeft, width, height, globalUo) {
        const combinations = [];
    
        // Отображение: локальный индекс -> глобальный индекс
        const localToGlobalBit = new Uint8Array(unopenedCells.length);
        const cellToBit = new Map(); // cellIndex -> local bit
        unopenedCells.forEach((cell, i) => {
            localToGlobalBit[i] = globalUo.indexOf(cell);
            cellToBit.set(cell, i);
        });
    
        // Строим информацию по граничным клеткам
        const borderInfo = borderCells.map(([index, number]) => {
            const neighbors = getNei(index, width, height);
            let mask = 0;
            for (const nei of neighbors) {
                const bit = cellToBit.get(nei);
                if (bit !== undefined) {
                    mask |= 1 << bit;
                }
            }
            return { mask, number };
        });
    
        // Быстрая функция подсчета битов (по желанию можно кэшировать)
        const popCountCache = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            popCountCache[i] = (i & 1) + popCountCache[i >> 1];
        }

        backtrack(0, 0, 0);
    
        function countBits(n) {
            return (
                popCountCache[n & 255] +
                popCountCache[(n >> 8) & 255] +
                popCountCache[(n >> 16) & 255] +
                popCountCache[(n >> 24) & 255]
            );
        }
    
        function isValid(mask) {
            for (const { mask: m, number } of borderInfo) {
                const overlap = mask & m;
                if (countBits(overlap) !== number) return false;
            }
            return true;
        }
    
        function backtrack(index, currentMask, used) {
            if (used > minesLeft) return;
            if (index === unopenedCells.length) {
                if (isValid(currentMask)) {
                    combinations.push(currentMask);
                }
                return;
            }
    
            // С текущей клеткой как миной
            backtrack(index + 1, currentMask | (1 << index), used + 1);
    
            // Без мины
            backtrack(index + 1, currentMask, used);
        }

        return [combinations, localToGlobalBit];
    }
    function genCombs(maskGroups, maxMines, localsAll) {
        const result = new Map();

        // Предварительно переводим все локальные маски в глобальные BigInt
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
    
        // Перебираем все сочетания без пересечений
        function backtrack(index, currentMask, usedMines) {
            if (usedMines > maxMines) return;
    
            if (index === cachedGroups.length) {
                result.set(currentMask, usedMines);
                return;
            }
    
            for (const { mask, count } of cachedGroups[index]) {
                // if ((currentMask & mask) !== 0n) continue; // пересечение — пропускаем
    
                backtrack(index + 1, currentMask | mask, usedMines + count);
            }
        }
    
        backtrack(0, 0n, 0);
        return result;
    }
    return (
        <div className="filePaste">
            <div className="pasteItems">
                <button type="button" onClick={urlPaste}>Paste</button>
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL"/>
            </div>
            <div className="fieldItems">
                <button type="button" onClick={calculation}>Probs</button>
                <button type="button" onClick={calc1d}>Calc</button>
                <input style={{width: "50px"}} value={width} type="text" onChange={(e) => setWidth(e.target.value)}/>
                <input style={{width: "50px"}} value={height} type="text" onChange={(e) => setHeight(e.target.value)} />
                <input style={{width: "50px"}} value={minesleft} type="text" onChange={(e) => setMinesleft(e.target.value)} />
            </div>
            <Grid field={field} fl={floatingtiles} />
        </div>
    );
}