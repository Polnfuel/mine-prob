import './Grid.css';
import React, {useEffect, useRef} from 'react';

function Grid({field, fl}) {
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
    function include(arr, cell){
        for (let i = 0; i < arr.length; i++){
            if (JSON.stringify(arr[i]) === JSON.stringify(cell)){
                return true;
            }
        }
        return false;
    }
    const rows = Array.from({length: width}, (_, row) => 
        Array.from({length: height}, (_, col) => {
            let content = '';
            let classname;
            if (typeof field[row][col] === 'number'){
                classname = 'cellprob';
                if (include(fl, [row, col])){
                    classname += " flprob";
                }
                else if (field[row][col] === 0){
                    classname += " zeroprob";
                }
                else if (field[row][col] < 15){
                    classname += " lowprob";
                }
                else if (field[row][col] < 50){
                    classname += " medprob";
                }
                else if (field[row][col] <= 99){
                    classname += " highprob";
                }
                else if (field[row][col] === 100) {
                    classname += " mineprob";
                }
            }
            else {
                classname = `cell${field[row][col]}`;
            }
            
            if (field[row][col] !== "0" && field[row][col] !== "C")
            {
                if (field[row][col] === "F")
                    content = "⚐";
                else
                    content = field[row][col];
            }
            return (
            <div key={`${row}-${col}`} className='cell'>
                <span className={classname}>
                    {content}
                </span>
            </div>);
        }));
    return <div ref={gridRef} className='grid' style={{gridTemplateColumns: `repeat(${height}, 30px)`, gridTemplateRows: `repeat(${width}, 30px)`, width: 'fit-content'}}>{rows}</div>
}

export default Grid;