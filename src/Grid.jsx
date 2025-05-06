import './Grid.css';
import React, {useEffect, useRef} from 'react';

function Grid({field}) {
    const width = field.length;
    const height = field[0].length;
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
            let probname;
            if (field[row][col] >= 50){
                classname = 'cellprob';
                if (field[row][col] >= 151){
                    probname = "flprob";
                }
                else if (field[row][col] === 50){
                    probname = "zeroprob";
                }
                else if (field[row][col] < 65){
                    probname = "lowprob";
                }
                else if (field[row][col] < 100){
                    probname = "medprob";
                }
                else if (field[row][col] <= 149){
                    probname = "highprob";
                }
                else if (field[row][col] === 150) {
                    probname = "mineprob";
                }
            }
            else {
                classname = `cell${field[row][col]}`;
            }
            
            if (field[row][col] !== 0 && field[row][col] !== 9 && field[row][col] !== 10)
            {
                if (field[row][col] >= 50 && field[row][col] <= 150){
                    content = field[row][col] - 50;
                }
                else if (field[row][col] >= 151) {
                    content = field[row][col] - 151;
                }
                else {
                    content = field[row][col];
                }
            }
            return (
            <div key={`${row}-${col}`} className='cell'>
                <span className={classname + (probname ? ` ${probname}` : "")}>
                    {content}
                </span>
            </div>);
        }));
    return <div ref={gridRef} className='grid' style={{gridTemplateColumns: `repeat(${height}, 25px)`, width: 'fit-content'}}>{rows}</div>
}

export default Grid;