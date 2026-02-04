/**
 * Result Aggregator Module
 * Collects and aggregates telemetry data from all devices
 * 
 * Features:
 * - Accumulates results from multiple batches
 * - Generates summary statistics
 * - Exports final report
 */

/**
 * Creates an aggregator instance
 * @returns {Object} - Aggregator with add and getReport methods
 */
function createAggregator() {
    const devices = [];
    const errors = [];
    let totalBatches = 0;
    let successfulBatches = 0;
    let failedBatches = 0;

    /**
     * Adds batch results to the aggregator
     * @param {Object[]} batchData - Array of device data from API response
     */
    function addBatchResult(batchData) {
        totalBatches++;
        if (batchData && Array.isArray(batchData)) {
            devices.push(...batchData);
            successfulBatches++;
        }
    }

    /**
     * Adds an error for a failed batch
     * @param {Error} error - The error that occurred
     * @param {string[]} snList - Serial numbers in the failed batch
     */
    function addError(error, snList) {
        totalBatches++;
        failedBatches++;
        errors.push({
            message: error.message,
            affectedDevices: snList,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Calculates summary statistics
     * @returns {Object} - Summary statistics object
     */
    function calculateStats() {
        const onlineDevices = devices.filter(d => d.status === 'Online');
        const offlineDevices = devices.filter(d => d.status === 'Offline');

        // Calculate total power (parse numeric value from "X.XX kW" format)
        const totalPower = devices.reduce((sum, device) => {
            const power = parseFloat(device.power) || 0;
            return sum + power;
        }, 0);

        return {
            totalDevices: devices.length,
            onlineCount: onlineDevices.length,
            offlineCount: offlineDevices.length,
            onlinePercentage: ((onlineDevices.length / devices.length) * 100).toFixed(2) + '%',
            totalPowerKW: totalPower.toFixed(2) + ' kW',
            averagePowerKW: (totalPower / devices.length).toFixed(2) + ' kW'
        };
    }

    /**
     * Generates the final aggregated report
     * @returns {Object} - Complete report with data and statistics
     */
    function getReport() {
        const stats = calculateStats();

        return {
            summary: {
                ...stats,
                totalBatches,
                successfulBatches,
                failedBatches,
                errorCount: errors.length,
                generatedAt: new Date().toISOString()
            },
            devices: devices,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Gets the current device count
     * @returns {number} - Number of devices collected
     */
    function getDeviceCount() {
        return devices.length;
    }

    return {
        addBatchResult,
        addError,
        getReport,
        getDeviceCount
    };
}

module.exports = {
    createAggregator
};
