import './App.css';
import Grid from './Grid';
import React, {useState} from 'react';

function GetNeighboors(i, j, field) {
    let count = 0;
    let mas;
    if (i == 0)
        {
            if (j == 0)
            {
                mas = [ field[i + 1][j + 1], field[i][j + 1], field[i + 1][j] ];
            }
            else if (j == field[0].length - 1)
            {
                mas = [ field[i + 1][j - 1], field[i][j - 1], field[i + 1][j] ];
            }
            else
            {
                mas = [field[i + 1][j - 1], field[i][j - 1], field[i + 1][j], field[i + 1][j + 1], field[i][j + 1]];
            }
        }
        else if (i == field.length - 1)
        {
            if (j == 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j] ];
            }
            else if (j == field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j] ];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1] ];
            }
        }
        else
        {
            if (j == 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j], field[i + 1][j + 1], field[i + 1][j]];
            }
            else if (j == field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i + 1][j - 1], field[i + 1][j]];
            }
            else
            {
                mas = [ field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1], field[i + 1][j + 1], field[i + 1][j - 1], field[i + 1][j] ];
            }
        }
    mas.forEach(cell => {
        if (cell == "M"){
            count++;
        }
    });
    return count;
}

function App() {
  let [Width, setWidth] = useState(10);
  let [Height, setHeight] = useState(12);
  let [MinesCount, setMinesCount] = useState(11);
  let [curwidth, setcurwidth] = useState(10);
  let [curheight, setcurheight] = useState(12);
  let [curmines, setcurmines] = useState(11);
  let [Field, setField] = useState(Array.from({length: Height}, () => Array.from({length: Width}, () => null)));
  let [UserField, setUserField] = useState(Array.from({length: Height}, () => Array.from({length: Width}, () => null)));
  let [DField, setDField] = useState(Array.from({length: Width * Height}, () => null));
  let [GameStatus, setGameStatus] = useState(null);

  function createfield(){
    let width = curwidth;
    let height = curheight;
    let minescount = curmines;
    let field = Array.from({length: width}, () => Array.from({length: height}, () => null) );
    let mines = [];
    let newmine;
    if (minescount < width * height){
        for (let i = 0; i < minescount; i++){
            do {
                newmine = Math.floor(Math.random() * (width * height));
                mines[i] = newmine;
            } while (mines.indexOf(newmine) !=  mines.lastIndexOf(newmine));
        }
        mines.forEach(mine => {
            field[Math.floor(mine / height)][mine % height] = "M";
        });
        for (let i = 0; i < width; i++){
            for (let j = 0; j < height; j++){
                if (field[i][j] != "M"){
                    field[i][j] = String(GetNeighboors(i, j, field));
                }
            }
        }
    }
    else{
        field = new Array(width).fill(null).map(() => new Array(height).fill("M"));
    }
    setField(field);
    let userField = new Array(width).fill(null).map(() => new Array(height).fill("C"));
    setUserField(userField);
    setWidth(curwidth);
    setHeight(curheight);
    setMinesCount(curmines);
    setGameStatus("Inited");
    create1dfield(Field);
  }
  function create1dfield(field) {
    let dField = new Array(field.length * field[0].length);
      for (let i = 0; i < field.length; i++){
          for (let j = 0; j < field[0].length; j++){
              dField[i * field[0].length + j] = field[i][j];
          }
      }
    setDField(dField);
  }
  return (
    <div className="app">
      <Grid width={Width} height={Height} field={UserField}/>
      <Grid width={Width} height={Height} field={Field}/>
      <div className='forma container mt-5'>
        <form className='row g-3'>
          <div className='col-auto'>
            <input value={curwidth} onChange={(e) => setcurwidth(Number(e.target.value))} type='number' className='form-control' placeholder='Высота' />
          </div>
          <div className='col-auto'>
            <input value={curheight} onChange={(e) => setcurheight(Number(e.target.value))} type='number' className='form-control' placeholder='Ширина' />
          </div>
          <div className='col-auto'>
            <input value={curmines} onChange={(e) => setcurmines(Number(e.target.value))} type='number' className='form-control' placeholder='Кол-во мин' />
          </div>
          <div className='col-auto'>
            <button type='button' onClick={createfield}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
