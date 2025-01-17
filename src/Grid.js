import './Grid.css';

function Grid({width, height, field, id}) {
    const rows = Array.from({length: width}, (_, row) => 
        Array.from({length: height}, (_, col) => {
            let content = '';
            if (field[row][col] != "0" && field[row][col] != "C")
                content = field[row][col];
            return (
            <div key={`${row}-${col}`} className='cell'>
                <span className={`cell${field[row][col]}`}>
                    {content}
                </span>
            </div>);
        }));
    return <div className='grid' id={`field${id}`} style={{gridTemplateColumns: `repeat(${height}, 30px)`, gridTemplateRows: `repeat(${width}, 30px)`}}>{rows}</div>
}

export default Grid;