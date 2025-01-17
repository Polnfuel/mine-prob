import './App.css';
import Grid from './Grid';
import React, {useState} from 'react';

let Field, UserField, DField, Width, Height, MinesCount, GameStatus;
let curwidth = 10, curheight = 12, curmines = 10;

function arrayfill(field, value) {
    for (let i = 0; i < field.length; i++){
        for (let j = 0; j < field[0].length; j++){
            field[i][j] = value;
        }
    }
    return field;
}
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
function newfield() {
    Width = curwidth;
    Height = curheight;
    MinesCount = curmines;
    GameStatus = "Inited";
    Field = Array.from({length: Width}, () => Array.from({length: Height}, () => null) );
    let mines = [];
    let newmine;
    if (MinesCount < Width * Height){
        for (let i = 0; i < MinesCount; i++){
            do {
                newmine = Math.floor(Math.random() * (Width * Height));
                mines[i] = newmine;
            } while (mines.indexOf(newmine) !=  mines.lastIndexOf(newmine));
        }
        mines.forEach(mine => {
            Field[Math.floor(mine / Height)][mine % Height] = "M";
        });
        for (let i = 0; i < Width; i++){
            for (let j = 0; j < Height; j++){
                if (Field[i][j] != "M"){
                    Field[i][j] = String(GetNeighboors(i, j, Field));
                }
            }
        }
    }
    else{
        Field = new Array(Width).fill(null).map(() => new Array(Height).fill("M"));
    }
    UserField = new Array(Width).fill(null).map(() => new Array(Height).fill("C"));
    create1dfield(Field);
}
function create1dfield(field) {
  DField = new Array(field.length * field[0].length);
    for (let i = 0; i < field.length; i++){
        for (let j = 0; j < field[0].length; j++){
            DField[i * field[0].length + j] = field[i][j];
        }
    }
}
newfield();
function App() {
  return (
    <div className="app">
      <Grid width={Width} height={Height} field={UserField}/>
      <Grid width={Width} height={Height} field={Field}/>
      <div className='forma container mt-5'>
        <form className='row g-3'>
          <div className='col-auto'>
            <input value={curwidth} type='number' className='form-control' placeholder='Высота' />
          </div>
          <div className='col-auto'>
            <input value={curheight} type='number' className='form-control' placeholder='Ширина' />
          </div>
          <div className='col-auto'>
            <input value={curmines} type='number' className='form-control' placeholder='Кол-во мин' />
          </div>
          <div className='col-auto'>
            <button type='button' onClick={newfield}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
