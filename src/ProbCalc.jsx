import {useEffect, useState} from "react";
import "./ProbCalc.css";
import Grid from "./Grid";
import Calc from './calc.mjs';

/**
 * Color constants for identifying different cell types in minesweeper screenshots
 * Each color is represented as [R, G, B, A] array
 */
const CELL_COLORS = {
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

/**
 * Converts a 1D pixel data array into a 2D array of RGBA values
 * @param {Uint8ClampedArray} pixelData - The raw pixel data from canvas
 * @param {number} imageWidth - Width of the image in pixels
 * @returns {Array<Array<Array<number>>>} 2D array of pixels with RGBA values
 */
function convertPixelDataTo2dArray(pixelData, imageWidth) {
    let resultArray = [];
    let currentRow = [];
    
    for (let i = 0; i < pixelData.length; i += 4) {
        currentRow.push([pixelData[i], pixelData[i+1], pixelData[i+2], pixelData[i+3]]);
        
        if ((i / 4 + 1) % imageWidth === 0) {
            resultArray.push(currentRow);
            currentRow = [];
        }
    }
    
    return resultArray;
}
/**
 * Extracts minesweeper game state from screenshot pixel data
 * @param {Array<Array<Array<number>>>} pixelArray - 2D array of pixel data
 * @param {number} boardWidth - Width of the minesweeper board in cells
 * @param {number} boardHeight - Height of the minesweeper board in cells
 * @returns {Array<Array<number|null>>} 2D array representing the minesweeper board state
 * where:
 * - 0-8: Number of mines around cell
 * - 9: Closed cell
 * - 10: Flagged cell
 * - null: Unopened cell
 */
function extractMinesweeperBoardFromImage(pixelArray, boardWidth, boardHeight) {
    function doColorsMatch(pixel, colorReference) {
        return pixel[0] === colorReference[0] && 
               pixel[1] === colorReference[1] && 
               pixel[2] === colorReference[2] && 
               pixel[3] === colorReference[3];
    }
    
    // Initialize board with null values
    let minesweeperBoard = Array.from(
        {length: boardHeight}, 
        () => Array.from({length: boardWidth}, () => null)
    );
    
    // Scan the image at cell positions
    for (let j = 101; j < (boardHeight - 1) * 26 + 102; j += 26) {
        for (let i = 33; i < (boardWidth - 1) * 26 + 34; i += 26) {
            const columnIndex = (i - 33) / 26;
            const rowIndex = (j - 101) / 26;
            const currentPixel = pixelArray[j][i];
            
            if (doColorsMatch(currentPixel, CELL_COLORS.OPENED)) {
                if (doColorsMatch(pixelArray[j][i - 13], CELL_COLORS.CLOSED)) {
                    minesweeperBoard[rowIndex][columnIndex] = 9; // Empty opened cell
                }
                else if (doColorsMatch(pixelArray[j - 6][i], CELL_COLORS.SEVEN)) {
                    minesweeperBoard[rowIndex][columnIndex] = 7; // Cell with 7 mines around
                }
                else {
                    minesweeperBoard[rowIndex][columnIndex] = 0; // Generic opened cell
                }
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.ONE)) {
                minesweeperBoard[rowIndex][columnIndex] = 1;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.TWO)) {
                minesweeperBoard[rowIndex][columnIndex] = 2;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.THREE)) {
                minesweeperBoard[rowIndex][columnIndex] = 3;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.FOUR)) {
                minesweeperBoard[rowIndex][columnIndex] = 4;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.FIVE)) {
                minesweeperBoard[rowIndex][columnIndex] = 5;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.SIX)) {
                minesweeperBoard[rowIndex][columnIndex] = 6;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.EIGHT)) {
                minesweeperBoard[rowIndex][columnIndex] = 8;
            }
            else if (doColorsMatch(currentPixel, CELL_COLORS.FLAG)) {
                minesweeperBoard[rowIndex][columnIndex] = 10; // Flagged cell
            }
        }
    }
    
    return minesweeperBoard;
}
/**
 * Converts a 2D board array to a flat 1D array
 * @param {Array<Array>} board2d - 2D board representation
 * @returns {Array} Flattened 1D array of board cells
 */
function convertBoardTo1dArray(board2d) {
    let flatBoard = [];
    for (let row = 0; row < board2d.length; row++) {
        for (let col = 0; col < board2d[0].length; col++) {
            flatBoard.push(board2d[row][col]);
        }
    }
    return flatBoard;
}
/**
 * Converts a flat 1D array back to a 2D board
 * @param {Array} flatBoard - 1D array of board cells
 * @param {number} boardWidth - Width of the board
 * @returns {Array<Array>} 2D board representation
 */
function convert1dArrayToBoard(flatBoard, boardWidth) {
    const boardHeight = flatBoard.length / boardWidth;
    let board2d = Array.from(
        {length: boardHeight}, 
        () => Array.from({length: boardWidth}, () => null)
    );
    
    for (let cellIndex = 0; cellIndex < flatBoard.length; cellIndex++) {
        const row = Math.floor(cellIndex / boardWidth);
        const col = cellIndex % boardWidth;
        board2d[row][col] = flatBoard[cellIndex];
    }
    
    return board2d;
}

/**
 * Minesweeper Probability Calculator Component
 * Analyzes screenshots to extract minesweeper boards and calculates mine probabilities
 */
export default function ProbCalc(){
    const [boardWidth, setBoardWidth] = useState(30);
    const [boardHeight, setBoardHeight] = useState(16);
    const [board2d, setBoard2d] = useState(
        Array.from({length: 16}, () => Array.from({length: 30}, () => null))
    );
    const [boardFlat, setBoardFlat] = useState(Array.from({length: 30 * 16}, () => null));
    const [totalMines, setTotalMines] = useState("99");
    const [screenshotUrl, setScreenshotUrl] = useState("");
    const [calculationModule, setCalculationModule] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Load WASM calculation module on component mount
    useEffect(() => {
        Calc().then(setCalculationModule);
    }, []);
    
    /**
     * Processes a minesweeper screenshot from URL and extracts the board state
     */
    async function processScreenshotFromUrl() {
        if (!screenshotUrl) return;
        
        try {
            // Fetch the image from URL
            const response = await fetch(screenshotUrl, { mode: "cors" });
            if (!response.ok) return;
    
            const blob = await response.blob();
            if (!blob.type.startsWith("image/")) return;
            
            // Convert blob to base64 image
            const reader = new FileReader();
            const imageBase64 = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(blob);
            });

            // Load the image
            const img = new Image();
            const imageLoaded = new Promise(resolve => {
                img.onload = () => resolve();
            });
            img.src = imageBase64;
            await imageLoaded;

            // Extract pixel data from image
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const pixelData = ctx.getImageData(0, 0, img.width, img.height).data;

            // Process the pixel data to extract board state
            const pixelArray = convertPixelDataTo2dArray(pixelData, img.width);
            const extractedWidth = (img.width - 39) / 26;
            const extractedHeight = (img.height - 106) / 26;
            const extractedBoard = extractMinesweeperBoardFromImage(pixelArray, extractedWidth, extractedHeight);
            const flattenedBoard = convertBoardTo1dArray(extractedBoard);

            // Update component state with extracted board data
            setBoard2d(extractedBoard);
            setBoardFlat(flattenedBoard);
            setBoardWidth(extractedWidth);
            setBoardHeight(extractedHeight);
            setScreenshotUrl("");
            setErrorMessage(null);
        } catch (error) {
            console.error(error);
        }
    }
    
    /**
     * Calculates mine probabilities using the WASM calculation module
     */
    function calculateProbabilities() {
        if (Number(totalMines) > 0 && 
            boardFlat[0] !== null && 
            Number(totalMines) <= boardFlat.length) {
            try {
                console.time("calculation-time");
                
                // Create vector for WASM module
                const boardVector = new calculationModule.vectorUint8_t();
                boardFlat.forEach(cell => {
                    boardVector.push_back(cell);
                });
                
                // Call WASM calculation function
                const resultVector = calculationModule['probabilities'](
                    boardVector, 
                    boardWidth, 
                    boardHeight, 
                    Number(totalMines)
                );

                // Check for error code returned as single value
                if (resultVector.size() == 1) throw new Error(resultVector.get(0));

                // Extract calculated results
                let calculatedBoard = [];
                for (let i = 0; i < resultVector.size(); i++) {
                    calculatedBoard[i] = resultVector.get(i);
                }
                
                console.timeEnd("calculation-time");
                setBoard2d(convert1dArrayToBoard(calculatedBoard, boardWidth));
            }
            catch (e) {
                if (e.message == 20) {
                    setErrorMessage("Too many tiles for calculation");
                }
                else if (e.message == 21) {
                    setErrorMessage("There is nothing to calculate");
                }
                console.timeEnd("calculation-time");
            }
        }
    }
    
    return (
        <div className="probCalc">
            <div className="pasteItems">
                <div className="button" onClick={processScreenshotFromUrl}>Paste</div>
                <input 
                    value={screenshotUrl} 
                    type="text" 
                    placeholder="Paste screenshot URL" 
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                />
            </div>
            <div className="fieldItems">
                <div className="button" onClick={calculateProbabilities}>Probs</div>
                <input readOnly value={boardWidth} type="text"/>
                <input readOnly value={boardHeight} type="text"/>
                <input 
                    value={totalMines} 
                    type="text" 
                    onChange={(e) => setTotalMines(e.target.value)}
                />
            </div>
            <span 
                id="warning" 
                style={{display: errorMessage ? "block" : "none"}}
            >{errorMessage}</span>
            <Grid field={board2d}/>
        </div>
    );
}