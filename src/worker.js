onmessage = (e) => {
    const [start, end, min, max, borderInfo, popCountCache] = e.data;
    const workerCombs = [];

    function countBits(n) {
        return (
            popCountCache[n & 255] +
            popCountCache[(n >> 8) & 255] +
            popCountCache[(n >> 16) & 255] +
            popCountCache[(n >> 24) & 255]
        );
    }
    for (let mask = start; mask <= end; mask++){
        const bits = countBits(mask);
        if (bits < min || bits > max) continue;
        let valid = true;
        for (const { mask: m, number } of borderInfo) {
            const overlap = mask & m;
            if (countBits(overlap) !== number){
                valid = false;
                break;
            }
        }
        if (valid){
            workerCombs.push(mask);
        }
    }
    postMessage(workerCombs);
};