/**
 * FPL URL Parser Utility
 * Extracts FPL team IDs from various FPL URL formats
 */

class FPLUrlParser {
  /**
   * Extract FPL team ID from various FPL URL formats
   * @param {string} input - Either a team ID number or FPL URL
   * @returns {number|null} - Extracted team ID or null if invalid
   */
  static extractTeamId(input) {
    if (!input) {
      return null;
    }

    // If input is already a number, return it
    const numericId = parseInt(input);
    if (!isNaN(numericId) && numericId > 0) {
      return numericId;
    }

    // If input is a string, try to extract team ID from URL
    if (typeof input === 'string') {
      return this.extractFromUrl(input);
    }

    return null;
  }

  /**
   * Extract team ID from FPL URL
   * @param {string} url - FPL URL
   * @returns {number|null} - Extracted team ID or null if invalid
   */
  static extractFromUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Remove any whitespace
    url = url.trim();

    // Supported URL patterns:
    // 1. https://fantasy.premierleague.com/entry/417303/event/3
    // 2. https://fantasy.premierleague.com/entry/417303/
    // 3. https://fantasy.premierleague.com/entry/417303
    // 4. fantasy.premierleague.com/entry/417303/event/3
    // 5. fantasy.premierleague.com/entry/417303/
    // 6. fantasy.premierleague.com/entry/417303

    const patterns = [
      // Full URL with event
      /https?:\/\/fantasy\.premierleague\.com\/entry\/(\d+)\/event\/\d+/,
      // Full URL without event
      /https?:\/\/fantasy\.premierleague\.com\/entry\/(\d+)\/?$/,
      // URL without protocol with event
      /fantasy\.premierleague\.com\/entry\/(\d+)\/event\/\d+/,
      // URL without protocol without event
      /fantasy\.premierleague\.com\/entry\/(\d+)\/?$/,
      // Just the entry path
      /\/entry\/(\d+)\/event\/\d+/,
      /\/entry\/(\d+)\/?$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const teamId = parseInt(match[1]);
        if (!isNaN(teamId) && teamId > 0) {
          return teamId;
        }
      }
    }

    return null;
  }

  /**
   * Validate if the input is a valid FPL team ID or URL
   * @param {string|number} input - Team ID or URL
   * @returns {boolean} - True if valid, false otherwise
   */
  static isValidInput(input) {
    const teamId = this.extractTeamId(input);
    return teamId !== null && teamId > 0;
  }

  /**
   * Get the FPL URL for a team ID
   * @param {number} teamId - FPL team ID
   * @param {number} gameweek - Optional gameweek number
   * @returns {string} - FPL URL
   */
  static getTeamUrl(teamId, gameweek = null) {
    if (!teamId || teamId <= 0) {
      return null;
    }

    let url = `https://fantasy.premierleague.com/entry/${teamId}`;
    
    if (gameweek && gameweek > 0) {
      url += `/event/${gameweek}`;
    }

    return url;
  }

  /**
   * Parse input and return both team ID and formatted URL
   * @param {string|number} input - Team ID or URL
   * @returns {object|null} - {teamId, url} or null if invalid
   */
  static parseInput(input) {
    const teamId = this.extractTeamId(input);
    
    if (!teamId) {
      return null;
    }

    return {
      teamId: teamId,
      url: this.getTeamUrl(teamId)
    };
  }
}

module.exports = FPLUrlParser;
