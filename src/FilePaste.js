import React, {useEffect, useState} from "react";
import "./FilePaste.css";
import Grid from "./Grid";

function get2dArray(data, width) {
    let array = [];
    let row = [];
    for (let i = 0; i < data.length; i += 4){
        row.push([data[i], data[i+1], data[i+2], data[i+3]]);
        if ((i / 4 + 1) % width == 0){
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
            else if (JSON.stringify(pixel) === JSON.stringify([100, 100, 100, 255])){
                userfield[h][w] = "F";
            }
        }
    }
    return userfield;
}
function toone(row, col, width){
    return (row * width + col);
}
function GetNeigh(cell, field){
    let mas = [];
    let width = field[0].length;
    let height = field.length;
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
async function processImage(image, width, height) {
    const img = await loadImage(image);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const pixels = imageData.data;

    let array = get2dArray(pixels, img.width);

    const userfield = getUserField(array, width, height);
    return userfield;
}

function findValidBombCombinations(unopenedCells, borderCellsWithNumbers) {
    const combinations = [];

    // Возвращает соседние клетки для данной клетки
    function getNeighbors(cell) {
        const [x, y] = cell;
        return [
            [x - 1, y - 1], [x - 1, y], [x - 1, y + 1],
            [x, y - 1],             [x, y + 1],
            [x + 1, y - 1], [x + 1, y], [x + 1, y + 1]
        ];
    }

    // Проверяет, удовлетворяет ли текущая комбинация всем граничным клеткам
    function isCombinationValid(bombCombination) {
        for (const [x, y, number] of borderCellsWithNumbers) {
            const neighbors = getNeighbors([x, y]);
            const bombCount = neighbors.filter(neighbor =>
                bombCombination.some(bomb => bomb[0] === neighbor[0] && bomb[1] === neighbor[1])
            ).length;
            if (bombCount !== number) {
                return false; // Если число бомб не совпадает, комбинация недопустима
            }
        }
        return true;
    }

    // Рекурсивная функция для генерации комбинаций
    function backtrack(index, currentCombination) {
        if (index === unopenedCells.length) {
            if (isCombinationValid(currentCombination)) {
                combinations.push([...currentCombination]);
            }
            return;
        }

        // Рассматриваем текущую клетку как бомбу
        currentCombination.push(unopenedCells[index]);
        backtrack(index + 1, currentCombination);
        currentCombination.pop();

        // Рассматриваем текущую клетку как пустую
        backtrack(index + 1, currentCombination);
    }

    backtrack(0, []);
    return combinations;
}

function reducing(matrix, solution) {
    for (let i = 0; i < matrix.length; i++){
        if (matrix[i].at(-1) === 0){
            let nonzerocount = 0;
            let onescount = 0;
            let indeces = [];
            for (let j = 0; j < matrix[i].length - 1; j++){
                if (matrix[i][j] !== 0) {
                    nonzerocount++;
                    indeces.push(j);
                } 
                if (matrix[i][j] === 1) {
                    onescount++;
                } 
            }
            if (nonzerocount === 1){
                for (let m = 0; m < matrix.length; m++){
                    matrix[m][indeces[0]] = 0;
                }
                solution[indeces[0]] = 0;
            }
            else if (onescount === nonzerocount){
                for (let m = 0; m < matrix.length; m++){
                    for (let n = 0; n < indeces.length; n++){
                        matrix[m][indeces[n]] = 0;
                        solution[indeces[0]] = 0;
                    }
                }
            }
        }
    }
    return [matrix, solution];
}

function finding(matrix, solution) {
    for (let i = 0; i < matrix.length; i++){
        if (matrix[i].at(-1) === 1){
            let onescount = 0;
            let index = -1;
            for (let j = 0; j < matrix[i].length - 1; j++){
                if (matrix[i][j] === 1) {
                    onescount++;
                    if (index === -1){
                        index = j;
                    }
                    else {
                        break;
                    }
                }
            }
            if (onescount === 1){
                solution[index] = 1;
            }
        }
    }
    return solution;
}

function solveSystem(matrix) {
    let rows = matrix.length;
    let cols = matrix[0].length - 1;
    let zero = 0;

    // Прямой ход метода Гаусса
    for (let col = 0; col < cols; col++) {
        let pivotRow = -1;
        for (let i = zero; i < rows; i++) {
            if (matrix[i][col] !== 0) {
                pivotRow = i;
                break;
            }
        }
        if (pivotRow === -1) continue;
        
        [matrix[zero], matrix[pivotRow]] = [matrix[pivotRow], matrix[zero]];
        
        if (matrix[zero][col] !== 0) {
            for (let i = 0; i < rows; i++) {
                if (i === zero || matrix[i][col] === 0) continue;
                let factor = matrix[i][col] / matrix[zero][col];
                for (let j = col; j <= cols; j++) {
                    matrix[i][j] -= factor * matrix[zero][j];
                }
            }
            zero++;
        }
    }
    // console.log(matrix);

    let solution = Array.from({length: matrix[0].length - 1}, () => null);

    [matrix, solution] = reducing(matrix, solution);
    [matrix, solution] = reducing(matrix, solution);
    [matrix, solution] = reducing(matrix, solution);
    [matrix, solution] = reducing(matrix, solution);
    [matrix, solution] = reducing(matrix, solution);
    
    console.log(matrix);
    solution = finding(matrix, solution);
    return solution;
}

function GetFlagCount(i, j, field){
    let count = 0;
    let mas;
    if (i === 0)
        {
            if (j === 0)
            {
                mas = [ field[i + 1][j + 1], field[i][j + 1], field[i + 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [ field[i + 1][j - 1], field[i][j - 1], field[i + 1][j] ];
            }
            else
            {
                mas = [field[i + 1][j - 1], field[i][j - 1], field[i + 1][j], field[i + 1][j + 1], field[i][j + 1]];
            }
        }
        else if (i === field.length - 1)
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j] ];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1] ];
            }
        }
        else
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j], field[i + 1][j + 1], field[i + 1][j]];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i + 1][j - 1], field[i + 1][j]];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1], field[i + 1][j + 1], field[i + 1][j - 1], field[i + 1][j]];
            }
        }
    mas.forEach(cell => {
        if (cell === "F"){
            count++;
        }
    });
    return count;
}
function GetNumbersCount(i, j, field){
    let count = 0;
    let mas;
    if (i === 0)
        {
            if (j === 0)
            {
                mas = [ field[i + 1][j + 1], field[i][j + 1], field[i + 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [ field[i + 1][j - 1], field[i][j - 1], field[i + 1][j] ];
            }
            else
            {
                mas = [field[i + 1][j - 1], field[i][j - 1], field[i + 1][j], field[i + 1][j + 1], field[i][j + 1]];
            }
        }
        else if (i === field.length - 1)
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j] ];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1] ];
            }
        }
        else
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j], field[i + 1][j + 1], field[i + 1][j]];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i + 1][j - 1], field[i + 1][j]];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1], field[i + 1][j + 1], field[i + 1][j - 1], field[i + 1][j]];
            }
        }
    mas.forEach(cell => {
        if (cell !== "F" && cell != "C"){
            count++;
        }
    });
    return count;
}
function GetClosedCount(i, j, field){
    let count = 0;
    let mas;
    if (i === 0)
        {
            if (j === 0)
            {
                mas = [ field[i + 1][j + 1], field[i][j + 1], field[i + 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [ field[i + 1][j - 1], field[i][j - 1], field[i + 1][j] ];
            }
            else
            {
                mas = [field[i + 1][j - 1], field[i][j - 1], field[i + 1][j], field[i + 1][j + 1], field[i][j + 1]];
            }
        }
        else if (i === field.length - 1)
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j] ];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1] ];
            }
        }
        else
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j], field[i + 1][j + 1], field[i + 1][j]];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i + 1][j - 1], field[i + 1][j]];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1], field[i + 1][j + 1], field[i + 1][j - 1], field[i + 1][j]];
            }
        }
    mas.forEach(cell => {
        if (cell === "C"){
            count++;
        }
    });
    return count;
}

export default function FilePaste(){
    const [height, setHeight] = useState("16");
    const [width, setWidth] = useState("30");
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [bordernums, setBordernums] = useState([]);
    const [unopened, setUnopened] = useState([]);
    const [minesleft, setMinesleft] = useState(99);
    const [imageUrl, setImageUrl] = useState("");
    const [fullprobs, setFullProbs] = useState(true);
    const [groups, setGroups] = useState([]);

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
            const userfield = await processImage(imageData, width, height);
            setField(userfield);
            setImageUrl("");
            setBordernums([]);
            setUnopened([]);
            setGroups([]);
        } catch (error) {
            console.error(error);
        }
    };
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
    function calc(){
        let fld = field.map(row => [...row]);
        if (!fullprobs){
            console.time("Calc");
            if (groups.length > 0){
                for (let group = 0; group < groups.length; group++){
                    fld = calculateGroup(groups[group], fld);
                }
            }
            else {
                const groups = makeGroups();
                for (let group = 0; group < groups.length; group++){
                    fld = calculateGroup(groups[group], fld);
                }
            }
            console.timeEnd("Calc");
            setField(fld);
        }
        else if (fullprobs){
            console.time("Calc");
            fld = calculateGroup(getData(), fld);
            console.timeEnd("Calc");
            setField(fld);
        }
    }
    function calculateGroup(group, fld){
        const [unopenedCells, borderCells, mines] = group;
        //console.log(unopenedCells);
        //console.log(borderCells);
        const combinations = findValidBombCombinations(unopenedCells, borderCells);
        console.log(combinations);

        let floatingtiles = 0;
        field.forEach(row => {
            row.forEach(cell => {
                if (cell === "C"){
                    floatingtiles++;
                }
            });
        });
        //console.log(floatingtiles);
        const density = mines / floatingtiles;
        //console.log(density);
        const mvalue = (1 - density) / density;
        //console.log(mvalue);
        let maxcount = 0;
        combinations.forEach(combo => {
            if (combo.length > maxcount) maxcount = combo.length;
        });
        let combs = [];
        let sumweights = 0;
        combinations.forEach(combo => {
            const weight = 1 * (mvalue**(maxcount-combo.length));
            sumweights += weight;
            combs.push([[...combo], weight]);
        });
        //console.log(combs);
        unopenedCells.forEach(cell => {
            let weights = 0;
            combs.forEach(combo => {
                if (combo[0].includes(cell)) {
                    weights += combo[1];
                } 
            });
            fld[cell[0]][cell[1]] = Math.floor(weights / sumweights * 100);
        });
        return fld;
    }
    function division(){
        let flags = 0;
        for (let row = 0; row < field.length; row++){
            for (let col = 0; col < field[0].length; col++){
                if (field[row][col] === "F"){
                    flags++;
                }
            }
        }
        return [unopened, bordernums, minesleft - flags];
    }
    function addCell(row, col, b){
        if (field[row][col] === "C" && GetNumbersCount(row, col, field) > 0){
            let uo = [...unopened];
            if (uo.length === 0){
                uo.push([row, col]);
            }
            else{
                let includes = false;
                for (let i = 0; i < uo.length; i++){
                    if (uo[i][0] === row && uo[i][1] === col){
                        includes = true;
                    }
                }
                if (!includes){
                    uo.push([row, col]);
                }
            }
            setUnopened(uo);
        }
        else if (field[row][col] !== "C" && field[row][col] !== "F" && GetClosedCount(row, col, field) > 0){
            let b = [...bordernums];
            if (b.length === 0){
                b.push([row, col, Number(field[row][col]) - GetFlagCount(row, col, field)]);
            }
            else{
                let includes = false;
                for (let i = 0; i < b.length; i++){
                    if (b[i][0] === row && b[i][1] === col){
                        includes = true;
                    }
                }
                if (!includes){
                    b.push([row, col, Number(field[row][col]) - GetFlagCount(row, col, field)]);
                }
            }
            setBordernums(b);
        }
    }
    function newGroup(){
        if (unopened.length > 0 && bordernums.length > 0){
            let group = division();
            let gs = [...groups];
            gs.push(group);
            setGroups(gs);
            setUnopened([]);
            setBordernums([]);
        }
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
    function getSpecialData(fld) {
        let unopened = [];
        let borders = [];
        let flags = 0;
        for (let row = 0; row < fld.length; row++){
            for (let col = 0; col < fld[0].length; col++){
                if (fld[row][col] === "C" && GetNumbersCount(row, col, fld) > 0){
                    unopened.push([row, col]);
                }
                if (fld[row][col] !== "C" && fld[row][col] !== "F" && GetClosedCount(row, col, fld) > 0){
                    borders.push([row, col, Number(fld[row][col]) - GetFlagCount(row, col, fld)])
                }
                if (fld[row][col] === "F"){
                    flags++;
                }
            }
        }
        return [unopened, borders, 99 - flags];
    }
    function trivial(fld, borderCells) {
        borderCells.forEach(cell => {
            if (cell[2] === 0){
                let neigs = GetNeigh(toone(cell[0], cell[1], fld[0].length), fld);
                neigs.forEach(nei => {
                    if (fld[Math.floor(nei / fld[0].length)][nei % fld[0].length] === "C"){
                        fld[Math.floor(nei / fld[0].length)][nei % fld[0].length] = 0;
                    }
                });
            }
            else if (GetClosedCount(cell[0], cell[1], fld) === cell[2]){
                let neigs = GetNeigh(toone(cell[0], cell[1], fld[0].length), fld);
                neigs.forEach(nei => {
                    if (fld[Math.floor(nei / fld[0].length)][nei % fld[0].length] === "C"){
                        fld[Math.floor(nei / fld[0].length)][nei % fld[0].length] = "F";
                    }
                });
            }
        });
        return fld;
    }
    function solveOneTime(fld, toProb=false){
        const [unopenedCells, borderCells, mines] = getSpecialData(fld);
        console.log(unopenedCells);
        console.log(borderCells);
        fld = trivial(fld, borderCells);

        let matrix = Array.from({length: borderCells.length}, () => Array.from({length: unopenedCells.length + 1}, () => 0));
        for (let j = 0; j < borderCells.length; j++){
            let neighbors = GetNeigh(toone(borderCells[j][0], borderCells[j][1], fld[0].length), fld);
            for (let i = 0; i < unopenedCells.length; i++){
                if (neighbors.includes(toone(unopenedCells[i][0], unopenedCells[i][1], fld[0].length))){
                    matrix[j][i] = 1;
                }
            }
            matrix[j][unopenedCells.length] = borderCells[j][2];
        }

        let solution = solveSystem(matrix.map(row => [...row]));
        console.log(solution);

        if (toProb) {
            for (let i = 0; i < solution.length; i++){
                if (solution[i] === 1) {
                    fld[unopenedCells[i][0]][unopenedCells[i][1]] = 100;
                }
                if (solution[i] === 0) {
                    fld[unopenedCells[i][0]][unopenedCells[i][1]] = 0;
                }
            }
        }
        else {
            for (let i = 0; i < solution.length; i++){
                if (solution[i] === 1) {
                    fld[unopenedCells[i][0]][unopenedCells[i][1]] = "F";
                }
                if (solution[i] === 0){
                    fld[unopenedCells[i][0]][unopenedCells[i][1]] = 0;
                }
            }
        }
        return fld;
    }
    function solve(){
        let fld = field.map(row => [...row]);
        fld = solveOneTime(fld);
        fld = solveOneTime(fld);
        fld = solveOneTime(fld, true);
        setField(fld);
    }
    function setSize(){
        if (width >= 5 && height >= 5 && width <= 100 && height <= 100){
            setField(Array.from({ length: height }, () =>
                Array.from({ length: width }, () => null)
            ));
        }
        if (minesleft > width * height){
            setMinesleft(String(width * height));
        }
    }
    return (
        <div className="filePaste">
            <div className="pasteItems">
                <button type="button" onClick={urlPaste}>Paste</button>
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL"/>
            </div>
            <div className="fieldItems">
                <button type="button" onClick={calc}>Probs</button>
                <input style={{width: "50px"}} value={width} type="text" onChange={(e) => setWidth(e.target.value)}/>
                <input style={{width: "50px"}} value={height} type="text" onChange={(e) => setHeight(e.target.value)} />
                <input style={{width: "50px"}} value={minesleft} type="text" onChange={(e) => setMinesleft(e.target.value)} />
                <button type="button" onClick={setSize}>⟲</button>
            </div>
            <div className="probsItems">
                <input className="form-check-input" type="checkbox" id="probsCheckBox" checked={fullprobs} onChange={() => setFullProbs(!fullprobs)}/>
                <label className="form-check-label" htmlFor="probsCheckBox">Full Probs</label>
                <button type="button" onClick={newGroup}>+</button>
            </div>
            <Grid field={field} id={3} OnCell={addCell} mine={null} marking={[unopened, bordernums]} />
        </div>
    );
}