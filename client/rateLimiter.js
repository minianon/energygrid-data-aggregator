/**
 * Rate Limiter Module
 * Implements queue-based rate limiting for API requests
 * 
 * Ensures minimum 1 second gap between consecutive requests
 */

/**
 * Creates a rate limiter instance
 * @param {number} minDelay - Minimum delay between requests in milliseconds
 * @returns {Object} - Rate limiter with enqueue method
 */
function createRateLimiter(minDelay = 1000) {
    let lastRequestTime = 0;
    const queue = [];
    let isProcessing = false;

    /**
     * Processes the next item in the queue
     */
    async function processQueue() {
        if (isProcessing || queue.length === 0) {
            return;
        }

        isProcessing = true;

        while (queue.length > 0) {
            const { task, resolve, reject } = queue.shift();

            // Calculate wait time to respect rate limit
            // We track the time BEFORE making the request because that's 
            // closer to when the server will receive it
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;
            const waitTime = Math.max(0, minDelay - timeSinceLastRequest);

            if (waitTime > 0) {
                await sleep(waitTime);
            }

            // Update time right before the request (server records time when request arrives)
            lastRequestTime = Date.now();

            try {
                const result = await task();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        isProcessing = false;
    }

    /**
     * Enqueues a task to be executed with rate limiting
     * @param {Function} task - Async function to execute
     * @returns {Promise} - Promise that resolves with task result
     */
    function enqueue(task) {
        return new Promise((resolve, reject) => {
            queue.push({ task, resolve, reject });
            processQueue();
        });
    }

    /**
     * Gets current queue length
     * @returns {number} - Number of pending tasks
     */
    function getQueueLength() {
        return queue.length;
    }

    return {
        enqueue,
        getQueueLength
    };
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
    createRateLimiter,
    sleep
};
