import './Grid.css';
import React, {useCallback, useEffect, useRef} from 'react';

function Grid({width, height, field, id, OnCell, mine}) {
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
            let classname;
            if (typeof field[row][col] === 'number'){
                classname = 'cellprob';
                if (field[row][col] === 0){
                    classname += " zeroprob";
                }
                else if (field[row][col] < 15){
                    classname += " lowprob";
                }
                else if (field[row][col] < 50){
                    classname += " medprob";
                }
                else if (field[row][col] < 99){
                    classname += " highprob";
                }
                else if (field[row][col] === 100) {
                    classname += " mineprob";
                }
            }
            else {
                classname = `cell${field[row][col]}`;
            }
            
            if (mine !== null){
                if (mine[0] === row && mine[1] === col && id === 1){
                    classname += " redcell";
                } 
            }
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
                <span className={classname}>
                    {content}
                </span>
            </div>);
        }));
    return <div ref={gridRef} className='grid' id={`field${id}`} style={{gridTemplateColumns: `repeat(${height}, 30px)`, gridTemplateRows: `repeat(${width}, 30px)`, width: 'fit-content'}}>{rows}</div>
}

export default Grid;