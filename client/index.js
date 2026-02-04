/**
 * EnergyGrid Data Aggregator Client
 * 
 * Main entry point that orchestrates fetching telemetry data
 * from 500 solar inverters while respecting rate limits.
 * 
 * Features:
 * - Generates 500 serial numbers (SN-000 to SN-499)
 * - Batches requests (max 10 devices per request)
 * - Rate limits requests (1 per second)
 * - Handles errors and retries
 * - Aggregates results into a final report
 */

const { fetchDeviceData } = require('./apiClient');
const { createRateLimiter, sleep } = require('./rateLimiter');
const { createAggregator } = require('./aggregator');

// Configuration
const CONFIG = {
    TOTAL_DEVICES: 500,
    BATCH_SIZE: 10,
    RATE_LIMIT_DELAY: 1100  // 1100ms to ensure we don't hit rate limit (buffer for network jitter)
};

/**
 * Generates an array of serial numbers
 * @param {number} count - Number of serial numbers to generate
 * @returns {string[]} - Array of serial numbers (SN-000 to SN-{count-1})
 */
function generateSerialNumbers(count) {
    const serialNumbers = [];
    for (let i = 0; i < count; i++) {
        // Format: SN-XXX (zero-padded to 3 digits)
        const sn = `SN-${i.toString().padStart(3, '0')}`;
        serialNumbers.push(sn);
    }
    return serialNumbers;
}

/**
 * Divides an array into chunks of specified size
 * @param {Array} array - The array to chunk
 * @param {number} size - Maximum chunk size
 * @returns {Array[]} - Array of chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Formats duration in human-readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration (e.g., "1m 30s")
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Main execution function
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         EnergyGrid Data Aggregator Client v1.0             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Step 1: Generate serial numbers
    console.log('[1/4] Generating serial numbers...');
    const serialNumbers = generateSerialNumbers(CONFIG.TOTAL_DEVICES);
    console.log(`   Generated ${serialNumbers.length} serial numbers (${serialNumbers[0]} to ${serialNumbers[serialNumbers.length - 1]})\n`);

    // Step 2: Create batches
    console.log('[2/4] Creating batches...');
    const batches = chunkArray(serialNumbers, CONFIG.BATCH_SIZE);
    console.log(`   Created ${batches.length} batches of ${CONFIG.BATCH_SIZE} devices each\n`);

    // Step 3: Initialize rate limiter and aggregator
    const rateLimiter = createRateLimiter(CONFIG.RATE_LIMIT_DELAY);
    const aggregator = createAggregator();

    // Step 4: Process batches
    console.log('[3/4] Fetching device data (this will take ~50 seconds)...\n');

    const totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNum = i + 1;

        try {
            // Rate-limited API call
            const result = await rateLimiter.enqueue(async () => {
                return await fetchDeviceData(batch);
            });

            // Add results to aggregator
            aggregator.addBatchResult(result.data);

            // Progress indicator
            const progress = ((batchNum / totalBatches) * 100).toFixed(0);
            const elapsed = formatDuration(Date.now() - startTime);
            process.stdout.write(`\r   Progress: [${batchNum}/${totalBatches}] ${progress}% | Elapsed: ${elapsed} | Devices: ${aggregator.getDeviceCount()}`);

        } catch (error) {
            console.error(`\n   [ERROR] Batch ${batchNum} failed: ${error.message}`);
            aggregator.addError(error, batch);
        }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Step 5: Generate report
    console.log('\n\n[4/4] Generating report...\n');
    const report = aggregator.getReport();

    // Display summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                      AGGREGATION REPORT                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Devices Fetched:    ${report.summary.totalDevices.toString().padEnd(30)}║`);
    console.log(`║  Online Devices:           ${report.summary.onlineCount.toString().padEnd(30)}║`);
    console.log(`║  Offline Devices:          ${report.summary.offlineCount.toString().padEnd(30)}║`);
    console.log(`║  Online Percentage:        ${report.summary.onlinePercentage.padEnd(30)}║`);
    console.log(`║  Total Power Output:       ${report.summary.totalPowerKW.padEnd(30)}║`);
    console.log(`║  Average Power per Device: ${report.summary.averagePowerKW.padEnd(30)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Batches:            ${report.summary.totalBatches.toString().padEnd(30)}║`);
    console.log(`║  Successful Batches:       ${report.summary.successfulBatches.toString().padEnd(30)}║`);
    console.log(`║  Failed Batches:           ${report.summary.failedBatches.toString().padEnd(30)}║`);
    console.log(`║  Total Execution Time:     ${formatDuration(duration).padEnd(30)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Save full report to file
    const fs = require('fs');
    const reportPath = './aggregated_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Full report saved to: ${reportPath}`);

    // Display any errors
    if (report.errors && report.errors.length > 0) {
        console.log('\n[WARNING] Errors encountered during execution:');
        report.errors.forEach((err, idx) => {
            console.log(`   ${idx + 1}. ${err.message}`);
        });
    }

    console.log('\nData aggregation complete!\n');
}

// Run the client
main().catch(error => {
    console.error('\n[FATAL] Error:', error.message);
    process.exit(1);
});
