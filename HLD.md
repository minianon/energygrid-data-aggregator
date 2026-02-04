# High-Level Design (HLD)
## EnergyGrid Data Aggregator

**Version**: 1.0  
**Date**: February 2026  
**Author**: Tushar Bhardwaj

---

## 1. Executive Summary

This document outlines the high-level architecture for the EnergyGrid Data Aggregator, a client application designed to fetch real-time telemetry from 500 solar inverters through a legacy API with strict rate limits and security requirements.

### Key Objectives
- Fetch data from 500 devices efficiently
- Respect API constraints (1 req/sec, 10 devices/batch)
- Implement secure authentication (MD5 signatures)
- Aggregate results into actionable reports

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM CONTEXT                                 │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐                                    ┌─────────────────┐
    │   Operator  │                                    │   Solar Field   │
    │   (User)    │                                    │  (500 Inverters)│
    └──────┬──────┘                                    └────────┬────────┘
           │                                                    │
           │ Runs                                          Telemetry
           ▼                                                    │
    ┌─────────────────────┐      HTTP/REST      ┌───────────────▼────────┐
    │   Data Aggregator   │◄────────────────────►│    EnergyGrid API     │
    │   (Client App)      │     Rate Limited     │    (Legacy System)    │
    └──────────┬──────────┘                      └────────────────────────┘
               │
               │ Generates
               ▼
    ┌─────────────────────┐
    │   Aggregated Report │
    │   (JSON File)       │
    └─────────────────────┘
```

---

## 3. Architecture Overview

### 3.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATION                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────────────────────────────────────────────────────┐     │
│   │                    ORCHESTRATION LAYER                         │     │
│   │                        (index.js)                              │     │
│   │  • Serial Number Generation                                    │     │
│   │  • Batch Creation                                              │     │
│   │  • Progress Tracking                                           │     │
│   │  • Report Generation                                           │     │
│   └───────────────────────────────────────────────────────────────┘     │
│                              │                                           │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│   │    Result    │  │     Rate     │  │     API      │                 │
│   │  Aggregator  │  │   Limiter    │  │   Client     │                 │
│   ├──────────────┤  ├──────────────┤  ├──────────────┤                 │
│   │ • Collect    │  │ • Queue      │  │ • HTTP POST  │                 │
│   │ • Statistics │  │ • Throttle   │  │ • Retry      │                 │
│   │ • Report     │  │ • Delay      │  │ • Error      │                 │
│   └──────────────┘  └──────────────┘  └──────┬───────┘                 │
│                                               │                          │
│                                      ┌────────▼───────┐                 │
│                                      │   Signature    │                 │
│                                      │   Generator    │                 │
│                                      ├────────────────┤                 │
│                                      │ • MD5 Hash     │                 │
│                                      │ • Auth Headers │                 │
│                                      └────────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Responsibility | Key Features |
|-----------|---------------|--------------|
| **Orchestrator** | Coordinates overall flow | Generates SNs, creates batches, monitors progress |
| **Rate Limiter** | Controls request frequency | Queue-based, 1 req/sec enforcement |
| **API Client** | Handles HTTP communication | POST requests, retry logic, error handling |
| **Signature Generator** | Creates authentication | MD5(URL + Token + Timestamp) |
| **Aggregator** | Collects and summarizes | Statistics calculation, report generation |

---

## 4. Data Flow

### 4.1 Request Flow

```
┌───────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW DIAGRAM                            │
└───────────────────────────────────────────────────────────────────────┘

     START
       │
       ▼
┌──────────────────┐
│ Generate 500 SNs │     SN-000, SN-001, ..., SN-499
│ (SN-000..SN-499) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Split into 50   │     [SN-000..SN-009], [SN-010..SN-019], ...
│  Batches of 10   │
└────────┬─────────┘
         │
         ▼
    ┌────────────┐
    │ For Each   │◄─────────────────────────────────────┐
    │   Batch    │                                      │
    └─────┬──────┘                                      │
          │                                             │
          ▼                                             │
    ┌────────────┐                                      │
    │   Queue    │     Wait for rate limit              │
    │   Request  │                                      │
    └─────┬──────┘                                      │
          │                                             │
          ▼                                             │
    ┌────────────┐                                      │
    │  Generate  │     MD5(URL + TOKEN + TIMESTAMP)     │
    │ Signature  │                                      │
    └─────┬──────┘                                      │
          │                                             │
          ▼                                             │
    ┌────────────┐                                      │
    │   POST     │     POST /device/real/query          │
    │  Request   │     Headers: signature, timestamp    │
    └─────┬──────┘     Body: { sn_list: [...] }         │
          │                                             │
          ▼                                             │
    ┌────────────┐     ┌────────────┐                  │
    │  Success?  │─No─►│   Retry    │──────────────────┤
    │   (200)    │     │  (if 429)  │                  │
    └─────┬──────┘     └────────────┘                  │
          │Yes                                          │
          ▼                                             │
    ┌────────────┐                                      │
    │  Aggregate │                                      │
    │   Result   │                                      │
    └─────┬──────┘                                      │
          │                                             │
          ▼                                             │
    ┌────────────┐                                      │
    │   More     │─Yes─────────────────────────────────┘
    │  Batches?  │
    └─────┬──────┘
          │No
          ▼
    ┌────────────┐
    │  Generate  │
    │   Report   │
    └─────┬──────┘
          │
          ▼
        END
```

### 4.2 Data Transformation

```
INPUT: 500 Serial Numbers
    │
    ▼
[SN-000, SN-001, ..., SN-499]
    │
    │ Batch Creation
    ▼
[[SN-000..SN-009], [SN-010..SN-019], ..., [SN-490..SN-499]]
    │
    │ API Requests (50 requests)
    ▼
[
  { sn: "SN-000", power: "2.34 kW", status: "Online", ... },
  { sn: "SN-001", power: "1.89 kW", status: "Online", ... },
  ...
]
    │
    │ Aggregation
    ▼
OUTPUT: Aggregated Report
{
  summary: {
    totalDevices: 500,
    onlineCount: 452,
    totalPowerKW: "1247.83 kW",
    ...
  },
  devices: [...]
}
```

---

## 5. Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Runtime** | Node.js 14+ | Async I/O, native HTTP support |
| **HTTP** | Built-in `http` module | No external dependencies |
| **Crypto** | Built-in `crypto` module | MD5 hashing for signatures |
| **Data** | JSON | Native JavaScript, easy parsing |

### 5.1 Why Node.js?

1. **Async/Await**: Perfect for rate-limited sequential operations
2. **Built-in Modules**: No external dependencies for core functionality
3. **JSON Native**: Seamless data handling
4. **Cross-Platform**: Works on Windows, Linux, macOS

---

## 6. Rate Limiting Strategy

### 6.1 Queue-Based Approach

```
TIME ──────────────────────────────────────────────────────────────────►

      │ 1000ms │ 1000ms │ 1000ms │ 1000ms │
      │◄──────►│◄──────►│◄──────►│◄──────►│
      
     ┌┴┐      ┌┴┐      ┌┴┐      ┌┴┐
     │R│      │R│      │R│      │R│      ...
     │1│      │2│      │3│      │4│
     └─┘      └─┘      └─┘      └─┘

     t=0      t=1s     t=2s     t=3s

QUEUE:  [B1] ─► [B2] ─► [B3] ─► [B4] ─► ... ─► [B50]
                 │
            Dequeue & Execute
            (1 per second)
```

### 6.2 Throughput Analysis

| Metric | Value |
|--------|-------|
| Total Devices | 500 |
| Batch Size | 10 |
| Total Batches | 50 |
| Request Interval | 1 second |
| **Total Time** | ~50 seconds |
| **Effective Throughput** | 10 devices/second |

---

## 7. Security Model

### 7.1 Signature Generation

```
┌────────────────────────────────────────────────────────────────┐
│                   SIGNATURE GENERATION                          │
└────────────────────────────────────────────────────────────────┘

 URL              TOKEN                TIMESTAMP
   │                │                      │
   │ "/device/     │ "interview_         │ "1700000000000"
   │  real/query"  │  token_123"          │
   │                │                      │
   └───────┬───────┴──────────┬───────────┘
           │                   │
           ▼                   │
    ┌──────────────┐          │
    │  Concatenate │◄─────────┘
    │    String    │
    └──────┬───────┘
           │
           │ "/device/real/queryinterview_token_1231700000000"
           │
           ▼
    ┌──────────────┐
    │   MD5 Hash   │
    │  (hex digest)│
    └──────┬───────┘
           │
           │ "a1b2c3d4e5f6..."
           │
           ▼
       SIGNATURE
```

### 7.2 Request Headers

| Header | Value | Example |
|--------|-------|---------|
| `Content-Type` | `application/json` | `application/json` |
| `timestamp` | Unix milliseconds | `1700000000000` |
| `signature` | MD5 hash | `a1b2c3d4e5f6...` |

---

## 8. Error Handling Strategy

### 8.1 Error Categories

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING MATRIX                     │
├──────────────┬────────────────┬──────────────────────────────┤
│ Error Type   │ HTTP Code      │ Action                       │
├──────────────┼────────────────┼──────────────────────────────┤
│ Rate Limit   │ 429            │ Retry with exponential       │
│              │                │ backoff (max 3 retries)      │
├──────────────┼────────────────┼──────────────────────────────┤
│ Auth Failed  │ 401            │ Fail immediately, log error  │
├──────────────┼────────────────┼──────────────────────────────┤
│ Bad Request  │ 400            │ Fail batch, log error        │
├──────────────┼────────────────┼──────────────────────────────┤
│ Network      │ N/A            │ Retry with backoff           │
└──────────────┴────────────────┴──────────────────────────────┘
```

### 8.2 Retry Strategy

```
Attempt 1: Immediate
     │
     ▼ (429)
     
Wait 2 seconds
     │
     ▼
Attempt 2
     │
     ▼ (429)
     
Wait 4 seconds
     │
     ▼
Attempt 3
     │
     ▼ (429)
     
Wait 8 seconds (not used)
     │
     ▼
Attempt 4 (Final)
     │
     ▼ (fail)

Mark batch as FAILED
Record error in report
```

---

## 9. Scalability Considerations

### 9.1 Current Constraints

| Factor | Current Design | Future Optimization |
|--------|----------------|---------------------|
| Device Count | 500 | Pagination support |
| Concurrency | 1 (rate limited) | Parallel connections (if allowed) |
| Storage | In-memory | Streaming to disk |
| Retry | 3 attempts | Configurable |

### 9.2 Future Enhancements

1. **Parallel Processing**: If API allows multiple endpoints
2. **Incremental Sync**: Only fetch changed devices
3. **Persistent Queue**: Resume after failures
4. **Metrics Dashboard**: Real-time monitoring

---

## 10. Deployment

### 10.1 Requirements

- Node.js 14+
- Network access to API endpoint
- ~100MB memory
- ~50 seconds runtime

### 10.2 Configuration

| Parameter | Default | Environment Variable |
|-----------|---------|---------------------|
| API Host | localhost | `ENERGYGRID_HOST` |
| API Port | 3000 | `ENERGYGRID_PORT` |
| Token | interview_token_123 | `ENERGYGRID_TOKEN` |
| Batch Size | 10 | `BATCH_SIZE` |
| Rate Limit | 1000ms | `RATE_LIMIT_MS` |

---

## 11. Conclusion

This design provides a robust, scalable solution for the EnergyGrid Data Aggregator challenge. Key highlights:

- ✅ **Modular Architecture**: Easy to test and maintain
- ✅ **Rate Limiting**: Queue-based for reliability
- ✅ **Security**: Proper MD5 signature implementation
- ✅ **Error Handling**: Comprehensive retry strategy
- ✅ **Extensibility**: Ready for future enhancements

For detailed implementation specifications, see **[LLD.md](./LLD.md)**.
