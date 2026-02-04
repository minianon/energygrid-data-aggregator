/**
 * API Client Module
 * Handles HTTP communication with EnergyGrid API
 * 
 * Features:
 * - POST request handling
 * - Automatic signature authentication
 * - Retry logic with exponential backoff for 429 errors
 */

const http = require('http');
const { generateAuthHeaders } = require('./signatureGenerator');

// Configuration
const CONFIG = {
    HOST: 'localhost',
    PORT: 3000,
    ENDPOINT: '/device/real/query',
    TOKEN: 'interview_token_123',
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 2000  // 2 seconds
};

/**
 * Makes a POST request to the EnergyGrid API
 * @param {string[]} snList - Array of serial numbers to query
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<Object>} - API response data
 */
async function fetchDeviceData(snList, retryCount = 0) {
    return new Promise((resolve, reject) => {
        // Generate authentication headers
        const authHeaders = generateAuthHeaders(CONFIG.ENDPOINT, CONFIG.TOKEN);

        // Prepare request body
        const requestBody = JSON.stringify({ sn_list: snList });

        // Request options
        const options = {
            hostname: CONFIG.HOST,
            port: CONFIG.PORT,
            path: CONFIG.ENDPOINT,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
                'timestamp': authHeaders.timestamp,
                'signature': authHeaders.signature
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', async () => {
                // Handle rate limit (429)
                if (res.statusCode === 429) {
                    if (retryCount < CONFIG.MAX_RETRIES) {
                        const delay = CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                        console.log(`  [WARN] Rate limited (429). Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
                        await sleep(delay);
                        try {
                            const result = await fetchDeviceData(snList, retryCount + 1);
                            resolve(result);
                        } catch (err) {
                            reject(err);
                        }
                        return;
                    } else {
                        reject(new Error(`Max retries exceeded for batch: ${snList.join(', ')}`));
                        return;
                    }
                }

                // Handle authentication error (401)
                if (res.statusCode === 401) {
                    reject(new Error(`Authentication failed: ${data}`));
                    return;
                }

                // Handle other errors
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    return;
                }

                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData);
                } catch (parseError) {
                    reject(new Error(`Failed to parse response: ${parseError.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.write(requestBody);
        req.end();
    });
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    fetchDeviceData,
    CONFIG
};
