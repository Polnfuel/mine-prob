import './App.css';
import Grid from './Grid';
import Stats from './Stats';
import FilePaste from './FilePaste';
import React, {useEffect, useRef, useState} from 'react';

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
function toone(row, col, height){
  return (row * height + col);
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
function GetFlagCount(i, j, field, retmas=false){
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
      if (cell === "F"){
          count++;
      }
  });
  if (!retmas)
    return count;
  return mas;
}
let Row = 0, Col = 0;
let IsStart = false;
function App() {
  let winit = 9;
  let hinit = 9;
  let minit = 10;
  let statinit = Array.from({length: 3}, () => 0);
  let [Width, setWidth] = useState(winit);
  let [Height, setHeight] = useState(hinit);
  let [MinesCount, setMinesCount] = useState(minit);
  let [MinesRemaining, setMinesRemaining] = useState(minit);
  let [curwidth, setcurwidth] = useState(winit);
  let [curheight, setcurheight] = useState(hinit);
  let [curmines, setcurmines] = useState(minit);
  let [Field, setField] = useState(Array.from({length: Width}, () => Array.from({length: Height}, () => null)));
  let [UserField, setUserField] = useState(Array.from({length: Width}, () => Array.from({length: Height}, () => null)));
  let [DField, setDField] = useState(Array.from({length: Width * Height}, () => null));
  let [GameStatus, setGameStatus] = useState("Inited");
  let [ShowStat, setShowStat] = useState(Boolean(false));
  let [Statistics, setStat] = useState(statinit);
  let allopened = false;
  let statistics = Statistics;
  let gamestatus = "Inited";
  let [redcell, setredcell] = useState(null);
  let [isStart, setisStart] = useState(Boolean(false));
  let [elapsedTime, setelapsedTime] = useState(0);
  const timerRef = useRef(null);

  if (GameStatus === "Second"){
    cellclicked(Row, Col, 0);
    setGameStatus("Going");
    gamestatus = "Going";
  }

  function createfield(cell=null){
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
            } while (mines.indexOf(newmine) !==  mines.lastIndexOf(newmine) || newmine === cell);
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
    setMinesRemaining(curmines);
    setGameStatus("Inited");
    create1dfield(field);
    setStat(statinit);
    setShowStat(false);
    setredcell(null);
    if (IsStart === false)
      setisStart(false);
    if (GameStatus === "Going"){
      setisStart(false);
      stopTimer();
    }
    setelapsedTime(0);
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
    isWon(fld);
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
  function clean(row, col, isret=false){
    let lst0 = cleanzerocell(row, col, Field, []);
    let lst = cleanzerocell(row, col, Field, lst0);
    let fld = UserField.map(row => [...row]);
    lst.forEach(cell => {
      fld[Math.floor(cell / UserField[0].length)][cell % UserField[0].length] = Field[Math.floor(cell / UserField[0].length)][cell % UserField[0].length];
    });
    isWon(fld);
    setUserField(fld);
    if (isret){
      return lst;
    }
  }
  function isWon(ufield){
    let mas = 0;
    for (let i = 0; i < ufield.length; i++){
      for (let j = 0; j < ufield[0].length; j++){
        if (ufield[i][j] === "C" || ufield[i][j] === "F"){
          mas++;
        }
      }
    }
    if (mas === MinesCount)
    {
      allopened = true;
      setShowStat(true);
    }
  }
  function cellclicked(row, col, button){
    console.log(`${row} - ${col} - ${button}`);
    if (GameStatus !== "Won" && GameStatus !== "Fail"){
      //start timer
      if (!isStart){
        setisStart(Boolean(true));
        IsStart = true;
        const startTime = performance.now();
        timerRef.current = setInterval(() => {
          setelapsedTime(performance.now() - startTime);
        }, 10);
      }
      if (button === 0){
        if (Field[row][col] === "M" && UserField[row][col] !== "F"){
          if (GameStatus === "Inited"){
            //move mine
            createfield(toone(row, col, Height));
            setGameStatus("Second");
            gamestatus = "Second";
            Row = row;
            Col = col;
          }
          else {
            //game over and show mines
            console.log("Fail");
            let fld = UserField.map(row => [...row]);
            for (let ind = 0; ind < DField.length; ind++){
              if (DField[ind] === "M" && fld[Math.floor(ind / UserField[0].length)][ind % UserField[0].length] !== "F"){
                fld[Math.floor(ind / UserField[0].length)][ind % UserField[0].length] = "M";
              }
            }
            gameend("Fail", fld, [row, col]);
          }
        }
        else if (Field[row][col] === "0"){
          clean(row, col);
        }
        else if (UserField[row][col] !== "F"){
          if (UserField[row][col] === String(GetFlagCount(row, col, UserField))){
            //clean
            console.log("Clean flag!");
            let mas = GetNeigh(toone(row, col, Height), Field);
            let lst = [];
            let fld;
            for (let c = 0; c < mas.length; c++){
              const cell = mas[c];
              let i = Math.floor(cell / UserField[0].length);
              let j = Math.floor(cell % UserField[0].length);
              if (UserField[i][j] === "C"){
                if (Field[i][j] === "0"){
                  lst = clean(i, j, true);
                }
                else if (Field[i][j] === "M"){
                  //game over and show mines
                  console.log("Fail");
                  fld = UserField.map(row => [...row]);
                  for (let ind = 0; ind < DField.length; ind++){
                    if (DField[ind] === "M"){
                      fld[Math.floor(ind / UserField[0].length)][ind % UserField[0].length] = "M";
                    }
                  }
                  gameend("Fail", fld, [i, j]);
                  break;
                }
                else{
                  if (!lst.includes(cell))
                    lst.push(cell);
                }
              }
            }
            if (fld === undefined)
              fld = UserField.map(row => [...row]);
            console.log(lst);
            lst.forEach(cell => {
             fld[Math.floor(cell / UserField[0].length)][cell % UserField[0].length] = Field[Math.floor(cell / UserField[0].length)][cell % UserField[0].length];
            });
            isWon(fld);
            setUserField(fld);
          }
          else{
            setUFvalue(row, col, Field[row][col]);
          }
        }
        //all empty opened - win
        if (allopened){
          console.log("Win!!!");
          gameend("Won");
        }
        statistics[0]++;
        if (GameStatus === "Inited" && gamestatus === "Inited")
          setGameStatus("Going");
      }
      else if (button === 2){
        if (UserField[row][col] === "C"){
          setUFvalue(row, col, "F");
          setMinesRemaining(MinesRemaining - 1);
        }
        else if (UserField[row][col] === "F"){
          setUFvalue(row, col, "C");
          setMinesRemaining(MinesRemaining + 1);
        }
        statistics[1]++;
        setGameStatus("Going");
      }
    }
  }
  function stopTimer(){
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function gameend(status, fld=null , cell=null){
    stopTimer();
    setisStart(false);
    if (cell !== null)
      setredcell(cell);
    if (fld !== null)
      setUserField(fld);
    setGameStatus(status);
    setShowStat(true);
    setStat(statistics);
  }
  useEffect(() => {
    return () => stopTimer();
  }, []);
  return (
    <div className="app">
      <div className='forma mt-4'>
        <form className='row g-3'>
          <div className='col-auto'>
            <input value={curheight} onChange={(e) => setcurheight(Number(e.target.value))} type='text' className='form-control'/>
          </div>
          <div className='col-auto'>
            <input value={curwidth} onChange={(e) => setcurwidth(Number(e.target.value))} type='text' className='form-control' />
          </div>
          <div className='col-auto'>
            <input value={curmines} onChange={(e) => setcurmines(Number(e.target.value))} type='text' className='form-control'/>
          </div>
          <div className='col-auto'>
            <button type='button' onClick={createfield}>Создать</button>
          </div>
        </form>
      </div>
      <div className="field-cont">
        <div className="field-header" onClick={createfield}>
          <span className="field-mines">{MinesRemaining}</span>
          <button type='button' className="restart-button"> </button>
          <span className="field-timer">{Math.floor(elapsedTime / 1000)}</span>
        </div>
        <div className="field-grid">
          <Grid field={UserField} id={1} OnCell={cellclicked} mine={redcell}/>
        </div>
      </div>
      <Stats show={ShowStat} stats={Statistics} time={(elapsedTime / 1000).toFixed(3)}/>
      {/* <Grid width={Width} height={Height} field={Field} id={2} OnCell={cellclicked} mine={redcell}/> */}
    </div>
  );
}

export default App;
