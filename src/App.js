import './App.css';
import Grid from './Grid';
import React, {useEffect, useState} from 'react';

function GetNeighboors(i, j, field) {
    let count = 0;
    let mas;
    if (i === 0)
        {
            if (j === 0)
            {
                mas = [ field[i + 1][j + 1], field[i][j + 1], field[i + 1][j] ];
            }
            else if (j === field[0].length - 1)
            {
                mas = [ field[i + 1][j - 1], field[i][j - 1], field[i + 1][j] ];
            }
            else
            {
                mas = [field[i + 1][j - 1], field[i][j - 1], field[i + 1][j], field[i + 1][j + 1], field[i][j + 1]];
            }
        }
        else if (i === field.length - 1)
        {
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j] ];
            }
            else if (j === field[0].length - 1)
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
            if (j === 0)
            {
                mas = [field[i - 1][j + 1], field[i][j + 1], field[i - 1][j], field[i + 1][j + 1], field[i + 1][j]];
            }
            else if (j === field[0].length - 1)
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i + 1][j - 1], field[i + 1][j]];
            }
            else
            {
                mas = [field[i - 1][j - 1], field[i][j - 1], field[i - 1][j], field[i - 1][j + 1], field[i][j + 1], field[i + 1][j + 1], field[i + 1][j - 1], field[i + 1][j]];
            }
        }
    mas.forEach(cell => {
        if (cell === "M"){
            count++;
        }
    });
    return count;
}
function toone(row, col, width){
  return (row * width + col);
}
function GetNeigh(cell, field){
  let mas = [];
  let width = field[0].length;
  let height = field.length;
  if (Math.floor(cell / width) === 0)
    {
        if (cell === 0)
        {
            mas = [1, width, width + 1];
        }
        else if (cell === width - 1)
        {
            mas = [cell - 1, cell - 1 + width, cell + width];
        }
        else
        {
            mas = [cell - 1, cell + 1, cell - 1 + width, cell + width, cell + 1 + width];
        }
    }
    else if (Math.floor(cell / width) === height - 1)
    {
        if (cell === (height - 1) * width)
        {
            mas = [cell - width, cell - width + 1, cell + 1];
        }
        else if (cell === height * width - 1)
        {
            mas = [cell - 1, cell - width - 1, cell - width];
        }
        else
        {
            mas = [cell - 1, cell + 1, cell - width + 1, cell - width - 1, cell - width];
        }
    }
    else
    {
        if (cell % width === 0)
        {
            mas = [cell - width, cell - width + 1, cell + 1, cell + width, cell + width + 1];
        }
        else if (cell % width === width - 1)
        {
            mas = [cell - width - 1, cell - width, cell - 1, cell + width - 1, cell + width];
        }
        else
        {
            mas = [cell - width - 1, cell - width, cell - width + 1, cell - 1, cell + 1, cell + width - 1, cell + width, cell + width + 1];
        }
    }
    return mas;
}

function App() {
  let winit = 10;
  let hinit = 12;
  let minit = 15;
  let [Width, setWidth] = useState(winit);
  let [Height, setHeight] = useState(hinit);
  let [MinesCount, setMinesCount] = useState(minit);
  let [curwidth, setcurwidth] = useState(winit);
  let [curheight, setcurheight] = useState(hinit);
  let [curmines, setcurmines] = useState(minit);
  let [Field, setField] = useState(Array.from({length: Width}, () => Array.from({length: Height}, () => null)));
  let [UserField, setUserField] = useState(Array.from({length: Width}, () => Array.from({length: Height}, () => null)));
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
            } while (mines.indexOf(newmine) !==  mines.lastIndexOf(newmine));
        }
        mines.forEach(mine => {
            field[Math.floor(mine / height)][mine % height] = "M";
        });
        for (let i = 0; i < width; i++){
            for (let j = 0; j < height; j++){
                if (field[i][j] !== "M"){
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
    create1dfield(field);
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
  useEffect(() => {
    createfield();
  }, []);
  function setUFvalue(row, col, value){
    let fld = UserField.map(row => [...row]);
    fld[row][col] = value;
    setUserField(fld);
  }
  function cleanzerocell(row, col, field, lasttoopen){
    let toopen = [];
    if (lasttoopen.length > 0){
      toopen = [...lasttoopen];
      row = Math.floor(lasttoopen.at(-1) / field[0].length);
      col = Math.floor(lasttoopen.at(-1) % field[0].length)
    }
    else{
      toopen = [toone(row, col, field[0].length)];
    }
    let curneis;
    let count = toopen.length;
    let prevcount = 0;
    for (let i = 0; i < Math.max(field.length + 1, field[0].length + 1); i++){
      if (prevcount === count)
        break;
      let toopen1 = [...toopen];
      toopen1.forEach(cell => {
        if (DField[cell] === "0"){
          curneis = GetNeigh(cell, field);
          curneis.forEach(nei => {
            if (!toopen.includes(nei)){
              toopen.push(nei);
            }
          });
        }
      });
      prevcount = count;
      count = toopen.length;
    }
    return toopen;
  }
  function clean(row, col){
    let lst0 = cleanzerocell(row, col, Field, []);
    let lst = cleanzerocell(row, col, Field, lst0);
    let fld = UserField.map(row => [...row]);
    lst.forEach(cell => {
      fld[Math.floor(cell / UserField[0].length)][cell % UserField[0].length] = Field[Math.floor(cell / UserField[0].length)][cell % UserField[0].length];
    });
    setUserField(fld);
  }
  function cellclicked(row, col, button){
    console.log(`${row} - ${col} - ${button}`);
    //debugger;
    if (button === 0){
      if (Field[row][col] === "M"){
        if (GameStatus === "Inited"){
          //move
        }
        else {
          //game over
        }
      }
      else if (Field[row][col] === "0"){
        clean(row, col);
      }
      else{
        setUFvalue(row, col, Field[row][col]);
      }
    }
    else if (button === 2){
      
    }
  }

  return (
    <div className="app">
      <Grid width={Width} height={Height} field={UserField} id={1} OnCell={cellclicked}/>
      <Grid width={Width} height={Height} field={Field} id={2} OnCell={cellclicked}/>
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
