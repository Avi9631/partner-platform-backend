const fs = require('fs');
const path = require('path');

/**
 * Service for fetching developer data from JSON file
 */
class DeveloperConsumerApiService {
  constructor() {
    this.dataPath = path.join(__dirname, 'developer-api-response.json');
    this.developerData = null;
    this.loadData();
  }

  /**
   * Load developer data from JSON file
   */
  loadData() {
    try {
      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      const jsonData = JSON.parse(rawData);
      this.developerData = jsonData;
    } catch (error) {
      console.error('Error loading developer data:', error);
      throw new Error('Failed to load developer data');
    }
  }

  /**
   * Get all developers as an array
   */
  getAllDevelopersArray() {
    if (!this.developerData || !this.developerData.data) {
      return [];
    }
    return Object.values(this.developerData.data);
  }

  /**
   * Get developers with pagination
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Object} - Paginated result with data and metadata
   */
  getDevelopersByPagination(page = 1, limit = 10) {
    const developers = this.getAllDevelopersArray();
    const totalItems = developers.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Get paginated data
    const paginatedData = developers.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Search developers by name
   * @param {string} searchTerm - Search term to match against developer name
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Object} - Search results with pagination
   */
  searchDevelopersByName(searchTerm, page = 1, limit = 10) {
    if (!searchTerm) {
      return this.getDevelopersByPagination(page, limit);
    }

    const developers = this.getAllDevelopersArray();
    const searchLower = searchTerm.toLowerCase();

    // Filter developers by name (case-insensitive)
    const filteredDevelopers = developers.filter(developer => 
      developer.name && developer.name.toLowerCase().includes(searchLower)
    );

    const totalItems = filteredDevelopers.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Get paginated results
    const paginatedData = filteredDevelopers.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedData,
      searchTerm: searchTerm,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Get developer by ID
   * @param {string} developerId - Developer ID
   * @returns {Object|null} - Developer object or null if not found
   */
  getDeveloperById(developerId) {
    if (!this.developerData || !this.developerData.data) {
      return null;
    }

    const developer = this.developerData.data[developerId];
    
    if (!developer) {
      return null;
    }

    return {
      success: true,
      data: developer
    };
  }

  /**
   * Get metadata from the JSON file
   * @returns {Object} - Metadata object
   */
  getMetadata() {
    if (!this.developerData) {
      return null;
    }

    return {
      success: true,
      metadata: {
        total: this.developerData.metadata?.total || 0,
        lastUpdated: this.developerData.metadata?.lastUpdated || null,
        version: this.developerData.metadata?.version || null
      }
    };
  }
}

// Export singleton instance
module.exports = new DeveloperConsumerApiService();
