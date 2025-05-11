import './Grid.css';
import {useEffect, useRef} from 'react';

/**
 * Grid component for rendering the minesweeper board
 * 
 * @param {Array<Array<Number>>} field - 2D array representing the minesweeper board state where:
 * - 0-8: Number of mines around cell
 * - 9: Closed cell
 * - 10: Flagged cell
 * - 50-150: UnopenedCell with mine probability (value - 50 = probability percentage)
 * - 151+: FloatingTile with mine probability (value - 151 = probability percentage)
 * @returns {JSX.Element} Rendered grid component
 */
export default function Grid({field}) {
    const boardHeight = field.length;
    const boardWidth = field[0].length;
    const gridRef = useRef(null);
    
    // Disable right-click context menu on the grid
    useEffect(() => {
        const preventContextMenu = (event) => event.preventDefault();
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
    function getCellDisplayProperties(cellValue) {
        let content = '';
        let baseClassName;
        let probabilityClassName = null;
        
        // Handle probability cells (50-151+)
        if (cellValue >= 50) {
            baseClassName = 'cellprob';
            
            // Assign probability-specific class names based on value ranges
            if (cellValue >= 151) {
                probabilityClassName = "flprob"; // Floating tiles probability
                content = cellValue - 151;  // Display percentage
            } else if (cellValue === 50) {
                probabilityClassName = "zeroprob"; // 0% probability
                content = cellValue - 50;  // Display percentage
            } else if (cellValue < 70) {
                probabilityClassName = "lowprob"; // Low probability
                content = cellValue - 50;  // Display percentage
            } else if (cellValue < 116) {
                probabilityClassName = "medprob"; // Medium probability
                content = cellValue - 50;  // Display percentage
            } else if (cellValue <= 149) {
                probabilityClassName = "highprob"; // High probability
                content = cellValue - 50;  // Display percentage
            } else if (cellValue === 150) {
                probabilityClassName = "mineprob"; // 100% mine probability
                content = cellValue - 50;  // Display percentage
            }
        } else {
            // Regular cell classes (0-10)
            baseClassName = `cell${cellValue}`;
            
            // Set content for number cells (1-8)
            if (cellValue !== 0 && cellValue !== 9 && cellValue !== 10) {
                content = cellValue;
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