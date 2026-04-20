/**
 * stats.js — Компонент статистики сети
 */

export function createStatsComponent({ statInbound, statOutbound, statRtt, statLoss }) {
    let statsInterval = null;

    function update(stats) {
        stats.forEach(report => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                const kbps = ((report.bytesReceived || 0) * 8 / 1000).toFixed(0);
                if (statInbound) statInbound.textContent = `${kbps} kbps`;
            }
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                const kbps = ((report.bytesSent || 0) * 8 / 1000).toFixed(0);
                if (statOutbound) statOutbound.textContent = `${kbps} kbps`;
            }
            if (report.type === 'remote-inbound-rtp') {
                if (statRtt)  statRtt.textContent  = `${((report.roundTripTime || 0) * 1000).toFixed(0)} ms`;
                if (statLoss) statLoss.textContent = `${((report.fractionLost || 0) * 100).toFixed(1)} %`;
            }
        });
    }

    function start(getStats) {
        stop();
        statsInterval = setInterval(async () => {
            const stats = await getStats();
            if (stats) update(stats);
        }, 1000);
    }

    function stop() {
        if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
    }

    function reset() {
        stop();
        if (statInbound)  statInbound.textContent  = '— Mbps';
        if (statOutbound) statOutbound.textContent = '— Mbps';
        if (statRtt)      statRtt.textContent      = '— ms';
        if (statLoss)     statLoss.textContent     = '— %';
    }

    return { start, stop, reset };
}
