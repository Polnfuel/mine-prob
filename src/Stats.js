import './Stats.css';
import React from 'react';

function Stats({show, stats, time}){
    if (show){
        const timestat = `Time: ${time} s`;
        const leftclicks = `Left clicks: ${stats[0]}`;
        const rightclicks = `Right clicks: ${stats[1]}`;
        return (
            <div className='stats'>
                <span>{timestat}</span>
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