import React, {useEffect, useState} from "react";
import "./ProbCalc.css";
import Grid from "./Grid";
import Calc from "./calc.mjs";

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
            fld.push(Number(field[i][j]));
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

export default function ProbCalc(){
    const [height, setHeight] = useState("16");
    const [width, setWidth] = useState("30");
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [dfield, setDField] = useState(Array.from({length: 30 * 16}, () => null));
    const [minesleft, setMinesleft] = useState("99");
    const [imageUrl, setImageUrl] = useState("");
    const [wasm, setWasm] = useState(null);

    useEffect(() => {
        Calc().then(setWasm);
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
    const calc1d = async () => {
        const uint8darr = new wasm.vectorUint8_t();
        dfield.forEach(cell => {
            uint8darr.push_back(cell);
        });
        console.time("1d");
        const dretarray = wasm['calculate'](uint8darr, width, height, Number(minesleft));
        const dfld = [];
        for (let i = 0; i < dretarray.size(); i++){
            dfld[i] = dretarray.get(i);
        }
        console.timeEnd("1d");
        setField(oneDtoFld(dfld, width));
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