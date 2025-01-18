import './Stats.css';
import React from 'react';


function Stats({show, stats}){
    //debugger;
    if (show){
        const time = `Time: ${stats[2]} s`;
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