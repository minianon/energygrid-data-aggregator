/**
 * Test Script - Verifies all assignment requirements
 * 
 * Run: node test.js (after running the client at least once)
 */

const fs = require('fs');
const crypto = require('crypto');

console.log('+============================================================+');
console.log('|           EnergyGrid Assignment Test Suite                 |');
console.log('+============================================================+\n');

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
    if (condition) {
        console.log(`[PASS] ${name}`);
        if (details) console.log(`       ${details}`);
        passed++;
    } else {
        console.log(`[FAIL] ${name}`);
        if (details) console.log(`       ${details}`);
        failed++;
    }
}

// Test 1: Check if aggregated_report.json exists
console.log('\n--- TEST GROUP 1: Output Verification ---\n');
const reportExists = fs.existsSync('./aggregated_report.json');
test('Aggregated report file exists', reportExists);

if (reportExists) {
    const report = JSON.parse(fs.readFileSync('./aggregated_report.json', 'utf8'));

    // Test 2: All 500 devices fetched
    test(
        'All 500 devices fetched',
        report.devices.length === 500,
        `Found ${report.devices.length} devices`
    );

    // Test 3: No failed batches
    test(
        'No failed batches',
        report.summary.failedBatches === 0,
        `Failed batches: ${report.summary.failedBatches}`
    );

    // Test 4: Serial number format verification
    const firstSN = report.devices[0]?.sn;
    const lastSN = report.devices[499]?.sn;
    test(
        'Serial number format correct',
        firstSN === 'SN-000' && lastSN === 'SN-499',
        `First: ${firstSN}, Last: ${lastSN}`
    );

    // Test 5: Device data structure
    const sampleDevice = report.devices[0];
    const hasRequiredFields = sampleDevice.sn && sampleDevice.power && sampleDevice.status && sampleDevice.last_updated;
    test(
        'Device data has required fields',
        hasRequiredFields,
        `Sample: sn=${sampleDevice.sn}, power=${sampleDevice.power}, status=${sampleDevice.status}`
    );

    // Test 6: Summary statistics present
    const hasSummaryStats =
        report.summary.totalDevices !== undefined &&
        report.summary.onlineCount !== undefined &&
        report.summary.offlineCount !== undefined &&
        report.summary.totalPowerKW !== undefined;
    test(
        'Summary statistics calculated',
        hasSummaryStats,
        `Online: ${report.summary.onlineCount}, Offline: ${report.summary.offlineCount}, Power: ${report.summary.totalPowerKW}`
    );

    // Test 7: Online + Offline = Total
    const countsMatch = report.summary.onlineCount + report.summary.offlineCount === report.summary.totalDevices;
    test(
        'Online + Offline counts match total',
        countsMatch,
        `${report.summary.onlineCount} + ${report.summary.offlineCount} = ${report.summary.totalDevices}`
    );
}

// Test 8: Signature generation verification
console.log('\n--- TEST GROUP 2: Signature Verification ---\n');
const { generateSignature } = require('./client/signatureGenerator');

const testUrl = '/device/real/query';
const testToken = 'interview_token_123';
const testTimestamp = '1700000000000';

const expectedSig = crypto.createHash('md5')
    .update(testUrl + testToken + testTimestamp)
    .digest('hex');
const actualSig = generateSignature(testUrl, testToken, testTimestamp);

test(
    'MD5 signature generation correct',
    expectedSig === actualSig,
    `Expected: ${expectedSig.substring(0, 16)}..., Got: ${actualSig.substring(0, 16)}...`
);

// Test 9: Verify client module structure
console.log('\n--- TEST GROUP 3: Code Structure Verification ---\n');
const clientFiles = [
    'client/index.js',
    'client/apiClient.js',
    'client/rateLimiter.js',
    'client/signatureGenerator.js',
    'client/aggregator.js'
];

clientFiles.forEach(file => {
    const exists = fs.existsSync(file);
    test(`Module exists: ${file}`, exists);
});

// Test 10: Documentation verification
console.log('\n--- TEST GROUP 4: Documentation Verification ---\n');
const docFiles = ['README.md', 'HLD.md', 'LLD.md'];

docFiles.forEach(file => {
    const exists = fs.existsSync(file);
    const size = exists ? fs.statSync(file).size : 0;
    test(
        `${file} exists and has content`,
        exists && size > 1000,
        `Size: ${(size / 1024).toFixed(1)} KB`
    );
});

// Final Summary
console.log('\n+============================================================+');
console.log('|                      TEST SUMMARY                          |');
console.log('+------------------------------------------------------------+');
console.log(`|  Passed: ${passed.toString().padEnd(48)}|`);
console.log(`|  Failed: ${failed.toString().padEnd(48)}|`);
console.log(`|  Result: ${(failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED').padEnd(48)}|`);
console.log('+============================================================+\n');

process.exit(failed > 0 ? 1 : 0);
