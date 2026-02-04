# EnergyGrid Data Aggregator

A robust client application for fetching real-time telemetry from 500 solar inverters, designed to navigate strict rate limits and security protocols.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Running the Application](#running-the-application)
- [Approach & Design Decisions](#approach--design-decisions)
- [Rate Limiting Strategy](#rate-limiting-strategy)
- [Error Handling](#error-handling)
- [Output](#output)
- [Project Structure](#project-structure)
- [Assumptions](#assumptions)
- [Documentation](#documentation)

## Overview

This solution addresses the challenge of fetching telemetry data from a legacy "EnergyGrid" API with strict constraints:

| Constraint | Limit | Solution |
|------------|-------|----------|
| Rate Limit | 1 request/second | Queue-based rate limiter with 1100ms delay |
| Batch Size | Max 10 devices | Chunk 500 devices into 50 batches |
| Security | MD5 signature required | Cryptographic signature generator |

## Architecture

```
+-------------------------------------------------------------------+
|                        Client Application                         |
+-------------------------------------------------------------------+
|                                                                   |
|   +--------------+    +--------------+    +--------------+        |
|   |   index.js   |--->| Rate Limiter |--->|  API Client  |        |
|   | (Orchestrator|    |  (1 req/sec) |    |   (HTTP)     |        |
|   +--------------+    +--------------+    +------+-------+        |
|          |                                        |               |
|          v                                        v               |
|   +--------------+                        +--------------+        |
|   |  Aggregator  |                        |  Signature   |        |
|   |  (Results)   |                        |  Generator   |        |
|   +--------------+                        |   (MD5)      |        |
|                                           +--------------+        |
+-------------------------------------------------------------------+
                              |
                              v
                    +------------------+
                    |  EnergyGrid API  |
                    |  (Mock Server)   |
                    +------------------+
```

## Prerequisites

- **Node.js** v14 or higher
- **npm** (Node Package Manager)

## Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd arkahub
```

### 2. Install Dependencies

```bash
npm install
```

This installs `express` which is required for the mock API server.

## Running the Application

### Step 1: Start the Mock API Server

Open a terminal and run:

```bash
npm start
# or
node server.js
```

You should see:
```
EnergyGrid Mock API running on port 3000
   Constraints: 1 req/sec, Max 10 items/batch
```

### Step 2: Run the Client (in a new terminal)

```bash
node client/index.js
```

The client will:
1. Generate 500 serial numbers (SN-000 to SN-499)
2. Create 50 batches of 10 devices each
3. Fetch data with rate limiting (~55 seconds)
4. Display aggregated report
5. Save full report to `aggregated_report.json`

## Approach & Design Decisions

### 1. Modular Architecture

The solution is split into focused, single-responsibility modules:

| Module | Responsibility |
|--------|----------------|
| `index.js` | Orchestration, serial number generation, progress display |
| `apiClient.js` | HTTP communication, retry logic |
| `rateLimiter.js` | Queue-based rate limiting |
| `signatureGenerator.js` | MD5 signature generation |
| `aggregator.js` | Result collection and statistics |

### 2. Rate Limiting Strategy

I implemented a **queue-based rate limiter** that:
- Maintains a queue of pending requests
- Ensures minimum 1100ms gap between requests (1000ms + 100ms buffer)
- Processes requests sequentially
- Provides queue length monitoring

**Why queue-based?**
- Prevents request bursting
- Maintains consistent throughput
- Easy to extend for priority queuing

### 3. Signature Generation

```javascript
// Signature = MD5(URL + Token + Timestamp)
const signature = MD5('/device/real/query' + 'interview_token_123' + '1700000000000');
```

- Uses Node.js built-in `crypto` module
- Generates fresh timestamp for each request
- No external dependencies

### 4. Error Handling

- **429 (Rate Limited)**: Exponential backoff with max 3 retries
- **401 (Auth Failed)**: Immediate failure with descriptive error
- **Network Errors**: Caught and logged, batch marked as failed
- **All errors**: Recorded in aggregator for final report

## Rate Limiting Deep Dive

```
Timeline (50 batches, 1 second apart):
---------------------------------------------------------------->
|      |      |      |                                    |
B1     B2     B3     B4    ...                           B50
|      |      |      |                                    |
t=0   t=1s   t=2s   t=3s                                t=49s

Total Time: ~55 seconds for 500 devices
Throughput: 10 devices/second (optimal given constraints)
```

## Output

### Console Output

```
+============================================================+
|         EnergyGrid Data Aggregator Client v1.0             |
+============================================================+

[1/4] Generating serial numbers...
   Generated 500 serial numbers (SN-000 to SN-499)

[2/4] Creating batches...
   Created 50 batches of 10 devices each

[3/4] Fetching device data (this will take ~50 seconds)...

   Progress: [50/50] 100% | Elapsed: 54s | Devices: 500

+============================================================+
|                      AGGREGATION REPORT                    |
+------------------------------------------------------------+
|  Total Devices Fetched:    500                             |
|  Online Devices:           ~450                            |
|  Offline Devices:          ~50                             |
|  Total Power Output:       ~1250 kW                        |
+============================================================+
```

### JSON Report (`aggregated_report.json`)

```json
{
  "summary": {
    "totalDevices": 500,
    "onlineCount": 452,
    "offlineCount": 48,
    "onlinePercentage": "90.40%",
    "totalPowerKW": "1247.83 kW",
    "averagePowerKW": "2.50 kW",
    "totalBatches": 50,
    "successfulBatches": 50,
    "failedBatches": 0
  },
  "devices": [
    {
      "sn": "SN-000",
      "power": "2.34 kW",
      "status": "Online",
      "last_updated": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Project Structure

```
arkahub/
├── client/                      # Client application
│   ├── index.js                 # Main entry point & orchestrator
│   ├── apiClient.js             # HTTP client with retry logic
│   ├── rateLimiter.js           # Queue-based rate limiter
│   ├── signatureGenerator.js    # MD5 signature generator
│   └── aggregator.js            # Result aggregation
├── server.js                    # Mock API server (provided)
├── package.json                 # Dependencies
├── instructions.md              # Assignment requirements
├── README.md                    # This file
├── HLD.md                       # High-Level Design document
├── LLD.md                       # Low-Level Design document
└── aggregated_report.json       # Generated output (after run)
```

## Assumptions

1. **Serial Number Format**: Assumed format `SN-000` to `SN-499` (zero-padded 3 digits)
2. **Timestamp Format**: Using Unix milliseconds as per server implementation
3. **Network Reliability**: Added 100ms buffer to rate limit for network jitter
4. **Retry Strategy**: Max 3 retries with exponential backoff (2s, 4s, 8s)
5. **Power Values**: Parsed from string format "X.XX kW" for aggregation

## Documentation

For detailed technical documentation, please refer to:

- **[HLD.md](./HLD.md)** - High-Level Design: System architecture, component interactions, data flow
- **[LLD.md](./LLD.md)** - Low-Level Design: Detailed module specifications, algorithms, sequences

## Testing

To verify the solution works correctly:

1. Start the mock server
2. Run the client
3. Check for:
   - No 429 errors in client output (or successful retries)
   - No 401 errors (signature correct)
   - All 500 devices in report
   - Server logs show "Success" for all requests


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Connect with me

If you’d like to connect, feel free to reach out — [Click here](https://minianonlink.vercel.app/tusharbhardwaj)
