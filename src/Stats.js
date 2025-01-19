import './Stats.css';
import React from 'react';


function Stats({show, stats}){
    if (show){
        let time = `Time: ${stats[2]}`;
        // debugger;
        // time = time.slice(0, time.length-13) + " s";
        const leftclicks = `Left clicks: ${stats[0]}`;
        const rightclicks = `Right clicks: ${stats[1]}`;
        return (
            <div className='stats'>
                <span>{time}</span>
                <span>{leftclicks}</span>
                <span>{rightclicks}</span>
            </div>
        );
    }
    return (
        ''
    );
}

export default Stats;