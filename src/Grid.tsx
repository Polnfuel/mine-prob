import './Grid.css';
import {type JSX, useEffect, useRef} from 'react';

interface Props {
    field: (number | null)[][];
}

/**
 * Grid component for rendering the minesweeper board
 * 
 * @param {Array<Array<number>>} field - 2D array representing the minesweeper board state where:
 * - 0-8: Number of mines around cell
 * - 9: Closed cell
 * - 10: Flagged cell
 * - 50-150: UnopenedCell with mine probability (value - 50 = probability percentage)
 * - 151+: FloatingTile with mine probability (value - 151 = probability percentage)
 * @returns {JSX.Element} Rendered grid component
 */
export default function Grid({field} : Props) : JSX.Element {
    const boardHeight = field.length;
    const boardWidth = field[0].length;
    const gridRef = useRef<HTMLDivElement>(null);
    
    // Disable right-click context menu on the grid
    useEffect(() => {
        const preventContextMenu = (event : Event) => event.preventDefault();
        const gridElement = gridRef.current;
        
        if (gridElement) {
            gridElement.addEventListener('contextmenu', preventContextMenu);
        }
        
        return () => {
            if (gridElement) {
                gridElement.removeEventListener('contextmenu', preventContextMenu);
            }
        };  
    });

    /**
     * Determines the CSS class name for a cell based on its value
     * 
     * @param {number} cellValue - Value of the minesweeper cell
     * @returns {Object} Object containing class name and content for the cell
     */
    function getCellDisplayProperties(cellValue : number | null) {
        let content : number | null = null;
        let baseClassName : string = `cell${cellValue}`;
        let probabilityClassName : string = "";
        
        if (cellValue !== null){
            // Handle probability cells (50-151+)
            if (cellValue >= 50) {
                baseClassName = 'cellprob';
                if (cellValue == 50 || cellValue == 150)
                    content = null;
                else
                    content = cellValue - 50;

                // Assign probability-specific class names based on value ranges
                if (cellValue >= 151) {
                    probabilityClassName = "flprob"; // Floating tiles probability
                    content = cellValue - 151;  // Display percentage
                } else if (cellValue === 50) {
                    probabilityClassName = "zeroprob"; // 0% probability
                } else if (cellValue < 70) {
                    probabilityClassName = "lowprob"; // Low probability
                } else if (cellValue < 116) {
                    probabilityClassName = "medprob"; // Medium probability
                } else if (cellValue <= 149) {
                    probabilityClassName = "highprob"; // High probability
                } else if (cellValue === 150) {
                    probabilityClassName = "mineprob"; // 100% mine probability
                }
            } else {
                // Regular cell classes (0-10)
                if (cellValue == 0 || cellValue == 9 || cellValue == 10 || cellValue == 11) {
                    content = null;
                }
                else {
                    content = cellValue;
                }
            }
        }
        
        return {
            content,
            className: baseClassName + (probabilityClassName ? ` ${probabilityClassName}` : "")
        };
    }

    // Generate grid cells
    const gridCells = Array.from({length: boardHeight}, (_, row) => 
        Array.from({length: boardWidth}, (_, col) => {
            const cellValue = field[row][col];
            const {content, className} = getCellDisplayProperties(cellValue);
            
            return (
                <div key={`${row}-${col}`} className='cell'>
                    <span className={className}>
                        {content}
                    </span>
                </div>
            );
        })
    );

    return (
        <div 
            ref={gridRef} 
            className='grid' 
            style={{
                gridTemplateColumns: `repeat(${boardWidth}, 25px)`, 
                width: 'fit-content'
            }}
        >{gridCells}</div>
    );
}