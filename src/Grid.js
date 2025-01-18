import './Grid.css';
import React, {useEffect, useRef} from 'react';

function Grid({width, height, field, id, OnCell}) {
    const gridRef = useRef(null);
    useEffect(() => {
        const disable = (e) => e.preventDefault();
        const grid = gridRef.current;
        if (grid)
          grid.addEventListener('contextmenu', disable);
        return () => {
          if (grid)
            grid.removeEventListener('contextmenu', disable);
        };  
    });
    
    const rows = Array.from({length: width}, (_, row) => 
        Array.from({length: height}, (_, col) => {
            let content = '';
            if (field[row][col] !== "0" && field[row][col] !== "C")
            {
                if (field[row][col] === "F")
                    content = "⚐";
                else if (field[row][col] === "M")
                    content = "✪";
                else
                    content = field[row][col];
            }
            return (
            <div key={`${row}-${col}`} className='cell' onMouseDown={(e) => {OnCell(row, col, e.button)}}>
                <span className={`cell${field[row][col]}`}>
                    {content}
                </span>
            </div>);
        }));
    return <div ref={gridRef} className='grid' id={`field${id}`} style={{gridTemplateColumns: `repeat(${height}, 30px)`, gridTemplateRows: `repeat(${width}, 30px)`, width: 'fit-content'}}>{rows}</div>
}

export default Grid;