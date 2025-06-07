#include <cstdint>
#include <cmath>
#include <algorithm>
#include <vector>
#include <map>
#include <set>
#include <utility>
#include <emscripten/bind.h>

using namespace std;

typedef __uint128_t uint128_t;

// Global variables
vector<uint8_t> game_field;                     // Game field state
uint16_t field_size;                            // Total number of cells in the field
uint8_t field_width, field_height;              // Dimensions of the game board
uint16_t remain_mines;                          // Number of mines not yet flagged
uint16_t total_mines;                           // Total number of mines in the game
uint16_t last_number;                           // Last cell in the number cell list (for backtracking)
vector<uint16_t> edge_cells_list;               // List of all closed cells adjacent to numbered cells
uint8_t edge_cells_count;                       // Count of edge cells in the list
vector<pair<uint16_t, uint8_t>> num_cells_list; // List of numbered cells with adjacent closed cells

//Returns neighbor cells indeces of a given cell index
vector<uint16_t> static get_neighbor_cells(uint16_t cell) {
    const uint8_t row = cell / field_width;
    const uint8_t col = cell % field_width;
    
    if (row == 0) {
        if (col == 0) {
            return { 
                1, 
                field_width, 
                uint16_t(field_width + 1) 
            };
        } else if (col == field_width - 1) {
            return { 
                uint16_t(cell - 1), 
                uint16_t(cell - 1 + field_width), 
                uint16_t(cell + field_width) 
            };
        } else {
            return { 
                uint16_t(cell - 1), 
                uint16_t(cell + 1), 
                uint16_t(cell - 1 + field_width), 
                uint16_t(cell + field_width), 
                uint16_t(cell + 1 + field_width) 
            };
        }
    } else if (row == field_height - 1) {
        if (col == 0) {
            return { 
                uint16_t(cell - field_width), 
                uint16_t(cell - field_width + 1), 
                uint16_t(cell + 1) 
            };
        } else if (col == field_width - 1) {
            return { 
                uint16_t(cell - 1), 
                uint16_t(cell - field_width - 1), 
                uint16_t(cell - field_width) 
            };
        } else {
            return { 
                uint16_t(cell - 1), 
                uint16_t(cell + 1), 
                uint16_t(cell - field_width + 1), 
                uint16_t(cell - field_width - 1), 
                uint16_t(cell - field_width) 
            };
        }
    } else {
        if (col == 0) {
            return { 
                uint16_t(cell - field_width), 
                uint16_t(cell - field_width + 1), 
                uint16_t(cell + 1), 
                uint16_t(cell + field_width), 
                uint16_t(cell + field_width + 1) 
            };
        } else if (col == field_width - 1) {
            return { 
                uint16_t(cell - field_width - 1), 
                uint16_t(cell - field_width), 
                uint16_t(cell - 1), 
                uint16_t(cell + field_width - 1), 
                uint16_t(cell + field_width) 
            };
        } else {
            return { 
                uint16_t(cell - field_width - 1), 
                uint16_t(cell - field_width), 
                uint16_t(cell - field_width + 1), 
                uint16_t(cell - 1), 
                uint16_t(cell + 1), 
                uint16_t(cell + field_width - 1), 
                uint16_t(cell + field_width), 
                uint16_t(cell + field_width + 1) 
            };
        }
    }
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
    const vector<uint16_t> neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] > 0 && game_field[neighbor_index] < 9)
            count++;
    }
    return count;
}

//Counts cells with flag adjacent to a given cell
uint8_t static count_flagged_cells(uint16_t cell_index) {
    uint8_t count = 0;
    const vector<uint16_t> neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] == 10 || game_field[neighbor_index] == 11)
            count++;
    }
    return count;
}

//Counts closed cells adjacent to a given cell
uint8_t static count_closed_cells(uint16_t cell_index) {
    uint8_t count = 0;
    const vector<uint16_t> neighbors = get_neighbor_cells(cell_index);
    for (const uint16_t neighbor_index : neighbors) {
        if (game_field[neighbor_index] == 9)
            count++;
    }
    return count;
}

//Generates all possible bit mask combinations with k bits set for a given mask
vector<uint128_t> static bit_combinations(uint128_t full_mask, uint8_t k) {
    vector<uint8_t> bit_positions;

    // Find positions of all set bits in the full_mask
    for (uint8_t i = 0; i < 128; i++) {
        if (full_mask & (uint128_t(1) << i)) {
            bit_positions.emplace_back(i);
        }
    }

    const uint8_t total_bits = bit_positions.size();
    if (k > total_bits) return {};

    vector<uint128_t> result;

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

    return result;
}

//Generates possible combinations for each number cell
void static num_cell_bit_combinations(
    const map<uint16_t, uint128_t>& num_masks, 
    const map<uint16_t, uint8_t>& num_mines,
    map<uint16_t, vector<uint128_t>>& num_combinations
) {
    for (const auto& entry : num_masks) {
        const vector<uint128_t> combinations = bit_combinations(
            entry.second, 
            num_mines.at(entry.first)
        );
        num_combinations.insert({ entry.first, combinations });
    }
}

//Initializes lists of edge and number cells and remaining mines
void static get_field_data() {
    uint16_t flag_count = 0;
    
    for (uint16_t cell_index = 0; cell_index < field_size; cell_index++) {
        if (game_field[cell_index] == 9 && count_number_cells(cell_index) > 0) {
            edge_cells_list.emplace_back(cell_index);
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
            const vector<uint16_t> neighbors = get_neighbor_cells(edge_cells[i]);
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
            const vector<uint16_t> neighbors = get_neighbor_cells(num_cells[i]);
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

//Backtracking algorithm to find possible mine configurations
void static mine_combinations(
    uint16_t current_number, uint128_t mask,
    const map<uint16_t, vector<uint16_t>>& edge_neighbors, const map<uint16_t, vector<uint16_t>>& num_neighbors,
    const map<uint16_t, vector<uint128_t>>& num_combinations, const map<uint16_t, uint8_t>& num_mines,
    const map<uint16_t, uint128_t>& num_masks, vector<uint128_t>& combinations
) {
    const vector<uint16_t> neighbors = num_neighbors.at(current_number);
    set<uint16_t> constraints;
    
    // Find all number cells that might be affected by the current choice
    for (const uint16_t neighbor : neighbors) {
        const vector<uint16_t> neighbors = edge_neighbors.at(neighbor);
        for (const uint16_t edge : neighbors) {
            constraints.insert(edge);
        }
    }
    
    // Try each possible combination for the current constraint
    for (const uint128_t combo : num_combinations.at(current_number)) {
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
                const uint16_t next_number = (++num_masks.find(current_number))->first;
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
pair<vector<uint128_t>, vector<uint8_t>> static find_bomb_combinations_masks(
    const vector<uint16_t>& edge_cells, const vector<pair<uint16_t, uint8_t>>& num_cells
) {
    vector<uint128_t> combinations;
    vector<uint8_t> mapping(edge_cells.size());
    map<uint16_t, uint8_t> cell_to_bit;
    
    // Create mapping between local and global indices
    for (uint8_t i = 0; i < edge_cells.size(); i++) {
        mapping[i] = find(edge_cells_list.begin(), edge_cells_list.end(), edge_cells[i]) - edge_cells_list.begin();
        cell_to_bit.insert({ edge_cells[i], i });
    }
    
    set<uint128_t> seen_masks;
    set<uint128_t> num_set;
    set<uint16_t> edge_set;
    map<uint16_t, vector<uint16_t>> edge_neighbors;
    map<uint16_t, vector<uint16_t>> num_neighbors;
    map<uint16_t, uint8_t> num_to_mines;
    map<uint16_t, uint128_t> num_to_masks;
    
    // Create masks for each border cell
    for (const auto& [cell_index, mine_count] : num_cells) {
        const vector<uint16_t> neighbors = get_neighbor_cells(cell_index);
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
            num_to_mines.insert({ cell_index, mine_count });
            num_to_masks.insert({ cell_index, mask });
        }
    }
    
    // Build neighbor relationships
    for (const uint16_t cell : edge_cells) {
        edge_set.insert(cell);
        edge_neighbors.insert({ cell, vector<uint16_t>() });
        const vector<uint16_t> neighbors = get_neighbor_cells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (num_set.count(neighbor) > 0) {
                edge_neighbors[cell].emplace_back(neighbor);
            }
        }
    }
    
    for (const uint16_t cell : num_set) {
        num_neighbors.insert({ cell, vector<uint16_t>() });
        const vector<uint16_t> neighbors = get_neighbor_cells(cell);
        
        for (const uint16_t neighbor : neighbors) {
            if (edge_set.count(neighbor) > 0) {
                num_neighbors[cell].emplace_back(neighbor);
            }
        }
    }
    
    map<uint16_t, vector<uint128_t>> num_combinations;
    num_cell_bit_combinations(num_to_masks, num_to_mines, num_combinations);
    
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

    return {combinations, mapping};
}

//Backtracking algorithm to create occurrences map
void static backtrack_occurrences(
    int index, uint16_t mines, const vector<map<uint8_t, vector<uint64_t>>>& group_maps,
    vector<uint8_t>& counts, vector<vector<uint64_t>>& occurrences, vector<uint8_t>& global_num_to_index
) {
    if (mines > remain_mines) return;

    if (index == group_maps.size()) {
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
map<uint8_t, vector<uint64_t>> static create_occurrences_map(
    const vector<vector<uint128_t>>& mask_groups,
    const vector<vector<uint8_t>>& mapping_groups
) {
    vector<map<uint8_t, vector<uint64_t>>> group_maps;
    group_maps.reserve(mask_groups.size());
    for (int i = 0; i < mask_groups.size(); i++) {
        vector<vector<uint64_t>> result;
        map<uint8_t, uint8_t> count_to_index;
        const vector<uint8_t> mapping = mapping_groups[i];
        const vector<uint128_t> group = mask_groups[i];
        for (const uint128_t local_mask : group) {
            const uint8_t bit_count = popcount128(local_mask);
            const auto [it, inserted] = count_to_index.try_emplace(bit_count, result.size());
            if (inserted) {
                result.emplace_back(vector<uint64_t>(edge_cells_count + 1));
            }

            for (uint8_t j = 0; j < mapping.size(); j++) {
                if ((local_mask >> j) & 1) {
                    result[count_to_index[bit_count]][mapping[j]]++;
                }
            }
            result[count_to_index[bit_count]][edge_cells_count]++;
        }
        map<uint8_t, vector<uint64_t>> combs;
        for (const auto& [bit_count, index] : count_to_index) {
            combs.insert({bit_count, result[index]});
        }
        group_maps.emplace_back(combs);
    }
    vector<uint8_t> counts(group_maps.size());
    vector<vector<uint64_t>> occurrences;
    vector<uint8_t> global_num_to_index;
    backtrack_occurrences(0, 0, group_maps, counts, occurrences, global_num_to_index);

    map<uint8_t, vector<uint64_t>> occurrences_map;
    for (int ind = 0; ind < global_num_to_index.size(); ind++) {
        const auto [it, inserted] = occurrences_map.try_emplace(global_num_to_index[ind], occurrences[ind]);
        if (!inserted) {
            for (uint8_t cell = 0; cell < edge_cells_count + 1; cell++) {
                occurrences_map[global_num_to_index[ind]][cell] += occurrences[ind][cell];
            }
        }
    }
    return occurrences_map;
} 

//Calculates probabiliy for every closed cell on field to be a mine
void static calculate_probabilities(const map<uint8_t, vector<uint64_t>>& combinations) {
    vector<uint16_t> float_cell_list;
    for (uint16_t cell = 0; cell < field_size; cell++) {
        if (game_field[cell] == 9) {
            if (count_number_cells(cell) == 0) {
                float_cell_list.emplace_back(cell);
            }
        }
    }
    const uint16_t float_cell_count = float_cell_list.size();

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

        map<uint8_t, double> weights_map;
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
            weights_map.insert({ m, weight });
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
            const vector<uint16_t> neighbors = get_neighbor_cells(i);
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

//The module entry point
vector<uint8_t> probabilities(vector<uint8_t> field, uint8_t w, uint8_t h, uint16_t m) {
    field_width = w;
    field_height = h;
    total_mines = m;
    field_size = field.size();
    game_field.clear();
    game_field.reserve(field_size);
    for (uint16_t i = 0; i < field_size; i++) {
        game_field.emplace_back(field[i]);
    }
    
    set_trivial_flags();
    
    num_cells_list.clear();
    edge_cells_list.clear();
    edge_cells_count = 0;

    get_field_data();

    vector<pair<vector<uint16_t>, vector<pair<uint16_t, uint8_t>>>> groups;
    get_cell_groups(groups);

    if (groups.size() == 0) {
        return { 21 };
    }

    vector<vector<uint128_t>> combinations_groups;
    vector<vector<uint8_t>> mappings_groups;

    for (uint8_t group = 0; group < groups.size(); group++) {
        const auto [edge_cells, num_cells] = groups[group];
        if (edge_cells.size() > 128) {
            return { 20 };
        }
        const auto [combinations, mapping] = find_bomb_combinations_masks(edge_cells, num_cells);
        combinations_groups.emplace_back(combinations);
        mappings_groups.emplace_back(mapping);
    }

    const map<uint8_t, vector<uint64_t>> occurrences = create_occurrences_map(combinations_groups, mappings_groups);

    if (occurrences.size() == 0) {
        return { 22 };
    }

    calculate_probabilities(occurrences);

    return game_field;
}

//em++ calc.cpp -o calc.mjs -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=Calc -s SINGLE_FILE=1 -O3 --bind

EMSCRIPTEN_BINDINGS(module){
    emscripten::function("probabilities", &probabilities);
    emscripten::register_vector<uint8_t>("vectorUint8_t");
}