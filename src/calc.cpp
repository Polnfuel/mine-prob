#include <emscripten/bind.h>
#include <cstdint>
#include <vector>
#include <algorithm>
#include <map>
#include <set>
#include <utility>
#include <math.h>

using namespace std;
using namespace emscripten;
typedef __uint128_t uint128_t;

// Game field representation:
// - Values 0-8 represent opened cells with adjacent mine count
// - 9 represents an unopened cell
// - 10 represents a flagged cell

// Global variables
vector<uint8_t> gameField;                       // Game field state
uint16_t fieldSize;                              // Total number of cells in the field
uint8_t boardWidth, boardHeight;                 // Dimensions of the game board
uint16_t remainingMines;                         // Number of mines not yet flagged
uint16_t totalMines;                             // Total number of mines in the game
uint16_t lastConstraintCell;                     // Last cell in the border cell list (for backtracking)
vector<uint16_t> unopenedCellsList;              // List of all unopened cells adjacent to numbered cells
uint8_t unopenedCellsCount;                      // Count of unopened cells in the list
vector<pair<uint16_t, uint8_t>> borderCellsList; // List of numbered cells with adjacent unopened cells

/**
 * Gets the neighboring cells of a given cell
 * 
 * @param cellIndex The index of the cell to get neighbors for
 * @return A vector containing the indices of neighboring cells
 */
vector<uint16_t> getNeighborCells(uint16_t cellIndex) {
    uint8_t row = cellIndex / boardWidth;
    uint8_t col = cellIndex % boardWidth;
    vector<uint16_t> neighbors;
    
    // Handle different cases based on cell position (corner, edge, or interior)
    if (row == 0) {
        // Top row
        if (col == 0) {
            // Top-left corner
            neighbors = { 
                static_cast<uint16_t>(1), 
                static_cast<uint16_t>(boardWidth), 
                static_cast<uint16_t>(boardWidth + 1) 
            };
        } else if (col == boardWidth - 1) {
            // Top-right corner
            neighbors = { 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex - 1 + boardWidth), 
                static_cast<uint16_t>(cellIndex + boardWidth) 
            };
        } else {
            // Top edge (not corner)
            neighbors = { 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex + 1), 
                static_cast<uint16_t>(cellIndex - 1 + boardWidth), 
                static_cast<uint16_t>(cellIndex + boardWidth), 
                static_cast<uint16_t>(cellIndex + 1 + boardWidth) 
            };
        }
    } else if (row == boardHeight - 1) {
        // Bottom row
        if (col == 0) {
            // Bottom-left corner
            neighbors = { 
                static_cast<uint16_t>(cellIndex - boardWidth), 
                static_cast<uint16_t>(cellIndex - boardWidth + 1), 
                static_cast<uint16_t>(cellIndex + 1) 
            };
        } else if (col == boardWidth - 1) {
            // Bottom-right corner
            neighbors = { 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex - boardWidth - 1), 
                static_cast<uint16_t>(cellIndex - boardWidth) 
            };
        } else {
            // Bottom edge (not corner)
            neighbors = { 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex + 1), 
                static_cast<uint16_t>(cellIndex - boardWidth + 1), 
                static_cast<uint16_t>(cellIndex - boardWidth - 1), 
                static_cast<uint16_t>(cellIndex - boardWidth) 
            };
        }
    } else {
        // Middle rows
        if (col == 0) {
            // Left edge
            neighbors = { 
                static_cast<uint16_t>(cellIndex - boardWidth), 
                static_cast<uint16_t>(cellIndex - boardWidth + 1), 
                static_cast<uint16_t>(cellIndex + 1), 
                static_cast<uint16_t>(cellIndex + boardWidth), 
                static_cast<uint16_t>(cellIndex + boardWidth + 1) 
            };
        } else if (col == boardWidth - 1) {
            // Right edge
            neighbors = { 
                static_cast<uint16_t>(cellIndex - boardWidth - 1), 
                static_cast<uint16_t>(cellIndex - boardWidth), 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex + boardWidth - 1), 
                static_cast<uint16_t>(cellIndex + boardWidth) 
            };
        } else {
            // Interior cell (not on any edge)
            neighbors = { 
                static_cast<uint16_t>(cellIndex - boardWidth - 1), 
                static_cast<uint16_t>(cellIndex - boardWidth), 
                static_cast<uint16_t>(cellIndex - boardWidth + 1), 
                static_cast<uint16_t>(cellIndex - 1), 
                static_cast<uint16_t>(cellIndex + 1), 
                static_cast<uint16_t>(cellIndex + boardWidth - 1), 
                static_cast<uint16_t>(cellIndex + boardWidth), 
                static_cast<uint16_t>(cellIndex + boardWidth + 1) 
            };
        }
    }
    return neighbors;
}

/**
 * Calculates binomial coefficient for probability calculation
 * 
 * @param left Left operand
 * @param right Right operand
 * @param len Length parameter
 * @return Binomial coefficient result
 */
double calculateBinomialCoefficient(uint16_t left, uint16_t right, uint16_t len) {
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

inline int static popcount128(uint128_t x) {
    return __builtin_popcountll(static_cast<uint64_t>(x)) + __builtin_popcountll(static_cast<uint64_t>(x >> 64));
}

/**
 * Counts numbered cells adjacent to a given cell
 * 
 * @param cellIndex The index of the cell to check around
 * @return Number of adjacent numbered cells
 */
uint8_t static countAdjacentNumberedCells(uint16_t cellIndex) {
    uint8_t count = 0;
    vector<uint16_t> neighbors = getNeighborCells(cellIndex);
    for (uint16_t neighborIndex : neighbors) {
        // If neighbor is a numbered cell (0-8)
        if (gameField[neighborIndex] > 0 && gameField[neighborIndex] < 9)
            count++;
    }
    return count;
}

/**
 * Counts flagged cells adjacent to a given cell
 * 
 * @param cellIndex The index of the cell to check around
 * @return Number of adjacent flagged cells
 */
uint8_t static countAdjacentFlaggedCells(uint16_t cellIndex) {
    uint8_t count = 0;
    vector<uint16_t> neighbors = getNeighborCells(cellIndex);
    for (uint16_t neighborIndex : neighbors) {
        if (gameField[neighborIndex] == 10 || gameField[neighborIndex] == 11)  // 10 represents a flagged cell
            count++;
    }
    return count;
}

/**
 * Counts unopened cells adjacent to a given cell
 * 
 * @param cellIndex The index of the cell to check around
 * @return Number of adjacent unopened cells
 */
uint8_t static countAdjacentUnopenedCells(uint16_t cellIndex) {
    uint8_t count = 0;
    vector<uint16_t> neighbors = getNeighborCells(cellIndex);
    for (uint16_t neighborIndex : neighbors) {
        if (gameField[neighborIndex] == 9)  // 9 represents an unopened cell
            count++;
    }
    return count;
}

/**
 * Generates all possible bit mask combinations with k bits set
 * 
 * @param fullMask The full bit mask to choose from
 * @param k Number of bits to set in each combination
 * @return Vector of all possible combinations
 */
vector<uint128_t> generateBitCombinations128(uint128_t fullMask, int k) {
    vector<int> bitPositions;

    // Find positions of all set bits in the fullMask
    for (int i = 0; i < 128; ++i) {
        if (fullMask & (uint128_t(1) << i)) {
            bitPositions.push_back(i);
        }
    }

    int totalBits = bitPositions.size();
    if (k > totalBits) return {};

    vector<uint128_t> result;

    // Use combinatorial algorithm to generate all combinations
    vector<bool> selection(totalBits);
    fill(selection.begin(), selection.begin() + k, true);

    do {
        uint128_t mask = 0;
        for (int i = 0; i < totalBits; ++i) {
            if (selection[i]) {
                mask |= (uint128_t(1) << bitPositions[i]);
            }
        }
        result.push_back(mask);
    } while (prev_permutation(selection.begin(), selection.end()));

    return result;
}

/**
 * Creates all possible mask combinations for each border cell
 * 
 * @param borderMasks Map of border cells to their bit masks
 * @param borderNumbers Map of border cells to their adjacent mine counts
 * @return Map of border cells to possible bit mask combinations
 */
map<uint16_t, vector<uint128_t>> createBorderCellCombinations128(
    map<uint16_t, uint128_t>& borderMasks, 
    map<uint16_t, uint8_t>& borderNumbers
) {
    map<uint16_t, vector<uint128_t>> maskCombinations;
    for (auto& borderEntry : borderMasks) {
        vector<uint128_t> combinations = generateBitCombinations128(
            borderEntry.second, 
            borderNumbers[borderEntry.first]
        );
        maskCombinations.insert({ borderEntry.first, combinations });
    }
    return maskCombinations;
}

/**
 * Collects data about the field: unopened cells and border cells
 */
void static collectFieldData() {
    uint16_t flagCount = 0;
    
    for (uint16_t cellIndex = 0; cellIndex < fieldSize; cellIndex++) {
        if (gameField[cellIndex] == 9 && countAdjacentNumberedCells(cellIndex) > 0) {
            // Unopened cell adjacent to at least one numbered cell
            unopenedCellsList.emplace_back(cellIndex);
        }
        else if (gameField[cellIndex] != 9 && gameField[cellIndex] != 10 && gameField[cellIndex] != 11 && countAdjacentUnopenedCells(cellIndex) > 0) {
            // Numbered cell adjacent to at least one unopened cell
            borderCellsList.emplace_back(
                cellIndex, 
                static_cast<uint8_t>(gameField[cellIndex] - countAdjacentFlaggedCells(cellIndex))
            );
        }
        else if (gameField[cellIndex] == 10 || gameField[cellIndex] == 11) {
            flagCount++;
        }
    }
    unopenedCellsCount = unopenedCellsList.size();
    remainingMines = totalMines - flagCount;
}

/**
 * Recursively groups connected unopened cells and border cells
 * 
 * @param unopenedCells Vector of unopened cells in the group
 * @param borderCells Vector of border cells in the group
 * @param unopenedChecked Number of unopened cells already checked
 * @param borderChecked Number of border cells already checked
 */
void static buildConnectedGroup(
    vector<uint16_t>& unopenedCells, 
    vector<uint16_t>& borderCells, 
    uint16_t unopenedChecked = 0, 
    uint16_t borderChecked = 0
) {
    // Process newly added unopened cells
    for (uint16_t i = unopenedChecked; i < unopenedCells.size(); i++) {
        vector<uint16_t> neighbors = getNeighborCells(unopenedCells[i]);
        for (uint16_t neighborIndex : neighbors) {
            if (gameField[neighborIndex] < 9) {  // If it's a numbered cell
                if (count(borderCells.begin(), borderCells.end(), neighborIndex) == 0) {
                    borderCells.emplace_back(neighborIndex);
                }
            }
        }
        unopenedChecked++;
    }
    
    // Process newly added border cells
    for (uint16_t i = borderChecked; i < borderCells.size(); i++) {
        vector<uint16_t> neighbors = getNeighborCells(borderCells[i]);
        for (uint16_t neighborIndex : neighbors) {
            if (gameField[neighborIndex] == 9) {  // If it's an unopened cell
                if (count(unopenedCells.begin(), unopenedCells.end(), neighborIndex) == 0) {
                    unopenedCells.emplace_back(neighborIndex);
                }
            }
        }
        borderChecked++;
    }
    
    // If new cells were added, continue recursively
    if (borderChecked == borderCells.size() && unopenedChecked == unopenedCells.size()) {
        return;
    }
    buildConnectedGroup(unopenedCells, borderCells, unopenedChecked, borderChecked);
}

/**
 * Identifies separate connected groups of cells in the field
 * 
 * @param groups Output vector to store the groups
 */
void static identifyConnectedGroups(
    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>>& groups
) {
    uint8_t processedCellsCount = 0;
    
    while (processedCellsCount < unopenedCellsCount) {
        uint16_t startCellIndex;
        
        // Find an unopened cell that hasn't been processed yet
        if (groups.size() != 0) {
            bool skipCell;
            for (int i = 0; i < unopenedCellsCount; i++) {
                skipCell = false;
                for (int g = 0; g < groups.size(); g++) {
                    for (int uog = 0; uog < groups[g].first.size(); uog++) {
                        if (groups[g].first[uog] == unopenedCellsList[i]) {
                            skipCell = true;
                            break;
                        }
                    }
                    if (skipCell) {
                        break;
                    }
                }
                if (!skipCell) {
                    startCellIndex = unopenedCellsList[i];
                    break;
                }
            }
        }
        else {
            startCellIndex = unopenedCellsList[0];
        }
        
        // Create a new group starting from this cell
        vector<uint16_t> unopenedCells = { startCellIndex };
        vector<uint16_t> borderCells;
        buildConnectedGroup(unopenedCells, borderCells);
        
        // Convert border cells to pairs with their mine counts
        vector<pair<uint16_t, uint8_t>> borderCellData;
        for (uint16_t b = 0; b < borderCells.size(); b++) {
            for (uint16_t border = 0; border < borderCellsList.size(); border++) {
                if (borderCells[b] == borderCellsList[border].first) {
                    borderCellData.insert(borderCellData.begin() + b, borderCellsList[border]);
                    break;
                }
            }
        }
        
        processedCellsCount += unopenedCells.size();
        std::sort(unopenedCells.begin(), unopenedCells.end());
        groups.emplace_back(unopenedCells, borderCellData);
    }
}

/**
 * Backtracking algorithm to find possible mine configurations
 * 
 * @param currentConstraint Current border cell being processed
 * @param mask Current mine configuration mask
 * @param uoNeighbors Map of unopened cells to their adjacent border cells
 * @param bcNeighbors Map of border cells to their adjacent unopened cells
 * @param borderCombinations Possible combinations for each border cell
 * @param borderNumbers Map of border cells to their adjacent mine counts
 * @param borderMasks Map of border cells to their bit masks
 * @param combinations Output vector for valid combinations
 */
void backtrackMineConfigurations128(
    const uint16_t currentConstraint, 
    uint128_t mask, 
    const map<uint16_t, vector<uint16_t>>& uoNeighbors, 
    const map<uint16_t, vector<uint16_t>>& bcNeighbors,
    const map<uint16_t, vector<uint128_t>>& borderCombinations, 
    const map<uint16_t, uint8_t>& borderNumbers, 
    const map<uint16_t, uint128_t>& borderMasks, 
    vector<uint128_t>& combinations
) {
    const vector<uint16_t> neighbors = bcNeighbors.at(currentConstraint);
    set<uint16_t> allConstraints;
    
    // Find all constraints that might be affected by the current choice
    for (const uint16_t neighbor : neighbors) {
        const vector<uint16_t> uoNeighbor = uoNeighbors.at(neighbor);
        for (const uint16_t uon : uoNeighbor) {
            allConstraints.insert(uon);
        }
    }
    
    // Try each possible combination for the current constraint
    for (const uint128_t combo : borderCombinations.at(currentConstraint)) {
        const uint128_t newMask = mask | combo;
        bool isValid = true;
        
        // Check if this combination is valid with all constraints
        for (const uint16_t constraint : allConstraints) {
            const uint128_t constraintMask = borderMasks.at(constraint);
            const uint8_t minesRequired = borderNumbers.at(constraint);
            const uint8_t totalCells = popcount128(constraintMask);
            const uint8_t cellsNotInNewMask = popcount128((newMask ^ constraintMask) & constraintMask);
            
            // If the number of remaining cells is less than needed mines, invalid
            if (cellsNotInNewMask < (totalCells - minesRequired)) {
                isValid = false;
                break;
            }
        }
        
        if (isValid) {
            if (currentConstraint != lastConstraintCell) {
                // Move to next constraint
                uint16_t nextConstraint = (++borderMasks.find(currentConstraint))->first;
                backtrackMineConfigurations128(
                    nextConstraint, newMask, uoNeighbors, bcNeighbors, 
                    borderCombinations, borderNumbers, borderMasks, combinations
                );
            }
            else if (popcount128(newMask) <= remainingMines) {
                // We've reached the end of constraints, check if valid
                combinations.emplace_back(newMask);
            }
        }
    }
}

/**
 * Finds all possible mine configurations for a group of cells
 * 
 * @param unopenedCells Vector of unopened cells in the group
 * @param borderCells Vector of border cells with their mine counts
 * @return Pair of vectors: possible configurations and mapping to global indices
 */
pair<vector<uint128_t>, vector<uint8_t>> findPossibleConfigurations128(
    const vector<uint16_t> unopenedCells, 
    const vector<pair<uint16_t, uint8_t>> borderCells
) {
    vector<uint128_t> combinations;
    vector<uint8_t> localToGlobalMap(unopenedCells.size());
    map<uint16_t, uint8_t> cellToBitPosition;
    
    // Create mapping between local and global indices
    for (int i = 0; i < unopenedCells.size(); i++) {
        localToGlobalMap[i] = find(unopenedCellsList.begin(), unopenedCellsList.end(), unopenedCells[i]) - unopenedCellsList.begin();
        cellToBitPosition.insert({ unopenedCells[i], i });
    }
    
    vector<pair<uint128_t, uint8_t>> borderInfo;
    set<uint128_t> seenMasks;
    set<uint128_t> borderCellSet;
    vector<uint16_t> borderCellVector;
    set<uint16_t> unopenedCellSet;
    map<uint16_t, vector<uint16_t>> unopenedToNeighbors;
    map<uint16_t, vector<uint16_t>> borderToNeighbors;
    map<uint16_t, uint8_t> borderToNumbers;
    map<uint16_t, uint128_t> borderToMasks;
    
    // Create masks for each border cell
    for (const auto& [cellIndex, mineCount] : borderCells) {
        const vector<uint16_t> neighbors = getNeighborCells(cellIndex);
        uint128_t mask = 0;
        
        for (const uint16_t neighborIndex : neighbors) {
            const auto it = cellToBitPosition.find(neighborIndex);
            if (it != cellToBitPosition.end()) {
                mask |= uint128_t(1) << it->second;
            }
        }
        
        if (seenMasks.find(mask) == seenMasks.end()) {
            seenMasks.insert(mask);
            borderCellSet.insert(cellIndex);
            borderInfo.push_back({ mask, mineCount });
            borderToNumbers.insert({ cellIndex, mineCount });
            borderToMasks.insert({ cellIndex, mask });
            borderCellVector.push_back(cellIndex);
        }
    }
    
    // Build neighbor relationships
    for (const uint16_t cell : unopenedCells) {
        unopenedCellSet.insert(cell);
        unopenedToNeighbors.insert({ cell, vector<uint16_t>() });
        const vector<uint16_t> neighbors = getNeighborCells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (borderCellSet.count(neighbor) > 0) {
                unopenedToNeighbors[cell].push_back(neighbor);
            }
        }
    }
    
    for (const uint16_t cell : borderCellSet) {
        borderToNeighbors.insert({ cell, vector<uint16_t>() });
        const vector<uint16_t> neighbors = getNeighborCells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (unopenedCellSet.count(neighbor) > 0) {
                borderToNeighbors[cell].push_back(neighbor);
            }
        }
    }
    
    // Generate possible combinations for each border cell
    const map<uint16_t, vector<uint128_t>> borderCombinations = createBorderCellCombinations128(borderToMasks, borderToNumbers);
    
    // If there are border cells, run backtracking
    if (!borderCellSet.empty()) {
        lastConstraintCell = *borderCellSet.rbegin();
        backtrackMineConfigurations128(
            *borderCellSet.begin(), 0, 
            unopenedToNeighbors, borderToNeighbors, 
            borderCombinations, borderToNumbers, borderToMasks, 
            combinations
        );
    }

    return {combinations, localToGlobalMap};
}

void static backtrackGenCombs(
    const int index, 
    const uint16_t usedMines, 
    const vector<map<uint8_t, vector<uint64_t>>>& groupMaps,
    vector<uint16_t>& counts,
    vector<vector<uint64_t>>& globalResult,
    vector<uint8_t>& globalNumToIndex
) {
    if (usedMines > remainingMines) return;

    if (index == groupMaps.size()) {
        globalResult.emplace_back(vector<uint64_t>(unopenedCellsCount + 1));
        globalNumToIndex.emplace_back(usedMines);
        uint64_t mult = 1;
        for (int group = 0; group < groupMaps.size(); group++) {
            mult *= groupMaps[group].at(static_cast<uint8_t>(counts[group]))[unopenedCellsCount];
        }
        for (int group = 0; group < groupMaps.size(); group++) {
            const uint64_t count = groupMaps[group].at(static_cast<uint8_t>(counts[group]))[unopenedCellsCount];

            for (uint8_t cell = 0; cell < unopenedCellsCount; cell++) {
                globalResult.back()[cell] += (groupMaps[group].at(static_cast<uint8_t>(counts[group]))[cell] * (mult / count));
            }
        }
        globalResult.back()[unopenedCellsCount] = mult;
        return;
    }

    for (const auto& [cnt, array] : groupMaps[index]) {
        counts[index] = cnt;
        backtrackGenCombs(
            index + 1,
            usedMines + cnt,
            groupMaps,
            counts,
            globalResult,
            globalNumToIndex
        );
    }
}

map<uint8_t, vector<uint64_t>> generateCombinations(
    const vector<vector<uint128_t>>& maskGroups,
    const vector<vector<uint8_t>>& localMappings
) {
    vector<map<uint8_t, vector<uint64_t>>> groupMaps(maskGroups.size());
    for (int i = 0; i < maskGroups.size(); i++) {
        vector<vector<uint64_t>> result;
        map<uint8_t, uint8_t> numToIndex;
        const vector<uint8_t> localMapping = localMappings[i];
        const vector<uint128_t> group = maskGroups[i];
        for (const uint128_t localMask : group) {
            const uint8_t setCount = popcount128(localMask);
            const auto [it, inserted] = numToIndex.try_emplace(setCount, result.size());
            if (inserted) {
                result.emplace_back(vector<uint64_t>(unopenedCellsCount + 1));
            }

            for (uint8_t j = 0; j < localMapping.size(); j++) {
                if ((localMask >> j) & 1) {
                    result[numToIndex[setCount]][localMapping[j]]++;
                }
            }
            result[numToIndex[setCount]][unopenedCellsCount]++;
        }
        map<uint8_t, vector<uint64_t>> combs;
        for (const auto& [num, index] : numToIndex) {
            combs.insert({num, result[index]});
        }
        groupMaps[i] = combs;
    }
    vector<uint16_t> counts(groupMaps.size());
    vector<vector<uint64_t>> globalResult;
    vector<uint8_t> globalNumToIndex;
    backtrackGenCombs(0, 0, groupMaps, counts, globalResult, globalNumToIndex);

    map<uint8_t, vector<uint64_t>> globalRes;
    for (int ind = 0; ind < globalNumToIndex.size(); ind++) {
        const auto [it, inserted] = globalRes.try_emplace(globalNumToIndex[ind], globalResult[ind]);
        if (!inserted) {
            for (uint8_t cell = 0; cell < unopenedCellsCount + 1; cell++) {
                globalRes[globalNumToIndex[ind]][cell] += globalResult[ind][cell];
            }
        }
    }
    return globalRes;
} 

/**
 * Calculates probabiliy for every closed cell on field to be a mine
 * 
 * @param combinations Map of mine count to occurances vector
 */
void calculateProbabilies(const map<uint8_t, vector<uint64_t>>& combinations) {
    vector<uint16_t> floatingTilesList;
    for (uint16_t cell = 0; cell < fieldSize; cell++) {
        if (gameField[cell] == 9) {
            if (countAdjacentNumberedCells(cell) == 0) {
                floatingTilesList.emplace_back(cell);
            }
        }
    }
    const uint16_t floatingTilesCount = floatingTilesList.size();

    if (remainingMines - combinations.begin()->first <= floatingTilesCount) {
        uint16_t vUO = UINT16_MAX, vFL = UINT16_MAX;
        for (const auto& [m, arr] : combinations) {
            int16_t minUO = min(remainingMines - m, floatingTilesCount - (remainingMines - m));
            if (vUO > minUO) 
                vUO = minUO;
            int16_t minFL = min(remainingMines - m - 1, floatingTilesCount - (remainingMines - m));
            if (vFL > minFL && minFL >= 0) 
                vFL = minFL;
            else if (minFL < 0) vFL = 0;
        }

        map<uint8_t, double> weights;
        double weightsFl = 0, sumweights = 0;

        for (const auto& [m, arr] : combinations) {
            const uint16_t right = min(remainingMines - m, floatingTilesCount - (remainingMines - m));
            const uint16_t len = right - vUO;
            const uint16_t left = floatingTilesCount + 1 - right;
            const double weight = calculateBinomialCoefficient(left, right, len);

            const uint16_t rightFl = min(remainingMines - m - 1, floatingTilesCount - (remainingMines - m));
            const uint16_t lenFl = rightFl - vFL;
            const uint16_t leftFl = floatingTilesCount - rightFl;
            const double weightFl = calculateBinomialCoefficient(leftFl, rightFl, lenFl);

            weightsFl += weightFl * arr[unopenedCellsCount];
            sumweights += weight * arr[unopenedCellsCount];
            weights.insert({ m, weight });
        }

        double floatingTilesProbability = weightsFl / sumweights;
        if (vUO > 0 || vFL > 0) {
            if (vUO == vFL) {
                floatingTilesProbability *= ((static_cast<double>(floatingTilesCount) - vFL) / floatingTilesCount);
            }
            else {
                floatingTilesProbability *= (static_cast<double>(vUO) / floatingTilesCount);
            }
        }
        const uint8_t fTProbabilityUInt = round(floatingTilesProbability * 100) + 151;
        for (const auto tile : floatingTilesList) {
            gameField[tile] = fTProbabilityUInt;
        }
        
        for (uint8_t cell = 0; cell < unopenedCellsCount; cell++) {
            double cellWeight = 0;
            for (const auto& entry : combinations) {
                cellWeight += entry.second[cell] * weights[entry.first];
            }
            gameField[unopenedCellsList[cell]] = static_cast<uint8_t>(round(cellWeight / sumweights * 100) + 50);
        }
    }
}

/**
 * Sets trivial flags on game field
 * 
*/
void setTrivialFlags() {
    vector<uint8_t> tempField(fieldSize);
    for (int i = 0; i < fieldSize; i++) {
        uint8_t unopened = countAdjacentUnopenedCells(i);
        if (gameField[i] > 0 && unopened > 0 && unopened == gameField[i] - countAdjacentFlaggedCells(i)) {
            vector<uint16_t> neis = getNeighborCells(i);
            for (uint16_t nei : neis) {
                if (gameField[nei] == 9)
                    tempField[nei] = 11;
                else
                    tempField[nei] = gameField[nei];
            }
            tempField[i] = gameField[i];
        }
        else if (tempField[i] != 11)
            tempField[i] = gameField[i];
    }
    for (int i = 0; i < fieldSize; i++) {
        gameField[i] = tempField[i];
    }
}

/** 
 * The module entry point 
 * 
 * @param field Vector of game field state
 * @param w Field width
 * @param h Field height
 * @param m Total number of mines of field
 * @return Vector of game field with calculated probabilities
*/
vector<uint8_t> probabilities(vector<uint8_t> field, uint8_t w, uint8_t h, uint16_t m) {
    boardWidth = w;
    boardHeight = h;
    totalMines = m;
    fieldSize = field.size();
    gameField.clear();
    gameField.resize(fieldSize);
    for (int i = 0; i < fieldSize; i++) {
        gameField[i] = field[i];
    }
    
    setTrivialFlags();
    
    borderCellsList.clear();
    unopenedCellsList.clear();
    unopenedCellsCount = 0;

    collectFieldData();

    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>> groups;
    identifyConnectedGroups(groups);

    if (groups.size() == 0) {
        return { 21 };
    }

    vector<vector<uint128_t>> combinationsGroups;
    vector<vector<uint8_t>> localMappingsGroups;

    for (uint8_t group = 0; group < groups.size(); group++) {
        auto [unopenedCells, borderCells] = groups[group];
        if (unopenedCells.size() > 128) {
            return { 20 };
        }
        const auto [groupCombinations, groupMapping] = findPossibleConfigurations128(unopenedCells, borderCells);
        combinationsGroups.emplace_back(groupCombinations);
        localMappingsGroups.emplace_back(groupMapping);
    }

    const map<uint8_t, vector<uint64_t>> combinations = generateCombinations(combinationsGroups, localMappingsGroups);

    if (combinations.size() == 0) {
        return { 22 };
    }

    calculateProbabilies(combinations);

    return gameField;
}

//em++ calc.cpp -o calc.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Calc -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("probabilities", &probabilities);
    register_vector<uint8_t>("vectorUint8_t");
}