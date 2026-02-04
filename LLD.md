# Low-Level Design (LLD)
## EnergyGrid Data Aggregator

**Version**: 1.0  
**Date**: February 2026  
**Author**: Tushar Bhardwaj

---

## Table of Contents

1. [Module Specifications](#1-module-specifications)
2. [Function Signatures](#2-function-signatures)
3. [Data Structures](#3-data-structures)
4. [Algorithms](#4-algorithms)
5. [Sequence Diagrams](#5-sequence-diagrams)
6. [Error Handling](#6-error-handling)
7. [Configuration](#7-configuration)

---

## 1. Module Specifications

### 1.1 Module Overview

```
client/
├── index.js              # Entry point & orchestrator
├── apiClient.js          # HTTP communication layer
├── rateLimiter.js        # Queue-based rate limiting
├── signatureGenerator.js # MD5 signature generation
└── aggregator.js         # Result aggregation & statistics
```

### 1.2 Dependency Graph

```
                    index.js
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   rateLimiter.js  apiClient.js  aggregator.js
                       │
                       ▼
               signatureGenerator.js
```

---

## 2. Function Signatures

### 2.1 signatureGenerator.js

```javascript
/**
 * Generates MD5 signature for API authentication
 * @param {string} url - The API endpoint URL path (e.g., "/device/real/query")
 * @param {string} token - The secret authentication token
 * @param {string} timestamp - The current timestamp in milliseconds
 * @returns {string} The MD5 hash signature in hexadecimal format (32 chars)
 * 
 * @example
 * generateSignature('/device/real/query', 'interview_token_123', '1700000000000')
 * // Returns: 'a1b2c3d4e5f6g7h8...'
 */
function generateSignature(url, token, timestamp) { ... }

/**
 * Generates complete authentication headers for API requests
 * @param {string} url - The API endpoint URL path
 * @param {string} token - The secret authentication token
 * @returns {Object} Object containing 'timestamp' and 'signature' headers
 * 
 * @example
 * generateAuthHeaders('/device/real/query', 'interview_token_123')
 * // Returns: { timestamp: '1700000000000', signature: 'a1b2c3...' }
 */
function generateAuthHeaders(url, token) { ... }
```

### 2.2 rateLimiter.js

```javascript
/**
 * Creates a rate limiter instance
 * @param {number} minDelay - Minimum delay between requests in milliseconds (default: 1000)
 * @returns {Object} Rate limiter with enqueue and getQueueLength methods
 * 
 * @example
 * const limiter = createRateLimiter(1050);
 * await limiter.enqueue(async () => { ... });
 */
function createRateLimiter(minDelay = 1000) { ... }

/**
 * Enqueues a task to be executed with rate limiting
 * @param {Function} task - Async function to execute
 * @returns {Promise<any>} Promise that resolves with task result
 */
rateLimiter.enqueue(task) { ... }

/**
 * Gets current queue length
 * @returns {number} Number of pending tasks
 */
rateLimiter.getQueueLength() { ... }

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after delay
 */
function sleep(ms) { ... }
```

### 2.3 apiClient.js

```javascript
/**
 * Makes a POST request to the EnergyGrid API
 * @param {string[]} snList - Array of serial numbers to query (max 10)
 * @param {number} retryCount - Current retry attempt (internal use, default: 0)
 * @returns {Promise<Object>} API response data
 * @throws {Error} If max retries exceeded or authentication fails
 * 
 * @example
 * const result = await fetchDeviceData(['SN-000', 'SN-001', ...]);
 * // Returns: { data: [{ sn: 'SN-000', power: '2.34 kW', ... }, ...] }
 */
async function fetchDeviceData(snList, retryCount = 0) { ... }

/**
 * Configuration object for API client
 */
const CONFIG = {
    HOST: 'localhost',
    PORT: 3000,
    ENDPOINT: '/device/real/query',
    TOKEN: 'interview_token_123',
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 2000
};
```

### 2.4 aggregator.js

```javascript
/**
 * Creates an aggregator instance for collecting results
 * @returns {Object} Aggregator with addBatchResult, addError, getReport, getDeviceCount methods
 * 
 * @example
 * const agg = createAggregator();
 * agg.addBatchResult(apiResponse.data);
 * const report = agg.getReport();
 */
function createAggregator() { ... }

/**
 * Adds batch results to the aggregator
 * @param {Object[]} batchData - Array of device data from API response
 */
aggregator.addBatchResult(batchData) { ... }

/**
 * Adds an error for a failed batch
 * @param {Error} error - The error that occurred
 * @param {string[]} snList - Serial numbers in the failed batch
 */
aggregator.addError(error, snList) { ... }

/**
 * Generates the final aggregated report
 * @returns {Object} Complete report with summary, devices, and errors
 */
aggregator.getReport() { ... }

/**
 * Gets the current device count
 * @returns {number} Number of devices collected
 */
aggregator.getDeviceCount() { ... }
```

### 2.5 index.js

```javascript
/**
 * Generates an array of serial numbers
 * @param {number} count - Number of serial numbers to generate
 * @returns {string[]} Array of serial numbers (SN-000 to SN-{count-1})
 * 
 * @example
 * generateSerialNumbers(500)
 * // Returns: ['SN-000', 'SN-001', ..., 'SN-499']
 */
function generateSerialNumbers(count) { ... }

/**
 * Divides an array into chunks of specified size
 * @param {Array} array - The array to chunk
 * @param {number} size - Maximum chunk size
 * @returns {Array[]} Array of chunks
 * 
 * @example
 * chunkArray([1,2,3,4,5], 2)
 * // Returns: [[1,2], [3,4], [5]]
 */
function chunkArray(array, size) { ... }

/**
 * Formats duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "1m 30s")
 */
function formatDuration(ms) { ... }

/**
 * Main execution function - entry point
 * @returns {Promise<void>}
 */
async function main() { ... }
```

---

## 3. Data Structures

### 3.1 Serial Number Format

```javascript
// Pattern: SN-XXX where XXX is zero-padded to 3 digits
const serialNumber = "SN-000";  // First device
const serialNumber = "SN-499";  // Last device

// Generation algorithm
const sn = `SN-${i.toString().padStart(3, '0')}`;
```

### 3.2 API Request Body

```typescript
interface ApiRequestBody {
    sn_list: string[];  // Array of serial numbers (max 10)
}

// Example
{
    "sn_list": ["SN-000", "SN-001", "SN-002", ..., "SN-009"]
}
```

### 3.3 API Response

```typescript
interface ApiResponse {
    data: DeviceData[];
}

interface DeviceData {
    sn: string;          // Serial number (e.g., "SN-000")
    power: string;       // Power output (e.g., "2.34 kW")
    status: string;      // "Online" | "Offline"
    last_updated: string; // ISO 8601 timestamp
}

// Example
{
    "data": [
        {
            "sn": "SN-000",
            "power": "2.34 kW",
            "status": "Online",
            "last_updated": "2024-01-15T10:30:00.000Z"
        }
    ]
}
```

### 3.4 Aggregated Report

```typescript
interface AggregatedReport {
    summary: ReportSummary;
    devices: DeviceData[];
    errors?: ErrorRecord[];
}

interface ReportSummary {
    totalDevices: number;
    onlineCount: number;
    offlineCount: number;
    onlinePercentage: string;  // "90.40%"
    totalPowerKW: string;      // "1247.83 kW"
    averagePowerKW: string;    // "2.50 kW"
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    errorCount: number;
    generatedAt: string;       // ISO 8601 timestamp
}

interface ErrorRecord {
    message: string;
    affectedDevices: string[];
    timestamp: string;
}
```

### 3.5 Rate Limiter Queue Item

```typescript
interface QueueItem {
    task: () => Promise<any>;  // Async function to execute
    resolve: (value: any) => void;  // Promise resolve callback
    reject: (error: Error) => void;  // Promise reject callback
}
```

---

## 4. Algorithms

### 4.1 Serial Number Generation

```
Algorithm: GenerateSerialNumbers(count)
─────────────────────────────────────────
Input: count (number of devices)
Output: array of serial numbers

1. Initialize empty array: serialNumbers = []
2. For i = 0 to count - 1:
   a. Convert i to string
   b. Pad left with zeros to 3 digits
   c. Prefix with "SN-"
   d. Append to serialNumbers
3. Return serialNumbers

Time Complexity: O(n)
Space Complexity: O(n)
```

### 4.2 MD5 Signature Generation

```
Algorithm: GenerateSignature(url, token, timestamp)
───────────────────────────────────────────────────
Input: url (string), token (string), timestamp (string)
Output: MD5 hash as hexadecimal string

1. Concatenate: dataToHash = url + token + timestamp
2. Create MD5 hash object
3. Update hash with dataToHash
4. Return hex digest

Example:
  Input: "/device/real/query", "interview_token_123", "1700000000000"
  Concat: "/device/real/queryinterview_token_1231700000000"
  Output: "a1b2c3d4e5f67890abcdef1234567890"

Time Complexity: O(n) where n is input length
```

### 4.3 Rate Limiter Queue Processing

```
Algorithm: ProcessQueue()
─────────────────────────
State: lastRequestTime, queue[], isProcessing

1. If isProcessing OR queue is empty:
   Return (exit)

2. Set isProcessing = true

3. While queue is not empty:
   a. Dequeue first item: { task, resolve, reject }
   
   b. Calculate wait time:
      now = current time
      timeSince = now - lastRequestTime
      waitTime = max(0, minDelay - timeSince)
   
   c. If waitTime > 0:
      Sleep(waitTime)
   
   d. Update lastRequestTime = current time
   
   e. Try:
      result = await task()
      resolve(result)
   Catch error:
      reject(error)

4. Set isProcessing = false

Time Complexity: O(1) per request
Delay Guarantee: >= minDelay between requests
```

### 4.4 Batch Processing

```
Algorithm: ProcessBatches(serialNumbers)
────────────────────────────────────────
Input: serialNumbers (array of 500 SNs)
Output: aggregated report

1. chunk = chunkArray(serialNumbers, BATCH_SIZE)
   // Result: 50 batches of 10 devices each

2. Initialize: rateLimiter, aggregator

3. For each batch in chunks:
   a. Enqueue request through rateLimiter:
      result = await rateLimiter.enqueue(() => fetchDeviceData(batch))
   
   b. If successful:
      aggregator.addBatchResult(result.data)
   Else:
      aggregator.addError(error, batch)
   
   c. Update progress display

4. Return aggregator.getReport()

Total Requests: ceil(500 / 10) = 50
Total Time: ~50 seconds
```

### 4.5 Retry with Exponential Backoff

```
Algorithm: RetryWithBackoff(task, maxRetries, initialDelay)
──────────────────────────────────────────────────────────
Input: task (async function), maxRetries (number), initialDelay (ms)
Output: task result or throws error

1. For attempt = 0 to maxRetries:
   
   a. Try:
      result = await task()
      Return result
   
   b. Catch error:
      If error is Rate Limit (429) AND attempt < maxRetries:
         delay = initialDelay * 2^attempt
         // delay values: 2s, 4s, 8s
         Sleep(delay)
         Continue to next attempt
      Else:
         Throw error

2. Throw "Max retries exceeded"

Delay Sequence: 2000ms, 4000ms, 8000ms
```

---

## 5. Sequence Diagrams

### 5.1 Main Execution Flow

```
┌───────┐     ┌───────────┐     ┌─────────┐     ┌──────────┐
│ main  │     │rateLimiter│     │apiClient│     │aggregator│
└───┬───┘     └─────┬─────┘     └────┬────┘     └────┬─────┘
    │               │                │               │
    │ createRateLimiter()            │               │
    │──────────────►│                │               │
    │               │                │               │
    │               │                │  createAggregator()
    │───────────────────────────────────────────────►│
    │               │                │               │
    │  For each batch (50 times):    │               │
    │               │                │               │
    │ enqueue(fetchTask)             │               │
    │──────────────►│                │               │
    │               │                │               │
    │               │ [wait for rate limit]          │
    │               │                │               │
    │               │ fetchDeviceData(batch)         │
    │               │───────────────►│               │
    │               │                │               │
    │               │                │──────┐        │
    │               │                │      │ HTTP POST
    │               │                │◄─────┘        │
    │               │                │               │
    │               │     result     │               │
    │               │◄───────────────│               │
    │               │                │               │
    │     result    │                │               │
    │◄──────────────│                │               │
    │               │                │               │
    │               │                │ addBatchResult(result.data)
    │───────────────────────────────────────────────►│
    │               │                │               │
    │ [repeat 50 times]              │               │
    │               │                │               │
    │               │                │  getReport()  │
    │───────────────────────────────────────────────►│
    │               │                │               │
    │               │                │    report     │
    │◄──────────────────────────────────────────────│
    │               │                │               │
```

### 5.2 API Request with Signature

```
┌──────────┐       ┌─────────────┐       ┌──────────────┐
│apiClient │       │ signatureGen│       │ EnergyGrid   │
│          │       │             │       │    API       │
└────┬─────┘       └──────┬──────┘       └──────┬───────┘
     │                    │                     │
     │ generateAuthHeaders()                    │
     │───────────────────►│                     │
     │                    │                     │
     │                    │ timestamp = Date.now()
     │                    │ sig = MD5(url+token+ts)
     │                    │                     │
     │ { timestamp, signature }                 │
     │◄───────────────────│                     │
     │                    │                     │
     │ POST /device/real/query                  │
     │ Headers: timestamp, signature            │
     │ Body: { sn_list: [...] }                │
     │─────────────────────────────────────────►│
     │                    │                     │
     │                    │    Validate:        │
     │                    │    1. Rate limit    │
     │                    │    2. Signature     │
     │                    │    3. Batch size    │
     │                    │                     │
     │    200 OK { data: [...] }               │
     │◄─────────────────────────────────────────│
     │                    │                     │
```

### 5.3 Retry Flow (429 Error)

```
┌──────────┐                    ┌──────────────┐
│apiClient │                    │ EnergyGrid   │
│          │                    │    API       │
└────┬─────┘                    └──────┬───────┘
     │                                 │
     │ POST /device/real/query         │
     │────────────────────────────────►│
     │                                 │
     │       429 Too Many Requests     │
     │◄────────────────────────────────│
     │                                 │
     │ [LOG: Rate limited, retry 1/3]  │
     │ [WAIT: 2000ms]                  │
     │                                 │
     │ POST /device/real/query         │
     │────────────────────────────────►│
     │                                 │
     │      200 OK { data: [...] }     │
     │◄────────────────────────────────│
     │                                 │
```

---

## 6. Error Handling

### 6.1 Error Classification

| Error Code | Type | Recovery Strategy |
|------------|------|-------------------|
| 429 | Rate Limit | Exponential backoff retry (max 3) |
| 401 | Authentication | Fail immediately, log error |
| 400 | Bad Request | Fail batch, continue processing |
| 5xx | Server Error | Retry with backoff |
| Network | Connection | Retry with backoff |

### 6.2 Error Response Handling

```javascript
// HTTP 429 - Rate Limited
if (res.statusCode === 429) {
    if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await sleep(delay);
        return fetchDeviceData(snList, retryCount + 1);
    }
    throw new Error('Max retries exceeded');
}

// HTTP 401 - Authentication Failed
if (res.statusCode === 401) {
    throw new Error(`Authentication failed: ${data}`);
}

// HTTP 400 - Bad Request
if (res.statusCode === 400) {
    throw new Error(`Bad request: ${data}`);
}
```

### 6.3 Error Recording

```javascript
// Error structure in aggregator
{
    message: "Max retries exceeded for batch: SN-100, SN-101, ...",
    affectedDevices: ["SN-100", "SN-101", ..., "SN-109"],
    timestamp: "2024-01-15T10:30:00.000Z"
}
```

---

## 7. Configuration

### 7.1 Application Constants

```javascript
// client/index.js
const CONFIG = {
    TOTAL_DEVICES: 500,        // Number of devices to fetch
    BATCH_SIZE: 10,            // Max devices per request
    RATE_LIMIT_DELAY: 1050     // Delay between requests (ms)
};

// client/apiClient.js
const CONFIG = {
    HOST: 'localhost',
    PORT: 3000,
    ENDPOINT: '/device/real/query',
    TOKEN: 'interview_token_123',
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 2000
};
```

### 7.2 Timing Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `RATE_LIMIT_DELAY` | 1050ms | Buffer for network jitter |
| `INITIAL_RETRY_DELAY` | 2000ms | First retry wait time |
| `MAX_RETRIES` | 3 | Maximum retry attempts |

### 7.3 Calculated Values

| Metric | Calculation | Result |
|--------|-------------|--------|
| Total Batches | ceil(500 / 10) | 50 |
| Minimum Runtime | 50 * 1.05s | ~52.5s |
| Max Retry Time | 2s + 4s + 8s | 14s |

---

## 8. Testing Considerations

### 8.1 Unit Test Cases

```javascript
// signatureGenerator.test.js
describe('generateSignature', () => {
    it('should generate correct MD5 hash', () => {
        const url = '/device/real/query';
        const token = 'interview_token_123';
        const timestamp = '1700000000000';
        const expected = crypto.createHash('md5')
            .update(url + token + timestamp)
            .digest('hex');
        
        expect(generateSignature(url, token, timestamp)).toBe(expected);
    });
});

// rateLimiter.test.js
describe('createRateLimiter', () => {
    it('should enforce minimum delay between requests', async () => {
        const limiter = createRateLimiter(1000);
        const startTime = Date.now();
        
        await limiter.enqueue(() => Promise.resolve());
        await limiter.enqueue(() => Promise.resolve());
        
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(1000);
    });
});
```

### 8.2 Integration Test

```javascript
// Verify complete flow
describe('EnergyGrid Client', () => {
    it('should fetch all 500 devices', async () => {
        const report = await runClient();
        
        expect(report.summary.totalDevices).toBe(500);
        expect(report.summary.failedBatches).toBe(0);
    });
});
```

---

## Appendix: Code Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `client/index.js` | ~150 | Main orchestrator |
| `client/apiClient.js` | ~100 | HTTP client |
| `client/rateLimiter.js` | ~80 | Rate limiting |
| `client/signatureGenerator.js` | ~40 | MD5 signatures |
| `client/aggregator.js` | ~90 | Result aggregation |

**Total**: ~460 lines of modular, documented code.
