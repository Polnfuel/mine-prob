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
vector<uint64_t> generateBitCombinations(uint64_t fullMask, int k) {
    vector<int> bitPositions;

    // Find positions of all set bits in the fullMask
    for (int i = 0; i < 64; ++i) {
        if (fullMask & (uint64_t(1) << i)) {
            bitPositions.push_back(i);
        }
    }

    int totalBits = bitPositions.size();
    if (k > totalBits) return {};

    vector<uint64_t> result;

    // Use combinatorial algorithm to generate all combinations
    vector<bool> selection(totalBits);
    fill(selection.begin(), selection.begin() + k, true);

    do {
        uint64_t mask = 0;
        for (int i = 0; i < totalBits; ++i) {
            if (selection[i]) {
                mask |= (uint64_t(1) << bitPositions[i]);
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
map<uint16_t, vector<uint64_t>> createBorderCellCombinations(
    map<uint16_t, uint64_t>& borderMasks, 
    map<uint16_t, uint8_t>& borderNumbers
) {
    map<uint16_t, vector<uint64_t>> maskCombinations;
    for (auto& borderEntry : borderMasks) {
        vector<uint64_t> combinations = generateBitCombinations(
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
void backtrackMineConfigurations(
    uint16_t currentConstraint, 
    uint64_t mask, 
    map<uint16_t, vector<uint16_t>>& uoNeighbors, 
    map<uint16_t, vector<uint16_t>>& bcNeighbors,
    map<uint16_t, vector<uint64_t>>& borderCombinations, 
    map<uint16_t, uint8_t>& borderNumbers, 
    map<uint16_t, uint64_t>& borderMasks, 
    vector<uint64_t>& combinations
) {
    vector<uint16_t> neighbors = bcNeighbors[currentConstraint];
    set<uint16_t> allConstraints;
    
    // Find all constraints that might be affected by the current choice
    for (uint16_t neighbor : neighbors) {
        vector<uint16_t> uoNeighbor = uoNeighbors[neighbor];
        for (uint16_t uon : uoNeighbor) {
            allConstraints.insert(uon);
        }
    }
    
    // Try each possible combination for the current constraint
    for (uint64_t combo : borderCombinations[currentConstraint]) {
        uint64_t newMask = mask | combo;
        bool isValid = true;
        
        // Check if this combination is valid with all constraints
        for (uint16_t constraint : allConstraints) {
            uint64_t constraintMask = borderMasks[constraint];
            uint8_t minesRequired = borderNumbers[constraint];
            uint8_t totalCells = __builtin_popcountll(constraintMask);
            uint8_t cellsNotInNewMask = __builtin_popcountll((newMask ^ constraintMask) & constraintMask);
            
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
                backtrackMineConfigurations(
                    nextConstraint, newMask, uoNeighbors, bcNeighbors, 
                    borderCombinations, borderNumbers, borderMasks, combinations
                );
            }
            else {
                // We've reached the end of constraints, check if valid
                if (__builtin_popcountll(newMask) <= remainingMines)
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
pair<vector<uint64_t>, vector<uint8_t>> findPossibleConfigurations(
    vector<uint16_t> unopenedCells, 
    vector<pair<uint16_t, uint8_t>> borderCells
) {
    vector<uint64_t> combinations;
    vector<uint8_t> localToGlobalMap(unopenedCells.size());
    map<uint16_t, uint8_t> cellToBitPosition;
    
    // Create mapping between local and global indices
    for (int i = 0; i < unopenedCells.size(); i++) {
        localToGlobalMap[i] = find(unopenedCellsList.begin(), unopenedCellsList.end(), unopenedCells[i]) - unopenedCellsList.begin();
        cellToBitPosition.insert({ unopenedCells[i], i });
    }
    
    vector<pair<uint64_t, uint8_t>> borderInfo;
    set<uint64_t> seenMasks;
    set<uint16_t> borderCellSet;
    vector<uint16_t> borderCellVector;
    set<uint16_t> unopenedCellSet;
    map<uint16_t, vector<uint16_t>> unopenedToNeighbors;
    map<uint16_t, vector<uint16_t>> borderToNeighbors;
    map<uint16_t, uint8_t> borderToNumbers;
    map<uint16_t, uint64_t> borderToMasks;
    
    // Create masks for each border cell
    for (auto& [cellIndex, mineCount] : borderCells) {
        vector<uint16_t> neighbors = getNeighborCells(cellIndex);
        uint64_t mask = 0;
        
        for (const uint16_t neighborIndex : neighbors) {
            const auto it = cellToBitPosition.find(neighborIndex);
            if (it != cellToBitPosition.end()) {
                mask |= 1ull << it->second;
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
    for (uint16_t cell : unopenedCells) {
        unopenedCellSet.insert(cell);
        unopenedToNeighbors.insert({ cell, vector<uint16_t>() });
        vector<uint16_t> neighbors = getNeighborCells(cell);
        
        for (uint16_t neighbor : neighbors) {
            if (borderCellSet.count(neighbor) > 0) {
                unopenedToNeighbors[cell].push_back(neighbor);
            }
        }
    }
    
    for (uint16_t cell : borderCellSet) {
        borderToNeighbors.insert({ cell, vector<uint16_t>() });
        vector<uint16_t> neighbors = getNeighborCells(cell);
        
        for (uint16_t neighbor : neighbors) {
            if (unopenedCellSet.count(neighbor) > 0) {
                borderToNeighbors[cell].push_back(neighbor);
            }
        }
    }
    
    // Generate possible combinations for each border cell
    map<uint16_t, vector<uint64_t>> borderCombinations = createBorderCellCombinations(borderToMasks, borderToNumbers);
    
    // If there are border cells, run backtracking
    if (!borderCellSet.empty()) {
        lastConstraintCell = *borderCellSet.rbegin();
        backtrackMineConfigurations(
            *borderCellSet.begin(), 0, 
            unopenedToNeighbors, borderToNeighbors, 
            borderCombinations, borderToNumbers, borderToMasks, 
            combinations
        );
    }

    return {combinations, localToGlobalMap};
}

/**
 * Backtracking algorithm for 128-bit masks (for large fields)
 * 
 * @param index Current group index
 * @param currentMask Current global mine configuration mask
 * @param usedMines Number of mines used so far
 * @param globalGroups Map of global mask to count for each group
 * @param result Output vector for probability calculations
 * @param numToIndex Map of mine count to index in result
 */
void static backtrack128(
    const uint8_t index, 
    const __uint128_t currentMask, 
    const uint8_t usedMines,
    vector<map<__uint128_t, uint8_t>>& globalGroups,
    vector<vector<uint32_t>>& result,
    map<uint8_t, uint8_t>& numToIndex
) {
    // Stop if we've used too many mines
    if (usedMines > remainingMines) return;

    // We've processed all groups, add result
    if (index == globalGroups.size()) {
        auto [it, inserted] = numToIndex.try_emplace(usedMines, result.size());
        if (inserted) {
            result.emplace_back(vector<uint32_t>(unopenedCellsCount + 1));
        }
        
        // Update probabilities for each cell
        for (uint8_t i = 0; i < unopenedCellsCount; i++){
            if ((currentMask >> i) & (__uint128_t)1){
                result[numToIndex[usedMines]][i]++;
            }
        }
        result[numToIndex[usedMines]][unopenedCellsCount]++;
        return;
    }

    // Try each mask from the current group
    for (const auto& [mask, count] : globalGroups[index]) {
        backtrack128(
            index + 1, 
            currentMask | mask, 
            usedMines + count, 
            globalGroups, 
            result, 
            numToIndex
        );
    }
}

/**
 * Generates combined probabilities for large fields (>64 cells)
 * 
 * @param maskGroups Vector of configuration masks for each group
 * @param localMappings Vector of local to global index mappings
 * @return Map of mine count to probability vector
 */
map<uint8_t, vector<uint32_t>> static generateCombinedProbabilities128(
    const vector<vector<uint64_t>>& maskGroups, 
    const vector<vector<uint8_t>>& localMappings
) {
    vector<vector<uint32_t>> result;
    map<uint8_t, uint8_t> numToIndex;
    const uint8_t groupCount = maskGroups.size();

    // Convert local masks to global masks
    vector<map<__uint128_t, uint8_t>> globalGroups(groupCount);
    for (uint8_t i = 0; i < groupCount; i++) {
        const vector<uint8_t> localMapping = localMappings[i];
        const vector<uint64_t> group = maskGroups[i];
        
        for (uint64_t localMask : group) {
            __uint128_t globalMask = 0;
            uint8_t setCount = 0;
            
            // Convert each bit in the local mask to its global position
            for (uint8_t j = 0; j < localMapping.size(); j++) {
                if ((localMask >> j) & 1) {
                    globalMask |= ((__uint128_t)1 << localMapping[j]);
                    setCount++;
                }
            }
            globalGroups[i].insert({ globalMask, setCount });
        }
    }
    
    // Run backtracking to combine groups
    backtrack128(0, 0, 0, globalGroups, result, numToIndex);
    
    // Convert result to map by mine count
    map<uint8_t, vector<uint32_t>> combinations;
    for (const auto& [num, index] : numToIndex) {
        combinations.insert({ num, result[index] });
    }
    return combinations;
}

/**
 * Backtracking algorithm for 64-bit masks (for small/medium fields)
 * 
 * @param index Current group index
 * @param currentMask Current global mine configuration mask
 * @param usedMines Number of mines used so far
 * @param globalGroups Map of global mask to count for each group
 * @param result Output vector for probability calculations
 * @param numToIndex Map of mine count to index in result
 */
void static backtrack64(
    const uint8_t index, 
    const uint64_t currentMask, 
    const uint8_t usedMines,
    vector<map<uint64_t, uint8_t>>& globalGroups,
    vector<vector<uint32_t>>& result,
    map<uint8_t, uint8_t>& numToIndex
) {
    // Stop if we've used too many mines
    if (usedMines > remainingMines) return;

    // We've processed all groups, add result
    if (index == globalGroups.size()) {
        auto [it, inserted] = numToIndex.try_emplace(usedMines, result.size());
        if (inserted) {
            result.emplace_back(vector<uint32_t>(unopenedCellsCount + 1));
        }
        
        // Update probabilities for each cell
        for (uint8_t i = 0; i < unopenedCellsCount; i++) {
            if ((currentMask >> i) & 1ull) {
                result[numToIndex[usedMines]][i]++;
            }
        }
        result[numToIndex[usedMines]][unopenedCellsCount]++;
        return;
    }

    // Try each mask from the current group
    for (const auto& [mask, count] : globalGroups[index]) {
        backtrack64(
            index + 1, 
            currentMask | mask, 
            usedMines + count, 
            globalGroups, 
            result, 
            numToIndex
        );
    }
}

/**
 * Generates combined probabilities for smaller fields (<= 64 cells)
 * 
 * @param maskGroups Vector of configuration masks for each group
 * @param localMappings Vector of local to global index mappings
 * @return Map of mine count to probability vector
 */
map<uint8_t, vector<uint32_t>> static generateCombinedProbabilities64(
    const vector<vector<uint64_t>>& maskGroups, 
    const vector<vector<uint8_t>>& localMappings
) {
    vector<vector<uint32_t>> result;
    map<uint8_t, uint8_t> numToIndex;
    const uint8_t groupCount = maskGroups.size();

    // Convert local masks to global masks
    vector<map<uint64_t, uint8_t>> globalGroups(groupCount);
    for (uint8_t i = 0; i < groupCount; i++) {
        const vector<uint8_t> localMapping = localMappings[i];
        const vector<uint64_t> group = maskGroups[i];

        for (uint64_t localMask : group) {
            uint64_t globalMask = 0;
            uint8_t setCount = 0;

            //Convert each bit in the local mask to its global position
            for (uint8_t j = 0; j < localMapping.size(); j++) {
                if ((localMask >> j) & 1) {
                    globalMask |= (1ull << localMapping[j]);
                    setCount++;
                }
            }
            globalGroups[i].insert({ globalMask, setCount });
        }
    }

    //Run backtracking to combine groups
    backtrack64(0, 0, 0, globalGroups, result, numToIndex);

    //Convert result to map by mine count
    map<uint8_t, vector<uint32_t>> combinations;
    for (const auto& [num, index] : numToIndex) {
        combinations.insert({ num, result[index] });
    }
    return combinations;
}

/**
 * Calculates probabiliy for every closed cell on field to be a mine
 * 
 * @param combinations Map of mine count to occurances vector
 */
void calculateProbabilies(map<uint8_t, vector<uint32_t>>& combinations) {
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
 * @return Field with trivial flags
*/
vector<uint8_t> setTrivialFlags() {
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
    return tempField;
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
    //Initializing global values
    boardWidth = w;
    boardHeight = h;
    totalMines = m;
    fieldSize = field.size();
    gameField.clear();
    gameField.resize(fieldSize);
    for (int i = 0; i < fieldSize; i++) {
        gameField[i] = field[i];
    }
    vector<uint8_t> flaggedField = setTrivialFlags();
    for (int i = 0; i < fieldSize; i++) {
        gameField[i] = flaggedField[i];
    }
    
    borderCellsList.clear();
    unopenedCellsList.clear();
    unopenedCellsCount = 0;

    collectFieldData();
    if (unopenedCellsCount > 128) {
        return { 20 };
    }

    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>> groups;
    identifyConnectedGroups(groups);

    if (groups.size() == 0) {
        return { 21 };
    }

    vector<vector<uint64_t>> combinationsGroups;
    vector<vector<uint8_t>> localMappingsGroups;
    for (uint8_t group = 0; group < groups.size(); group++) {
        auto [unopenedCells, borderCells] = groups[group];
        if (unopenedCells.size() > 64) {
            return { 20 };
        }
        const auto [groupCombinations, groupMapping] = findPossibleConfigurations(unopenedCells, borderCells);
        combinationsGroups.emplace_back(groupCombinations);
        localMappingsGroups.emplace_back(groupMapping);
    }

    map<uint8_t, vector<uint32_t>> combinations;
    if (unopenedCellsCount <= 64) {
        combinations = generateCombinedProbabilities64(combinationsGroups, localMappingsGroups);
    }
    else if (unopenedCellsCount > 64) {
        combinations = generateCombinedProbabilities128(combinationsGroups, localMappingsGroups);
    }

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