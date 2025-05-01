#include <emscripten/bind.h>
#include <cstdint>
#include <vector>
#include <utility>

using namespace std;
using namespace emscripten;

vector<uint64_t> static findCombs(uint64_t start, uint64_t end, uint8_t min, uint16_t max, vector<pair<uint64_t, uint8_t>> borderInfo){
    vector<uint64_t> combinations;

    for (uint64_t mask = start; mask <= end; mask++) {
        const uint8_t bits = __builtin_popcountll(mask);
        if (bits < min || bits > max) continue;
        bool valid = true;
        for (const auto& [m, number] : borderInfo) {
            const uint64_t overlap = mask & m;
            if (__builtin_popcountll(overlap) != number) {
                valid = false;
                break;
            }
        }
        if (valid) {
            combinations.emplace_back(mask);
        }
    }
    
    return combinations;
}

//em++ calc.cpp -o calc.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Calc -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("findCombs", &findCombs);
    
    value_array<pair<uint64_t, uint8_t>>("pairUint64Uint8")
        .element(&pair<uint64_t, uint8_t>::first)
        .element(&pair<uint64_t, uint8_t>::second);

    register_vector<pair<uint64_t, uint8_t>>("vectorPairUint64Uint8");
    register_vector<uint64_t>("vectorUint64_t");
}