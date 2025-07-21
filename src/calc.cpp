#include <cstdint>
#include <cmath>
#include <algorithm>
#include <vector>
#include <set>
#include <utility>
#include <emscripten/bind.h>

#include "vecmap.h"

using namespace std;

typedef __uint128_t uint128_t;

// Global variables
static vector<uint8_t> game_field;                     // Game field state
static uint16_t field_size;                            // Total number of cells in the field
static uint8_t field_width, field_height;              // Dimensions of the game board
static uint16_t remain_mines;                          // Number of mines not yet flagged
static uint16_t total_mines;                           // Total number of mines in the game
static uint16_t last_number;                           // Last cell in the number cell list (for backtracking)
static vector<uint16_t> edge_cells_list;               // List of all closed cells adjacent to numbered cells
static uint8_t edge_cells_count;                       // Count of edge cells in the list
static vector<pair<uint16_t, uint8_t>> num_cells_list; // List of numbered cells with adjacent closed cells
static vector<uint16_t> float_cell_list;
static uint16_t float_cell_count;

static vector<vector<uint16_t>> cache;

//Returns neighbor cells indeces of a given cell index
inline static const vector<uint16_t>& get_neighbor_cells(uint16_t cell) {
    return cache[cell];
}

//Calculates weight
double static calc_weight(uint16_t left, uint16_t right, uint16_t len) {
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

//Popcount for uint128_t type
inline int static popcount128(uint128_t x) {
    return __builtin_popcountll(static_cast<uint64_t>(x)) + __builtin_popcountll(static_cast<uint64_t>(x >> 64));
}

//Counts cells with number adjacent to a given cell
uint8_t static count_number_cells(uint16_t cell_index) {
    uint8_t count = 0;
    const vector<uint16_t>& neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] > 0 && game_field[neighbor_index] < 9)
            count++;
    }
    return count;
}

//Counts cells with flag adjacent to a given cell
uint8_t static count_flagged_cells(uint16_t cell_index) {
    uint8_t count = 0;
    const vector<uint16_t>& neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] == 10 || game_field[neighbor_index] == 11)
            count++;
    }
    return count;
}

//Counts closed cells adjacent to a given cell
uint8_t static count_closed_cells(uint16_t cell_index) {
    uint8_t count = 0;
    const vector<uint16_t>& neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] == 9)
            count++;
    }
    return count;
}

//Initializes lists of edge and number cells and remaining mines
void static get_field_data() {
    uint16_t flag_count = 0;
    
    for (uint16_t cell_index = 0; cell_index < field_size; cell_index++) {
        if (game_field[cell_index] == 9 && count_number_cells(cell_index) > 0) {
            edge_cells_list.emplace_back(cell_index);
        }
        else if (game_field[cell_index] == 9 && count_number_cells(cell_index) == 0) {
            float_cell_list.emplace_back(cell_index);
        }
        else if (game_field[cell_index] != 9 && game_field[cell_index] != 10 && game_field[cell_index] != 11 && count_closed_cells(cell_index) > 0) {
            num_cells_list.emplace_back(
                cell_index, 
                uint8_t(game_field[cell_index] - count_flagged_cells(cell_index))
            );
        }
        else if (game_field[cell_index] == 10 || game_field[cell_index] == 11) {
            flag_count++;
        }
    }
    float_cell_count = float_cell_list.size();
    edge_cells_count = edge_cells_list.size();
    remain_mines = total_mines - flag_count;
}

//Makes one cell group
void static make_cell_group(vector<uint16_t>& edge_cells, vector<uint16_t>& num_cells ) {
    uint16_t edges_checked = 0;
    uint16_t nums_checked = 0;
    do {
        // Process newly added edge cells
        for (uint16_t i = edges_checked; i < edge_cells.size(); i++) {
            const vector<uint16_t>& neighbors = get_neighbor_cells(edge_cells[i]);
            for (const uint16_t neighbor_index : neighbors) {
                if (game_field[neighbor_index] < 9) {
                    if (count(num_cells.begin(), num_cells.end(), neighbor_index) == 0) {
                        num_cells.emplace_back(neighbor_index);
                    }
                }
            }
            edges_checked++;
        }

        // Process newly added number cells
        for (uint16_t i = nums_checked; i < num_cells.size(); i++) {
            const vector<uint16_t>& neighbors = get_neighbor_cells(num_cells[i]);
            for (const uint16_t neighbor_index : neighbors) {
                if (game_field[neighbor_index] == 9) {
                    if (count(edge_cells.begin(), edge_cells.end(), neighbor_index) == 0) {
                        edge_cells.emplace_back(neighbor_index);
                    }
                }
            }
            nums_checked++;
        }
    } while (nums_checked != num_cells.size() || edges_checked != edge_cells.size());
}

//Defines separate cell groups on field
void static get_cell_groups(vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>>& groups) {
    uint8_t checked_count = 0;
    
    while (checked_count < edge_cells_count) {
        uint16_t first_cell;
        
        // Find an edge cell that hasn't been checked yet
        if (groups.size() != 0) {
            bool skip;
            for (int i = 0; i < edge_cells_count; i++) {
                skip = false;
                for (int g = 0; g < groups.size(); g++) {
                    for (int edgecell = 0; edgecell < groups[g].first.size(); edgecell++) {
                        if (groups[g].first[edgecell] == edge_cells_list[i]) {
                            skip = true;
                            break;
                        }
                    }
                    if (skip) {
                        break;
                    }
                }
                if (!skip) {
                    first_cell = edge_cells_list[i];
                    break;
                }
            }
        }
        else {
            first_cell = edge_cells_list[0];
        }
        
        // Create a new group starting from this cell
        vector<uint16_t> edge_cells = { first_cell };
        vector<uint16_t> num_cells;
        make_cell_group(edge_cells, num_cells);
        
        // Convert number cells to pairs with their mine counts
        vector<pair<uint16_t, uint8_t>> num_cells_with_counts;
        for (uint16_t n = 0; n < num_cells.size(); n++) {
            for (uint16_t num = 0; num < num_cells_list.size(); num++) {
                if (num_cells[n] == num_cells_list[num].first) {
                    num_cells_with_counts.insert(num_cells_with_counts.begin() + n, num_cells_list[num]);
                    break;
                }
            }
        }
        
        checked_count += edge_cells.size();
        std::sort(edge_cells.begin(), edge_cells.end());
        groups.emplace_back(edge_cells, num_cells_with_counts);
    }
}

//Generates all possible bit mask combinations with k bits set for a given mask
void static bit_combinations(uint128_t full_mask, uint8_t k, vector<uint128_t>& result) {
    vector<uint8_t> bit_positions;

    // Find positions of all set bits in the full_mask
    for (uint8_t i = 0; i < 128; i++) {
        if (full_mask & (uint128_t(1) << i)) {
            bit_positions.emplace_back(i);
        }
    }

    const uint8_t total_bits = bit_positions.size();
    if (k > total_bits) {
        result = {};
        return;
    };

    // Use combinatorial algorithm to generate all combinations
    vector<bool> selection(total_bits);
    fill(selection.begin(), selection.begin() + k, true);

    do {
        uint128_t mask = 0;
        for (uint8_t i = 0; i < total_bits; i++) {
            if (selection[i]) {
                mask |= (uint128_t(1) << bit_positions[i]);
            }
        }
        result.emplace_back(mask);
    } while (prev_permutation(selection.begin(), selection.end()));
}

//Generates possible combinations for each number cell
void static num_cell_bit_combinations(
    const vecmap<uint16_t, uint128_t>& num_masks, 
    const vecmap<uint16_t, uint8_t>& num_mines,
    vecmap<uint16_t, vector<uint128_t>>& num_combinations
) {
    for (const auto& entry : num_masks) {
        vector<uint128_t> combinations; 
        bit_combinations(
            entry.second, 
            num_mines.at(entry.first),
            combinations
        );
        num_combinations.emplace(entry.first, combinations);
    }
}

//Backtracking algorithm to find possible mine configurations
void static mine_combinations(
    uint16_t current_number, uint128_t mask,
    const vecmap<uint16_t, vector<uint16_t>>& edge_neighbors, const vecmap<uint16_t, vector<uint16_t>>& num_neighbors,
    const vecmap<uint16_t, vector<uint128_t>>& num_combinations, const vecmap<uint16_t, uint8_t>& num_mines,
    const vecmap<uint16_t, uint128_t>& num_masks, vector<uint128_t>& combinations
) {
    const vector<uint16_t>& neighbors = num_neighbors.at(current_number);
    mini_set16 constraints;
    
    // Find all number cells that might be affected by the current choice
    for (const uint16_t neighbor : neighbors) {
        const vector<uint16_t>& edges = edge_neighbors.at(neighbor);
        for (const uint16_t edge : edges) {
            constraints.insert(edge);
        }
    }
    const vector<uint128_t>& combs = num_combinations.at(current_number);
    // Try each possible combination for the current constraint
    for (const uint128_t combo : combs) {
        const uint128_t new_mask = mask | combo;
        bool valid = true;
        
        // Check if this combination is valid with all constraints
        for (const uint16_t constraint : constraints) {
            const uint128_t constraint_mask = num_masks.at(constraint);
            const uint8_t mines = num_mines.at(constraint);
            const uint8_t total_mines = popcount128(constraint_mask);
            const uint8_t different_bits = popcount128((new_mask ^ constraint_mask) & constraint_mask);
            
            // If the number of remaining cells is less than needed mines, invalid
            if (different_bits < (total_mines - mines)) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            if (current_number != last_number) {
                // Move to next constraint
                const uint16_t next_number = num_masks.next_key(current_number);
                mine_combinations(
                    next_number, new_mask, edge_neighbors, num_neighbors, 
                    num_combinations, num_mines, num_masks, combinations
                );
            }
            else if (popcount128(new_mask) <= remain_mines) {
                // We've reached the end of constraints, check if length's valid
                combinations.emplace_back(new_mask);
            }
        }
    }
}

// Finds all possible masks of bomb placements in given edge cells
// Also returns mapping of group's edge cells to all edge cells on field
void static find_bomb_combinations_masks(
    const vector<uint16_t>& edge_cells, const vector<pair<uint16_t, uint8_t>>& num_cells,
    vector<uint128_t>& combinations, vector<uint8_t>& mapping
) {
    combinations.reserve(edge_cells.size() * 5);
    mapping = vector<uint8_t>(edge_cells.size());
    vecmap<uint16_t, uint8_t> cell_to_bit(edge_cells.size());
    size_t num_size = num_cells.size();
    
    // Create mapping between local and global indices
    for (uint8_t i = 0; i < edge_cells.size(); i++) {
        mapping[i] = find(edge_cells_list.begin(), edge_cells_list.end(), edge_cells[i]) - edge_cells_list.begin();
        cell_to_bit.emplace(edge_cells[i], i);
    }
    cell_to_bit.sort();
    
    set<uint128_t> seen_masks;
    set<uint16_t> num_set;
    set<uint16_t> edge_set;
    vecmap<uint16_t, uint8_t> num_to_mines(num_size);
    vecmap<uint16_t, uint128_t> num_to_masks(num_size);
    
    // Create masks for each border cell
    for (const auto& [cell_index, mine_count] : num_cells) {
        const vector<uint16_t>& neighbors = get_neighbor_cells(cell_index);
        uint128_t mask = 0;
        
        for (const uint16_t neighbor_index : neighbors) {
            const auto it = cell_to_bit.find(neighbor_index);
            if (it != cell_to_bit.end()) {
                mask |= uint128_t(1) << it->second;
            }
        }
        
        if (seen_masks.find(mask) == seen_masks.end()) {
            seen_masks.insert(mask);
            num_set.insert(cell_index);
            num_to_mines.emplace(cell_index, mine_count);
            num_to_masks.emplace(cell_index, mask);
        }
    }
    num_to_mines.sort();
    num_to_masks.sort();
    num_size = num_set.size();

    vecmap<uint16_t, vector<uint16_t>> edge_neighbors(edge_cells.size());
    vecmap<uint16_t, vector<uint16_t>> num_neighbors(num_size);
    
    // Build neighbor relationships
    for (const uint16_t cell : edge_cells) {
        edge_set.insert(cell);
        edge_neighbors.emplace(cell, vector<uint16_t>());
        const vector<uint16_t>& neighbors = get_neighbor_cells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (num_set.count(neighbor) > 0) {
                edge_neighbors.at(cell).emplace_back(neighbor);
            }
        }
    }
    edge_neighbors.sort();
    
    for (const uint16_t cell : num_set) {
        num_neighbors.emplace(cell, vector<uint16_t>());
        const vector<uint16_t>& neighbors = get_neighbor_cells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (edge_set.count(neighbor) > 0) {
                num_neighbors.at(cell).emplace_back(neighbor);
            }
        }
    }
    num_neighbors.sort();
    
    vecmap<uint16_t, vector<uint128_t>> num_combinations(num_size);
    num_cell_bit_combinations(num_to_masks, num_to_mines, num_combinations);
    num_combinations.sort();
    
    // If there are border cells, run backtracking
    if (!num_set.empty()) {
        last_number = *num_set.rbegin();
        mine_combinations(
            *num_set.begin(), 0, 
            edge_neighbors, num_neighbors, 
            num_combinations, num_to_mines, num_to_masks, 
            combinations
        );
    }
}

//Backtracking algorithm to create occurrences map
void static backtrack_occurrences(
    int index, uint16_t mines, const vector<vecmap<uint8_t, vector<uint64_t>>>& group_maps,
    vector<uint8_t>& counts, vector<vector<uint64_t>>& occurrences, vector<uint8_t>& global_num_to_index
) {
    if (mines > remain_mines) return;

    if (index == group_maps.size()) {
        if (remain_mines - mines > float_cell_count) 
            return;
        occurrences.emplace_back(vector<uint64_t>(edge_cells_count + 1));
        global_num_to_index.emplace_back(mines);
        uint64_t factor = 1;
        for (int group = 0; group < group_maps.size(); group++) {
            factor *= group_maps[group].at(counts[group])[edge_cells_count];
        }
        for (int group = 0; group < group_maps.size(); group++) {
            const uint64_t bit_count = group_maps[group].at(counts[group])[edge_cells_count];

            for (uint8_t cell = 0; cell < edge_cells_count; cell++) {
                occurrences.back()[cell] += (group_maps[group].at(counts[group])[cell] * (factor / bit_count));
            }
        }
        occurrences.back()[edge_cells_count] = factor;
        return;
    }

    for (const auto& [cnt, array] : group_maps[index]) {
        counts[index] = cnt;
        backtrack_occurrences(
            index + 1,
            mines + cnt,
            group_maps,
            counts,
            occurrences,
            global_num_to_index
        );
    }
}

//Counts occurences of every edge cell in combinations vector
void static create_occurrences_map(
    const vector<vector<uint128_t>>& mask_groups,
    const vector<vector<uint8_t>>& mapping_groups,
    vecmap<uint8_t, vector<uint64_t>>& occurrences_map
) {
    vector<vecmap<uint8_t, vector<uint64_t>>> group_maps;
    group_maps.reserve(mask_groups.size());
    for (int i = 0; i < mask_groups.size(); i++) {
        vector<vector<uint64_t>> result;
        vecmap<uint8_t, uint8_t> count_to_index;
        const vector<uint8_t>& mapping = mapping_groups[i];
        const vector<uint128_t>& group = mask_groups[i];
        for (const uint128_t local_mask : group) {
            const uint8_t bit_count = popcount128(local_mask);
            const auto it = count_to_index.find(bit_count);
            if (it == count_to_index.end()) {
                count_to_index.emplace(bit_count, result.size());
                count_to_index.sort();
                result.emplace_back(vector<uint64_t>(edge_cells_count + 1));
            }

            for (uint8_t j = 0; j < mapping.size(); j++) {
                if ((local_mask >> j) & 1) {
                    result[count_to_index[bit_count]][mapping[j]]++;
                }
            }
            result[count_to_index[bit_count]][edge_cells_count]++;
        }
        vecmap<uint8_t, vector<uint64_t>> combs;
        for (const auto& [bit_count, index] : count_to_index) {
            combs.emplace(bit_count, result[index]);
        }
        combs.sort();
        group_maps.emplace_back(combs);
    }
    vector<uint8_t> counts(group_maps.size());
    vector<vector<uint64_t>> occurrences;
    vector<uint8_t> global_num_to_index;
    backtrack_occurrences(0, 0, group_maps, counts, occurrences, global_num_to_index);

    for (int ind = 0; ind < global_num_to_index.size(); ind++) {
        const auto it = occurrences_map.find(global_num_to_index[ind]);
        if (it == occurrences_map.end()) {
            occurrences_map.emplace(global_num_to_index[ind], occurrences[ind]);
            occurrences_map.sort();
        }
        else {
            for (uint8_t cell = 0; cell < edge_cells_count + 1; cell++) {
                occurrences_map[global_num_to_index[ind]][cell] += occurrences[ind][cell];
            }
        }
    }
} 

//Calculates probabiliy for every closed cell on field to be a mine
void static calculate_probabilities(vecmap<uint8_t, vector<uint64_t>>& combinations) {
    if (remain_mines - combinations.begin()->first <= float_cell_count) {
        uint16_t vEC = UINT16_MAX, vFC = UINT16_MAX;
        for (const auto& [m, arr] : combinations) {
            const int16_t minEC = min(remain_mines - m, float_cell_count - (remain_mines - m));
            if (vEC > minEC) 
                vEC = minEC;
            const int16_t minFC = min(remain_mines - m - 1, float_cell_count - (remain_mines - m));
            if (vFC > minFC && minFC >= 0) 
                vFC = minFC;
            else if (minFC < 0) vFC = 0;
        }

        vecmap<uint8_t, double> weights_map;
        double weights_FC = 0, weights_sum = 0;

        for (const auto& [m, arr] : combinations) {
            const uint16_t right = min(remain_mines - m, float_cell_count - (remain_mines - m));
            const uint16_t len = right - vEC;
            const uint16_t left = float_cell_count + 1 - right;
            const double weight = calc_weight(left, right, len);

            const uint16_t right_FC = min(remain_mines - m - 1, float_cell_count - (remain_mines - m));
            const uint16_t len_FC = right_FC - vFC;
            const uint16_t left_FC = float_cell_count - right_FC;
            const double weight_FC = calc_weight(left_FC, right_FC, len_FC);

            weights_FC += weight_FC * arr[edge_cells_count];
            weights_sum += weight * arr[edge_cells_count];
            weights_map.emplace(m, weight);
        }

        double float_cells_probability = weights_FC / weights_sum;
        if (vEC > 0 || vFC > 0) {
            if (vEC == vFC) {
                float_cells_probability *= ((static_cast<double>(float_cell_count) - vFC) / float_cell_count);
            }
            else {
                float_cells_probability *= (static_cast<double>(vEC) / float_cell_count);
            }
        }
        const uint8_t FC_probability_code = round(float_cells_probability * 100) + 151;
        for (const auto cell : float_cell_list) {
            game_field[cell] = FC_probability_code;
        }
        
        for (uint8_t cell = 0; cell < edge_cells_count; cell++) {
            double cell_weight = 0;
            for (const auto& entry : combinations) {
                cell_weight += entry.second[cell] * weights_map[entry.first];
            }
            game_field[edge_cells_list[cell]] = round(cell_weight / weights_sum * 100) + 50;
        }
    }
}

//Sets trivial flags on game field
void static set_trivial_flags() {
    vector<uint8_t> temp_field(field_size);
    for (uint16_t i = 0; i < field_size; i++) {
        const uint8_t closed_count = count_closed_cells(i);
        if (game_field[i] > 0 && closed_count > 0 && closed_count == game_field[i] - count_flagged_cells(i)) {
            const vector<uint16_t>& neighbors = get_neighbor_cells(i);
            for (const uint16_t neighbor : neighbors) {
                if (game_field[neighbor] == 9)
                    temp_field[neighbor] = 11;
                else
                    temp_field[neighbor] = game_field[neighbor];
            }
            temp_field[i] = game_field[i];
        }
        else if (temp_field[i] != 11)
            temp_field[i] = game_field[i];
    }
    for (uint16_t i = 0; i < field_size; i++) {
        game_field[i] = temp_field[i];
    }
}

void static set_cache() {
    cache.reserve(field_size);
    for (uint16_t cell = 0; cell < field_size; cell++) {
        const uint8_t row = cell / field_width;
        const uint8_t col = cell % field_width;
        
        if (row == 0) {
            if (col == 0) {
                cache.emplace_back(vector<uint16_t>({
                    1, 
                    field_width, 
                    uint16_t(field_width + 1) 
                }));
            } else if (col == field_width - 1) {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - 1), 
                    uint16_t(cell - 1 + field_width), 
                    uint16_t(cell + field_width) 
                }));
            } else {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - 1), 
                    uint16_t(cell + 1), 
                    uint16_t(cell - 1 + field_width), 
                    uint16_t(cell + field_width), 
                    uint16_t(cell + 1 + field_width) 
                }));
            }
        } else if (row == field_height - 1) {
            if (col == 0) {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - field_width), 
                    uint16_t(cell - field_width + 1), 
                    uint16_t(cell + 1) 
                }));
            } else if (col == field_width - 1) {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - 1), 
                    uint16_t(cell - field_width - 1), 
                    uint16_t(cell - field_width) 
                }));
            } else {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - 1), 
                    uint16_t(cell + 1), 
                    uint16_t(cell - field_width + 1), 
                    uint16_t(cell - field_width - 1), 
                    uint16_t(cell - field_width) 
                }));
            }
        } else {
            if (col == 0) {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - field_width), 
                    uint16_t(cell - field_width + 1), 
                    uint16_t(cell + 1), 
                    uint16_t(cell + field_width), 
                    uint16_t(cell + field_width + 1) 
                }));
            } else if (col == field_width - 1) {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - field_width - 1), 
                    uint16_t(cell - field_width), 
                    uint16_t(cell - 1), 
                    uint16_t(cell + field_width - 1), 
                    uint16_t(cell + field_width) 
                }));
            } else {
                cache.emplace_back(vector<uint16_t>({ 
                    uint16_t(cell - field_width - 1), 
                    uint16_t(cell - field_width), 
                    uint16_t(cell - field_width + 1), 
                    uint16_t(cell - 1), 
                    uint16_t(cell + 1), 
                    uint16_t(cell + field_width - 1), 
                    uint16_t(cell + field_width), 
                    uint16_t(cell + field_width + 1) 
                }));
            }
        }

    }
}

//The module entry point
const vector<uint8_t>& probabilities(const vector<uint8_t>& field, uint8_t w, uint8_t h, uint16_t m) {
    field_size = field.size();
    total_mines = m;
    game_field.clear();
    game_field.reserve(field_size);
    for (uint16_t i = 0; i < field_size; i++) {
        game_field.emplace_back(field[i]);
    }
    //Re-cache neigbors only if dimensions changed
    if (field_width != w || field_height != h) {
        field_width = w;
        field_height = h;
        cache.clear();
        set_cache();
    }
    
    set_trivial_flags();
    
    num_cells_list.clear();
    edge_cells_list.clear();
    edge_cells_count = 0;
    float_cell_count = 0;
    float_cell_list.clear();
    
    get_field_data();

    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>> groups;
    get_cell_groups(groups);

    if (groups.size() == 0) {
        if (float_cell_count == 0) {
            game_field = { 21 };
            return game_field;
        }
        else {
            double float_probability = static_cast<double>(remain_mines) / float_cell_count;
            uint8_t prob = round(float_probability * 100) + 151;
            for (uint16_t cell : float_cell_list) {
                game_field[cell] = prob;
            }
            return game_field;
        }
    }
    
    vector<vector<uint128_t>> combinations_groups;
    vector<vector<uint8_t>> mappings_groups;

    for (uint8_t group = 0; group < groups.size(); group++) {
        const auto [edge_cells, num_cells] = groups[group];
        if (edge_cells.size() > 128) {
            game_field = { 20 };
            return game_field;
        }
        vector<uint128_t> combinations;
        vector<uint8_t> mapping;
        find_bomb_combinations_masks(edge_cells, num_cells, combinations, mapping);
        combinations_groups.emplace_back(combinations);
        mappings_groups.emplace_back(mapping);
    }

    vecmap<uint8_t, vector<uint64_t>> occurrences;
    create_occurrences_map(combinations_groups, mappings_groups, occurrences);

    if (occurrences.begin() == occurrences.end()) {
        game_field = { 22 };
        return game_field;
    }

    calculate_probabilities(occurrences);

    return game_field;
}

//em++ calc.cpp -o calc.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Calc -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("probabilities", &probabilities);
    emscripten::register_vector<uint8_t>("vectorUint8_t");
}