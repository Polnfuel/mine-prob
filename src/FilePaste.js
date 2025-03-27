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

    //console.log(array);
    const userfield = getUserField(array, width, height);
    console.log(userfield);
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
    const [height, setHeight] = useState(16);
    const [width, setWidth] = useState(30);
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [bordernums, setBordernums] = useState([]);
    const [unopened, setUnopened] = useState([]);
    const [minesleft, setMinesleft] = useState(99);
    const [imageUrl, setImageUrl] = useState("");

    useEffect(() => {
        if (width > 0 && height > 0){
            setField(Array.from({ length: height }, () =>
                Array.from({ length: width }, () => null)
              ));
        }
    }, [width, height]);

    // const handlePaste = async (event) => {
    //     const items = event.clipboardData.items;
    //     for (let item of items){
    //         if (item.type.startsWith("image/")) {
    //             const file = item.getAsFile();
    //             const imageData = await readFile(file);
    //             const userfield = await processImage(imageData, width, height);
    //             setField(userfield);
    //         }
    //     }
    // };
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
        } catch (error) {
            console.error(error);
        }
    };
    function calculate(){
        const [unopenedCells, borderCells, mines] = getData();
        console.log(unopenedCells);
        console.log(borderCells);
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
        let fld = field.map(row => [...row]);
        unopenedCells.forEach(cell => {
            let weights = 0;
            combs.forEach(combo => {
                if (combo[0].includes(cell)) {
                    weights += combo[1];
                } 
            });
            fld[cell[0]][cell[1]] = Math.floor(weights / sumweights * 100);
        });
        //console.log(fld);
        setField(fld);
    }
    function addCell(row, col, button){
        // if (field[row][col] === "C"){
        //     let mas = [...unopened];
        //     mas.push([row, col]);
        //     setUnopened(mas);
        // }
        // else if (field[row][col] !== "C"){
        //     let mas = [...bordernums];
        //     mas.push([row, col]);
        //     setBordernums(mas);
        // }
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
        //setField(fld);
    }
    function solve(){
        let fld = field.map(row => [...row]);
        fld = solveOneTime(fld);
        fld = solveOneTime(fld);
        fld = solveOneTime(fld, true);
        setField(fld);
    }
    return (
        <div className="filePaste">
            {/* <div onPaste={handlePaste} style={{border: "5px dashed gray", padding: 20, width: "500px"}}></div> */}
            <div className="pasteItems">
                <button type="button" onClick={urlPaste}>Paste</button>
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL"/>
                <button type="button" onClick={() => {setImageUrl("");}}>Clear</button>
            </div>
            <div className="fieldItems">
                <button type="button" onClick={calculate}>Probs</button>
                <input style={{width: "50px"}} value={width} type="text" onChange={(e) => {setWidth(Number(e.target.value))}}/>
                <input style={{width: "50px"}} value={height} type="text" onChange={(e) => {setHeight(Number(e.target.value))}} />
                <input style={{width: "50px"}} value={minesleft} type="text" onChange={(e) => setMinesleft(Number(e.target.value))} />
                <button type="button" onClick={solve}>Solve</button>
            </div>
            <Grid field={field} id={3} OnCell={addCell} mine={null} />
        </div>
    );
}