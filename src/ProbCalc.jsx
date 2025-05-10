import {useEffect, useState} from "react";
import "./ProbCalc.css";
import Grid from "./Grid";
import Calc from './calc.mjs';

const COLORS = {
    OPENED: [198, 198, 198, 255],
    CLOSED: [255, 255, 255, 255],
    FLAG: [100, 100, 100, 255],
    ONE: [0, 0, 247, 255],
    TWO: [0, 119, 0, 255],
    THREE: [236, 0, 0, 255],
    FOUR: [0, 0, 128, 255],
    FIVE: [128, 0, 0, 255],
    SIX: [0, 128, 128, 255],
    SEVEN: [0, 0, 0, 255],
    EIGHT: [112, 112, 112, 255],
};

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
    function compare(pixel, color){
        return pixel[0] == color[0] && pixel[1] == color[1] && pixel[2] == color[2] && pixel[3] == color[3];
    }
    let userfield = Array.from({length: height}, () => Array.from({length: width}, () => null) );
    for (let j = 101; j < (height - 1) * 26 + 102; j += 26){
        for (let i = 33; i < (width - 1) * 26 + 34; i += 26){
            const w = (i - 33) / 26;
            const h = (j - 101) / 26;
            const pixel = array[j][i];
            if (compare(pixel, COLORS.OPENED)){
                if (compare(array[j][i - 13], COLORS.CLOSED)){
                    userfield[h][w] = 9;
                }
                else if (compare(array[j - 6][i], COLORS.SEVEN)) {
                    userfield[h][w] = 7;
                }
                else {
                    userfield[h][w] = 0;
                }
            }
            else if (compare(pixel, COLORS.ONE)){
                userfield[h][w] = 1;
            }
            else if (compare(pixel, COLORS.TWO)){
                userfield[h][w] = 2;
            }
            else if (compare(pixel, COLORS.THREE)){
                userfield[h][w] = 3;
            }
            else if (compare(pixel, COLORS.FOUR)){
                userfield[h][w] = 4;
            }
            else if (compare(pixel, COLORS.FIVE)){
                userfield[h][w] = 5;
            }
            else if (compare(pixel, COLORS.SIX)){
                userfield[h][w] = 6;
            }
            else if (compare(pixel, COLORS.EIGHT)){
                userfield[h][w] = 8;
            }
            else if (compare(pixel, COLORS.FLAG)){
                userfield[h][w] = 10;
            }
        }
    }
    return userfield;
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

export default function ProbCalc(){
    const [width, setWidth] = useState(30);
    const [height, setHeight] = useState(16);
    const [field, setField] = useState(Array.from({length: 16}, () => Array.from({length: 30}, () => null) ));
    const [dfield, setDField] = useState(Array.from({length: 30 * 16}, () => null));
    const [minesleft, setMinesleft] = useState("99");
    const [imageUrl, setImageUrl] = useState("");
    const [wasm, setWasm] = useState(null);

    useEffect(() => {
        Calc().then(setWasm);
    }, []);
    
    async function urlPaste() {
        if (!imageUrl) return;
        try {
            const response = await fetch(imageUrl, { mode: "cors" });
            if (!response.ok) return;
    
            const blob = await response.blob();
            if (!blob.type.startsWith("image/")) return;
            
            const reader = new FileReader();
            const imageBase64 = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(blob);
            });

            const img = new Image();
            const image = new Promise(resolve => {
                img.onload = () => resolve();
            });
            img.src = imageBase64;
            await image;

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const pixels = ctx.getImageData(0, 0, img.width, img.height).data;

            const array = get2dArray(pixels, img.width);
            const w = (img.width - 39) / 26;
            const h = (img.height - 106) / 26;
            const userfield = getUserField(array, w, h);
            const duserfield = fldto1d(userfield);

            setField(userfield);
            setDField(duserfield);
            setWidth(w);
            setHeight(h);
            setImageUrl("");
        } catch (error) {
            console.error(error);
        }
    }
    function calc1d(){
        if (Number(minesleft) > 0) {
            console.time("1d");
            const dfldVec = new wasm.vectorUint8_t();
            dfield.forEach(cell => {
                dfldVec.push_back(cell);
            });

            const dretarray = wasm['calc'](dfldVec, width, height, Number(minesleft));
            
            let dfld = [];
            for (let i = 0; i < dretarray.size(); i++){
                dfld[i] = dretarray.get(i);
            }
            console.timeEnd("1d");
            setField(oneDtoFld(dfld, width));
        }
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