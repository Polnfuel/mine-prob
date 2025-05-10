#include <emscripten/bind.h>
#include <cstdint>
#include <vector>
#include <algorithm>
#include <bit>
#include <map>
#include <set>
#include <utility>

using namespace std;
using namespace emscripten;

vector<uint8_t> dfield;
uint16_t dfsize;
uint8_t width, height;
uint16_t minesLeft;
uint16_t mines;
uint16_t lastConst;
vector<uint16_t> globalUO;
uint8_t guosize;
vector<pair<uint16_t, uint8_t>> globalBC;

vector<uint16_t> getNei(uint16_t cell) {
    uint8_t row = cell / width;
    uint8_t col = cell % width;
    vector<uint16_t> mas;
    if (row == 0)
    {
        if (cell == 0)
        {
            mas = { static_cast<uint16_t>(1), static_cast<uint16_t>(width), static_cast<uint16_t>(width + 1) };
        }
        else if (cell == width - 1)
        {
            mas = { static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell - 1 + width), static_cast<uint16_t>(cell + width) };
        }
        else
        {
            mas = { static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell + 1), static_cast<uint16_t>(cell - 1 + width), static_cast<uint16_t>(cell + width), static_cast<uint16_t>(cell + 1 + width) };
        }
    }
    else if (row == height - 1)
    {
        if (cell == (height - 1) * width)
        {
            mas = { static_cast<uint16_t>(cell - width), static_cast<uint16_t>(cell - width + 1), static_cast<uint16_t>(cell + 1) };
        }
        else if (cell == height * width - 1)
        {
            mas = { static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell - width - 1), static_cast<uint16_t>(cell - width) };
        }
        else
        {
            mas = { static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell + 1), static_cast<uint16_t>(cell - width + 1), static_cast<uint16_t>(cell - width - 1), static_cast<uint16_t>(cell - width) };
        }
    }
    else
    {
        if (col == 0)
        {
            mas = { static_cast<uint16_t>(cell - width), static_cast<uint16_t>(cell - width + 1), static_cast<uint16_t>(cell + 1), static_cast<uint16_t>(cell + width), static_cast<uint16_t>(cell + width + 1) };
        }
        else if (col == width - 1)
        {
            mas = { static_cast<uint16_t>(cell - width - 1), static_cast<uint16_t>(cell - width), static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell + width - 1), static_cast<uint16_t>(cell + width) };
        }
        else
        {
            mas = { static_cast<uint16_t>(cell - width - 1), static_cast<uint16_t>(cell - width), static_cast<uint16_t>(cell - width + 1), static_cast<uint16_t>(cell - 1), static_cast<uint16_t>(cell + 1), static_cast<uint16_t>(cell + width - 1), static_cast<uint16_t>(cell + width), static_cast<uint16_t>(cell + width + 1) };
        }
    }
    return mas;
}
double B(uint16_t left, uint16_t right, uint16_t len) {
    double result = 1;
    if (right == UINT16_MAX) {
        return 0;
    }
    else if (right > 0) {
        for (uint16_t i = 0; i < len; i++) {
            result = result * (left + i) / (right - i);
        }
    }
    return result;
}

uint8_t static getNumCount(uint16_t cell) {
    uint8_t count = 0;
    vector<uint16_t> mas = getNei(cell);
    for (uint16_t nei : mas) {
        if (dfield[nei] != 10 && dfield[nei] != 9)
            count++;
    }
    return count;
}
uint8_t static getFlagCount(uint16_t cell) {
    uint8_t count = 0;
    vector<uint16_t> mas = getNei(cell);
    for (uint16_t nei : mas) {
        if (dfield[nei] == 10)
            count++;
    }
    return count;
}
uint8_t static getClosedCount(uint16_t cell) {
    uint8_t count = 0;
    vector<uint16_t> mas = getNei(cell);
    for (uint16_t nei : mas) {
        if (dfield[nei] == 9)
            count++;
    }
    return count;
}
vector<uint64_t> gen(uint64_t fullMask, int k) {
    vector<int> bitPositions;

    for (int i = 0; i < 64; ++i) {
        if (fullMask & (uint64_t(1) << i)) {
            bitPositions.push_back(i);
        }
    }

    int n = bitPositions.size();
    if (k > n) return {};

    vector<uint64_t> result;

    vector<bool> select(n);
    fill(select.begin(), select.begin() + k, true);

    do {
        uint64_t mask = 0;
        for (int i = 0; i < n; ++i) {
            if (select[i]) {
                mask |= (uint64_t(1) << bitPositions[i]);
            }
        }
        result.push_back(mask);
    } while (prev_permutation(select.begin(), select.end()));

    return result;
}
map<uint16_t, vector<uint64_t>> fillup(map<uint16_t, uint64_t>& brdMasks, map<uint16_t, uint8_t>& brdNums) {
    map<uint16_t, vector<uint64_t>> maskCombs;
    for (auto& border : brdMasks) {
        vector<uint64_t> combs = gen(border.second, brdNums[border.first]);
        maskCombs.insert({ border.first, combs });
    }
    return maskCombs;
}

void static get1dData() {
    uint16_t flags = 0;
    for (uint16_t cell = 0; cell < dfsize; cell++) {
        if (dfield[cell] == 9 && getNumCount(cell) > 0) {
            globalUO.emplace_back(cell);
        }
        else if (dfield[cell] != 9 && dfield[cell] != 10 && getClosedCount(cell) > 0) {
            globalBC.emplace_back(cell, static_cast<uint8_t>(dfield[cell] - getFlagCount(cell)));
        }
        else if (dfield[cell] == 10) {
            flags++;
        }
    }
    guosize = globalUO.size();
    mines = minesLeft - flags;
}
void static make1dGroup(vector<uint16_t>& uo, vector<uint16_t>& bc, uint16_t uochecked = 0, uint16_t bcchecked = 0) {
    for (uint16_t u = uochecked; u < uo.size(); u++) {
        vector<uint16_t> neis = getNei(uo[u]);
        for (uint16_t nei : neis) {
            if (dfield[nei] < 9) {
                if (count(bc.begin(), bc.end(), nei) == 0) {
                    bc.emplace_back(nei);
                }
            }
        }
        uochecked++;
    }
    for (uint16_t b = bcchecked; b < bc.size(); b++) {
        vector<uint16_t> neis = getNei(bc[b]);
        for (uint16_t nei : neis) {
            if (dfield[nei] == 9) {
                if (count(uo.begin(), uo.end(), nei) == 0) {
                    uo.emplace_back(nei);
                }
            }
        }
        bcchecked++;
    }
    if (bcchecked == bc.size() && uochecked == uo.size()) {
        return;
    }
    make1dGroup(uo, bc, uochecked, bcchecked);
}
void static make1dGroups(vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>>& gs) {
    uint8_t uogroupsLength = 0;
    while (uogroupsLength < guosize) {
        uint16_t uoStart;
        if (gs.size() != 0) {
            bool quit;
            for (int uoc = 0; uoc < guosize; uoc++) {
                quit = false;
                for (int g = 0; g < gs.size(); g++) {
                    for (int uog = 0; uog < gs[g].first.size(); uog++) {
                        if (gs[g].first[uog] == globalUO[uoc]) {
                            quit = true;
                            break;
                        }
                    }
                    if (quit) {
                        break;
                    }
                }
                if (!quit) {
                    uoStart = globalUO[uoc];
                    break;
                }
            }
        }
        else {
            uoStart = globalUO[0];
        }
        vector<uint16_t> uo = { uoStart };
        vector<uint16_t> bc;
        make1dGroup(uo, bc);
        vector<pair<uint16_t, uint8_t>> bcpair;
        for (uint16_t bb = 0; bb < bc.size(); bb++) {
            for (uint16_t border = 0; border < globalBC.size(); border++) {
                if (bc[bb] == globalBC[border].first) {
                    bcpair.insert(bcpair.begin() + bb, globalBC[border]);
                    break;
                }
            }
        }
        uogroupsLength += uo.size();
        std::sort(uo.begin(), uo.end());
        gs.emplace_back(uo, bcpair);
    }
}

void backtrack(uint16_t currentConstraint, uint64_t mask, map<uint16_t, vector<uint16_t>>& uoneis, map<uint16_t, vector<uint16_t>>& bcneis,
    map<uint16_t, vector<uint64_t>>& brdCombs, map<uint16_t, uint8_t>& brdNums, map<uint16_t, uint64_t>& brdMasks, vector<uint64_t>& combinations
) {
    vector<uint16_t> neis = bcneis[currentConstraint];
    set<uint16_t> allConstraints;
    for (uint16_t nei : neis) {
        vector<uint16_t> uonei = uoneis[nei];
        for (uint16_t uon : uonei) {
            allConstraints.insert(uon);
        }
    }
    for (uint64_t combo : brdCombs[currentConstraint]) {
        uint64_t newmask = mask | combo;
        bool isValid = true;
        for (uint16_t constraint : allConstraints) {
            if (__builtin_popcountll((newmask ^ brdMasks[constraint]) & brdMasks[constraint]) < (__builtin_popcountll(brdMasks[constraint]) - brdNums[constraint])) {
                isValid = false;
                break;
            }
        }
        if (isValid) {
            if (currentConstraint != lastConst) {
                uint16_t nextConstraint = (++brdMasks.find(currentConstraint))->first;
                backtrack(nextConstraint, newmask, uoneis, bcneis, brdCombs, brdNums, brdMasks, combinations);
            }
            else {
                if (__builtin_popcountll(newmask) <= mines)
                    combinations.emplace_back(newmask);
            }
        }
    }
}

pair<vector<uint64_t>, vector<uint8_t>> findCombs(vector<uint16_t> unopenedCells, vector<pair<uint16_t, uint8_t>> borderCells) {
    vector<uint64_t> combinations;
    vector<uint8_t> localToGlobalBit(unopenedCells.size());
    map<uint16_t, uint8_t> cellToBit;
    for (int i = 0; i < unopenedCells.size(); i++) {
        localToGlobalBit[i] = find(globalUO.begin(), globalUO.end(), unopenedCells[i]) - globalUO.begin();
        cellToBit.insert({ unopenedCells[i], i });
    }
    vector<pair<uint64_t, uint8_t>> borderInfo;
    set<uint64_t> seen;
    set<uint16_t> borderSet;
    vector<uint16_t> brdVec;
    set<uint16_t> unopenedSet;
    map<uint16_t, vector<uint16_t>> uoneis;
    map<uint16_t, vector<uint16_t>> bcneis;
    map<uint16_t, uint8_t> brdNums;
    map<uint16_t, uint64_t> brdMasks;
    for (auto& [index, number] : borderCells) {
        vector<uint16_t> neighbors = getNei(index);
        uint64_t mask = 0;
        for (const uint16_t nei : neighbors) {
            const auto it = cellToBit.find(nei);
            if (it != cellToBit.end()) {
                mask |= 1ull << it->second;
            }
        }
        if (seen.find(mask) == seen.end()) {
            seen.insert(mask);
            borderSet.insert(index);
            borderInfo.push_back({ mask, number });
            brdNums.insert({ index, number });
            brdMasks.insert({ index, mask });
            brdVec.push_back(index);
        }
    }
    for (uint16_t cell : unopenedCells) {
        unopenedSet.insert(cell);
        uoneis.insert({ cell, vector<uint16_t>() });
        vector<uint16_t> neighbors = getNei(cell);
        for (uint16_t nei : neighbors) {
            if (borderSet.count(nei) > 0) {
                uoneis[cell].push_back(nei);
            }
        }
    }
    for (uint16_t cell : borderSet) {
        bcneis.insert({ cell, vector<uint16_t>() });
        vector<uint16_t> neighbors = getNei(cell);
        for (uint16_t nei : neighbors) {
            if (unopenedSet.count(nei) > 0) {
                bcneis[cell].push_back(nei);
            }
        }
    }
    uint16_t uosize = unopenedCells.size();
    map<uint16_t, vector<uint64_t>> brdCombs = fillup(brdMasks, brdNums);
    lastConst = *borderSet.rbegin();
    backtrack(*borderSet.begin(), 0, uoneis, bcneis, brdCombs, brdNums, brdMasks, combinations);

    return {combinations, localToGlobalBit};
}

void static backtrack128(const uint8_t index, const __uint128_t currentMask, const uint8_t usedMines,
    vector<map<__uint128_t, uint8_t>>& globalGroups,
    vector<vector<uint32_t>>& result,
    map<uint8_t, uint8_t>& numToIndex
) {
    if (usedMines > mines) return;

    if (index == globalGroups.size()) {
        auto [it, inserted] = numToIndex.try_emplace(usedMines, result.size());
        if (inserted) {
            result.emplace_back(vector<uint32_t>(guosize + 1));
        }
        for (uint8_t i = 0; i < guosize; i++){
            if ((currentMask >> i) & (__uint128_t)1){
                result[numToIndex[usedMines]][i]++;
            }
        }
        result[numToIndex[usedMines]][guosize]++;
        return;
    }
    for (const auto& [mask, count] : globalGroups[index]){
        backtrack128(index + 1, currentMask | mask, usedMines + count, globalGroups, result, numToIndex);
    }
}

map<uint8_t, vector<uint32_t>> static genCombs128(vector<map<__uint128_t, uint8_t>>& globalGroups, const vector<vector<uint8_t>>& localsAll){
    vector<vector<uint32_t>> result;
    map<uint8_t, uint8_t> numToIndex;
    
    backtrack128(0, 0, 0, globalGroups, result, numToIndex);
    map<uint8_t, vector<uint32_t>> combinations;

    for (const auto& [num, index] : numToIndex) {
        combinations.insert({ num, result[index] });
    }
    return combinations;
}

void static backtrack64(uint8_t index, uint64_t currentMask, uint8_t usedMines,
    vector<map<uint64_t, uint8_t>>& cachedGroups,
    vector<vector<uint32_t>>& result,
    map<uint8_t, uint8_t>& numToIndex
) {
    if (usedMines > mines) return;

    if (index == cachedGroups.size()) {
        auto [it, inserted] = numToIndex.try_emplace(usedMines, result.size());
        if (inserted) {
            result.emplace_back(vector<uint32_t>(guosize + 1));
        }
        for (uint8_t i = 0; i < guosize; i++) {
            if ((currentMask >> i) & 1ull) {
                result[numToIndex[usedMines]][i]++;
            }
        }
        result[numToIndex[usedMines]][guosize]++;
        return;
    }

    for (const auto& [mask, count] : cachedGroups[index]) {
        backtrack64(index + 1, currentMask | mask, usedMines + count, cachedGroups, result, numToIndex);
    }
}

map<uint8_t, vector<uint32_t>> static genCombs64(const vector<vector<uint64_t>>& maskGroups, const vector<vector<uint8_t>>& localsAll) {
    vector<vector<uint32_t>> result;
    map<uint8_t, uint8_t> numToIndex;
    const uint8_t grcount = maskGroups.size();

    vector<map<uint64_t, uint8_t>> cachedGroups(grcount);
    for (uint8_t i = 0; i < grcount; i++) {
        const vector<uint8_t> local = localsAll[i];
        const vector<uint64_t> group = maskGroups[i];
        for (uint64_t localMask : group) {
            uint64_t globalMask = 0;
            uint8_t count = 0;
            for (uint8_t j = 0; j < local.size(); j++) {
                if ((localMask >> j) & 1) {
                    globalMask |= (1ull << local[j]);
                    count++;
                }
            }
            cachedGroups[i].insert({ globalMask, count });
        }
    }
    backtrack64(0, 0, 0, cachedGroups, result, numToIndex);
    map<uint8_t, vector<uint32_t>> combinations;

    for (const auto& [num, index] : numToIndex) {
        combinations.insert({ num, result[index] });
    }
    return combinations;
}

void calculate(map<uint8_t, vector<uint32_t>>& combinations) {
    uint8_t maxcount = prev(combinations.end())->first;
    uint16_t mincnt = mines - maxcount;

    if (mincnt >= 0) {
        vector<uint16_t> fltiles;
        for (uint16_t cell = 0; cell < dfsize; cell++) {
            if (dfield[cell] == 9) {
                if (getNumCount(cell) == 0) {
                    fltiles.emplace_back(cell);
                }
            }
        }
        const uint16_t floatingtiles = fltiles.size();

        map<uint8_t, double> weights;
        double weightsFl = 0;
        double sumweights = 0;
        for (const auto& [m, arr] : combinations) {
            const uint16_t right = min(mines - m, floatingtiles - mines + m);
            const uint16_t left = floatingtiles - right + 1;
            const uint16_t len = right - mincnt;
            const double weight = B(left, right, len);
            uint16_t rightFl;
            if (mines - m == 0) rightFl = UINT16_MAX;
            else rightFl = min(mines - m - 1, floatingtiles - mines + m + 1);
            const uint16_t leftFl = floatingtiles - rightFl;
            const uint16_t lenFl = rightFl + 1 - mincnt;
            const double weightFl = B(leftFl, rightFl, lenFl);
            weightsFl += weightFl * arr[guosize];
            sumweights += weight * arr[guosize];
            weights.insert({ m, weight });
        }
        bool isMax = false;
        if (maxcount == mines) isMax = true;
        double flProb;
        if (isMax) flProb = weightsFl / sumweights;
        else flProb = (weightsFl / sumweights) * mincnt / floatingtiles;
        uint8_t flUint8 = round(flProb * 100) + 151;
        for (const auto tile : fltiles) {
            dfield[tile] = flUint8;
        }
        for (uint8_t uo = 0; uo < guosize; uo++) {
            double d = 0;
            for (const auto& entry : combinations) {
                d += entry.second[uo] * weights[entry.first];
            }
            dfield[globalUO[uo]] = static_cast<uint8_t>(round(d / sumweights * 100) + 50);
        }
    }
}

vector<uint8_t> calc(vector<uint8_t> dfld, uint8_t w, uint8_t h, uint16_t mL) {
    //Initialize global values
    width = w;
    height = h;
    minesLeft = mL;
    dfield.clear();
    for (int i = 0; i < dfld.size(); i++) {
        dfield.emplace_back(dfld[i]);
    }
    dfsize = dfield.size();
    globalBC.clear();
    globalUO.clear();
    guosize = 0;
    //End of initializing

    get1dData();
    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>> groups;
    make1dGroups(groups);

    vector<vector<uint64_t>> combsAll;
    vector<vector<uint8_t>> localsAll;
    for (uint8_t group = 0; group < groups.size(); group++) {
        auto [unopenedCells, borderCells] = groups[group];
        const auto [combs, locals] = findCombs(unopenedCells, borderCells);
        combsAll.emplace_back(combs);
        localsAll.emplace_back(locals);
    }

    map<uint8_t, vector<uint32_t>> combinations;
    if (guosize <= 64) {
        combinations = genCombs64(combsAll, localsAll);
    }
    else if (guosize > 64) {
        const uint8_t grcount = combsAll.size();
        vector<map<__uint128_t, uint8_t>> globalGroups(grcount);
        for (uint8_t i = 0; i < grcount; i++){
            const vector<uint8_t> local = localsAll[i];
            const vector<uint64_t> group = combsAll[i];
            for (uint64_t localMask : group){
                __uint128_t globalMask = 0;
                uint8_t count = 0;
                for (uint8_t j = 0; j < local.size(); j++){
                    if ((localMask >> j) & 1) {
                        globalMask |= ((__uint128_t)1 << local[j]);
                        count++;
                    }
                }
                globalGroups[i].insert({ globalMask, count });
            }
        }
        combinations = genCombs128(globalGroups, localsAll);
    }
    calculate(combinations);
    return dfield;
}

//em++ calc.cpp -o calc.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Calc -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("calc", &calc);
    register_vector<uint8_t>("vectorUint8_t");
}