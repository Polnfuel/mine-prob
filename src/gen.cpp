#include <emscripten/bind.h>
#include <cstdint>
#include <vector>
#include <map>
#include <utility>
#include <cmath>

using namespace std;
using namespace emscripten;

struct BigInt128
{
    uint64_t low;
    uint64_t high;
    __uint128_t toUint128() const {
        return (__uint128_t(high) << 64) | low;
    }
};

vector<uint8_t> dfield;
uint16_t dfsize;
uint8_t width, height;
vector<uint16_t> globalUO;

uint16_t mines;
uint8_t guosize;

vector<uint16_t> static getNei(uint16_t cell) {
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

uint16_t static getNumCount(uint16_t cell) {
    uint16_t count = 0;
    vector<uint16_t> mas = getNei(cell);
    for (uint16_t nei : mas) {
        if (dfield[nei] != 10 && dfield[nei] != 9)
            count++;
    }
    return count;
}
double B(uint16_t left, uint16_t right, uint16_t len) {
    double result = 1;
    if (right != 0) {
        for (uint16_t i = 0; i < len; i++) {
            result = result * (left + i) / (right - i);
        }
    }
    return result;
}

void calculate(map<uint8_t, vector<uint32_t>>& combinations){
    vector<uint16_t> fltiles;
    uint16_t closedtiles = 0;
    for (uint16_t cell = 0; cell < dfsize; cell++) {
        if (dfield[cell] == 9) {
            closedtiles++;
            if (getNumCount(cell) == 0) {
                fltiles.emplace_back(cell);
            }
        }
    }
    const uint16_t floatingtiles = closedtiles - guosize;
    const double density = static_cast<double>(mines) / closedtiles;
    const double mvalue = (1 - density) / density;
    map<uint8_t, double> combs;
    double sumweights = 0;
    uint8_t maxcount = prev(combinations.end())->first;
    for (const auto& [key, arr] : combinations) {
        const double weight = pow(mvalue, maxcount - key);
        sumweights += weight * arr[guosize];
        combs.insert({ key, weight });
    }
    double sumweightsFl = 0;
    double weightsFl = 0;
    bool isMax = false;
    if (maxcount == mines) isMax = true;
    for (const auto& entry : combinations) {
        const double weight = combs[entry.first];
        const uint32_t count = entry.second[guosize];
        const uint8_t M = entry.first;
        const uint16_t m = mines - M;
        if (isMax) weightsFl += (count * weight * B(floatingtiles - m + 1, m, maxcount - M) * (static_cast<double>(m) / floatingtiles));
        else weightsFl += (count * weight * B(floatingtiles - m + 1, m - 1, maxcount - M));
        sumweightsFl += (count * weight * B(floatingtiles - m + 1, m, maxcount - M));
    }
    double flProb;
    if (isMax) flProb = weightsFl / sumweightsFl;
    else flProb = (weightsFl / sumweightsFl) * (mines - maxcount) / floatingtiles;
    uint8_t flUint8 = round(flProb * 100) + 151;
    for (const auto tile : fltiles) {
        dfield[tile] = flUint8;
    }
    for (uint8_t uo = 0; uo < guosize; uo++) {
        double weights = 0;
        for (const auto& entry : combinations) {
            weights += entry.second[uo] * combs[entry.first];
        }
        dfield[globalUO[uo]] = static_cast<uint8_t>(round(weights / sumweights * 100) + 50);
    }
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

vector<uint8_t> static calculateBigInt(const vector<vector<BigInt128>> maskGroups, 
    const vector<vector<uint8_t>> localsAll,
    const vector<uint8_t> dfld, const uint8_t w, const uint8_t h, 
    const uint16_t mins, vector<uint16_t> globaluo
) {
    //Initialize global values
    width = w;
    height = h;
    mines = mins;
    dfield.clear();
    globalUO.clear();
    for (int i = 0; i < dfld.size(); i++) {
        dfield.emplace_back(dfld[i]);
    }
    for (int i = 0; i < globaluo.size(); i++){
        globalUO.emplace_back(globaluo[i]);
    }
    dfsize = dfield.size();
    guosize = globalUO.size();
    //End of initializing
    const uint8_t grcount = maskGroups.size();
    vector<map<__uint128_t, uint8_t>> globalGroups(grcount);
    for (uint8_t i = 0; i < grcount; i++){
        const vector<uint8_t> local = localsAll[i];
        const vector<BigInt128> group = maskGroups[i];
        for (BigInt128 localMask : group){
            __uint128_t globalMask = 0;
            uint8_t count = 0;
            for (uint8_t j = 0; j < local.size(); j++){
                if ((localMask.toUint128() >> j) & 1) {
                    globalMask |= ((__uint128_t)1 << local[j]);
                    count++;
                }
            }
            globalGroups[i].insert({ globalMask, count });
        }
    }
    map<uint8_t, vector<uint32_t>> combinations = genCombs128(globalGroups, localsAll);
    calculate(combinations);
    return dfield;
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

vector<uint8_t> static calculateNumber(const vector<vector<uint64_t>> maskGroups, 
    const vector<vector<uint8_t>> localsAll,
    const vector<uint8_t> dfld, const uint8_t w, const uint8_t h, 
    const uint16_t mins, vector<uint16_t> globaluo
) {
    //Initialize global values
    width = w;
    height = h;
    mines = mins;
    dfield.clear();
    globalUO.clear();
    for (int i = 0; i < dfld.size(); i++) {
        dfield.emplace_back(dfld[i]);
    }
    for (int i = 0; i < globaluo.size(); i++){
        globalUO.emplace_back(globaluo[i]);
    }
    dfsize = dfield.size();
    guosize = globalUO.size();
    //End of initializing
    map<uint8_t, vector<uint32_t>> combinations;
    if (guosize <= 64) {
        combinations = genCombs64(maskGroups, localsAll);
    }
    else if (guosize > 64) {
        const uint8_t grcount = maskGroups.size();
        vector<map<__uint128_t, uint8_t>> globalGroups(grcount);
        for (uint8_t i = 0; i < grcount; i++){
            const vector<uint8_t> local = localsAll[i];
            const vector<uint64_t> group = maskGroups[i];
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

//em++ gen.cpp -o gen.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Gen -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("calculateBigInt", &calculateBigInt);

    value_object<BigInt128>("BigInt128")
        .field("low", &BigInt128::low)
        .field("high", &BigInt128::high);
    
    register_vector<BigInt128>("VectorBigInt128");
    register_vector<vector<BigInt128>>("VectorVectorBigInt128");

    emscripten::function("calculateNumber", &calculateNumber);
    register_vector<uint64_t>("vectorUint64_t");
    register_vector<vector<uint64_t>>("VectorVectorUint64_t");

    register_vector<uint8_t>("vectorUint8_t");
    register_vector<vector<uint8_t>>("vectorVectorUint8_t");
    register_vector<uint16_t>("vectorUint16_t");
}