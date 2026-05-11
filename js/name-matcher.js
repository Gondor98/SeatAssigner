/**
 * Vietnamese Name Matcher
 * Handles diacritic-insensitive fuzzy matching for Vietnamese names
 */

const NameMatcher = {
    /**
     * Vietnamese diacritic map for normalization
     */
    diacriticMap: {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
    },

    /**
     * Normalize a Vietnamese string for comparison
     * Removes diacritics, lowercases, trims whitespace
     */
    normalize(str) {
        if (!str) return '';
        
        // NFC normalization first (compose characters)
        let normalized = str.normalize('NFC').toLowerCase().trim();
        
        // Remove diacritics
        normalized = normalized.split('').map(char => {
            return this.diacriticMap[char] || char;
        }).join('');
        
        // Collapse multiple spaces
        normalized = normalized.replace(/\s+/g, ' ');
        
        return normalized;
    },

    /**
     * Search for matching guests
     * Returns: { exact: [...], partial: [...] }
     */
    search(query, guests) {
        if (!query || !guests || guests.length === 0) {
            return { exact: [], partial: [] };
        }

        const normalizedQuery = this.normalize(query);
        
        if (normalizedQuery.length === 0) {
            return { exact: [], partial: [] };
        }

        const exact = [];
        const partial = [];

        for (const guest of guests) {
            const normalizedName = this.normalize(guest.name);
            
            // Exact match (normalized)
            if (normalizedName === normalizedQuery) {
                exact.push(guest);
            }
            // Partial match: query is contained in name or name contains query
            else if (normalizedName.includes(normalizedQuery) || 
                     normalizedQuery.includes(normalizedName)) {
                partial.push(guest);
            }
            // Word-level matching: all query words appear in name
            else if (this._wordMatch(normalizedQuery, normalizedName)) {
                partial.push(guest);
            }
        }

        // Sort partial by relevance (shorter distance = more relevant)
        partial.sort((a, b) => {
            const distA = Math.abs(this.normalize(a.name).length - normalizedQuery.length);
            const distB = Math.abs(this.normalize(b.name).length - normalizedQuery.length);
            return distA - distB;
        });

        return { exact, partial };
    },

    /**
     * Get autocomplete suggestions (for typing)
     */
    getSuggestions(query, guests, maxResults = 5) {
        if (!query || query.length < 2) return [];

        const normalizedQuery = this.normalize(query);
        const results = [];

        for (const guest of guests) {
            const normalizedName = this.normalize(guest.name);
            
            if (normalizedName.startsWith(normalizedQuery) || 
                normalizedName.includes(normalizedQuery)) {
                results.push(guest);
            }
            
            if (results.length >= maxResults) break;
        }

        return results;
    },

    /**
     * Check if all words in query appear in the name
     */
    _wordMatch(normalizedQuery, normalizedName) {
        const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
        const nameWords = normalizedName.split(' ').filter(w => w.length > 0);
        
        // All query words must appear in name words
        return queryWords.every(qWord => 
            nameWords.some(nWord => nWord.includes(qWord) || qWord.includes(nWord))
        );
    }
};
