/**
 * Signature Generator Module
 * Generates MD5 signature for EnergyGrid API authentication
 * 
 * Signature Format: MD5(URL + Token + Timestamp)
 */

const crypto = require('crypto');

/**
 * Generates MD5 signature for API authentication
 * @param {string} url - The API endpoint URL path
 * @param {string} token - The secret authentication token
 * @param {string} timestamp - The current timestamp in milliseconds
 * @returns {string} - The MD5 hash signature in hexadecimal format
 */
function generateSignature(url, token, timestamp) {
    const dataToHash = url + token + timestamp;
    const hash = crypto.createHash('md5').update(dataToHash).digest('hex');
    return hash;
}

/**
 * Generates authentication headers for API requests
 * @param {string} url - The API endpoint URL path
 * @param {string} token - The secret authentication token
 * @returns {Object} - Object containing signature and timestamp headers
 */
function generateAuthHeaders(url, token) {
    const timestamp = Date.now().toString();
    const signature = generateSignature(url, token, timestamp);
    
    return {
        'timestamp': timestamp,
        'signature': signature
    };
}

module.exports = {
    generateSignature,
    generateAuthHeaders
};
