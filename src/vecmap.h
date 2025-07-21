#include <vector>
#include <utility>
#include <algorithm>
#include <cstdint>

template<typename K, typename V>
class vecmap {
    std::vector<std::pair<K, V>> data;
public:
    vecmap() = default;
    inline vecmap(const size_t res) {
        data.reserve(res);
    }
    inline V& operator[](const K& key) {
        return at(key);
    }
    inline void emplace(const K& key, const V& value) {
        data.emplace_back(key, value);
    }
    inline void sort() {
        std::sort(data.begin(), data.end(), [](const auto& a, const auto&b) {
            return a.first < b.first;
        });
    }
    inline auto lower_bound(const K& key) const -> decltype(data.cbegin())  {
        const auto* first = data.data();
        size_t len = data.size();

        while (len > 0) {
            size_t half = len / 2;
            const auto* mid = first + half;

            bool less = mid->first < key;
            first = less ? mid + 1 : first;
            len = less ? len - (half + 1) : half;
        }
        return data.cbegin() + (first - data.data());
    }
    inline auto lower_bound(const K& key) -> decltype(data.begin()) {
        auto* first = data.data();
        size_t len = data.size();

        while (len > 0) {
            size_t half = len / 2;
            auto* mid = first + half;

            bool less = mid->first < key;
            first = less ? mid + 1 : first;
            len = less ? len - (half + 1) : half;
        }
        return data.begin() + (first - data.data());
    }
    inline const V& at(const K& key) const {
        auto it = lower_bound(key);
        return it->second;
    }
    inline V& at(const K& key) {
        auto it = lower_bound(key);
        return it->second;
    }
    inline const auto find(const K& key) const {
        auto it = lower_bound(key);
        if (it != data.cend() && it->first == key) 
            return it;
        return data.end();
    }
    inline auto find(const K& key) {
        auto it = lower_bound(key);
        if (it != data.end() && it->first == key) 
            return it;
        return data.end();
    }
    inline const K& next_key(const K& key) const {
        auto it = lower_bound(key);
        return (++it)->first;
    }
    inline void reserve(size_t n) {
        data.reserve(n);
    }
    inline auto begin() const {
        return data.begin();
    }
    inline auto end() const {
        return data.end();
    }
};

class mini_set16 {
    uint16_t data[24];
    uint8_t size = 0;
public:
    inline bool contains(const uint16_t& value) const {
        for (uint8_t i = 0; i < size; i++) {
            if (data[i] == value) {
                return true;
            }
        }
        return false;
    }
    inline void insert(const uint16_t& value) {
        if (!contains(value)) {
            data[size++] = value;
        }
    }
    inline const uint16_t* begin() const {
        return data;
    }
    inline const uint16_t* end() const {
        return data + size;
    }
};