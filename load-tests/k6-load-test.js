import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const latestReadingsLatency = new Trend('latest_readings_latency', true);
const historicalReadingsLatency = new Trend('historical_readings_latency', true);
const activeAlertsLatency = new Trend('active_alerts_latency', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Warm-up: ramp to 10 VUs
    { duration: '1m',  target: 50 },    // Ramp to 50 VUs
    { duration: '2m',  target: 100 },   // Sustain 100 VUs — peak load
    { duration: '1m',  target: 100 },   // Hold at peak
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],     // 95th percentile under 500ms
    'http_req_failed': ['rate<0.05'],       // Less than 5% errors
    'latest_readings_latency': ['p(99)<200'], // Cached endpoint should be fast
  },
};

export default function () {
  // --- Test 1: Latest readings (most frequent dashboard query, should be cached) ---
  group('Latest Readings (cached)', () => {
    const unit = Math.random() > 0.5 ? 'UNIT_1' : 'UNIT_2';
    const res = http.get(`${BASE_URL}/api/v1/units/${unit}/readings/latest`);

    check(res, {
      'latest: status 200': (r) => r.status === 200,
      'latest: has readings': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) && body.length > 0;
        } catch {
          return false;
        }
      },
    });

    latestReadingsLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  sleep(0.1);

  // --- Test 2: Active alerts ---
  group('Active Alerts', () => {
    const res = http.get(`${BASE_URL}/api/v1/alerts/active`);

    check(res, {
      'alerts: status 200': (r) => r.status === 200,
    });

    activeAlertsLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  sleep(0.1);

  // --- Test 3: Historical readings (heavier query, not cached) ---
  if (Math.random() < 0.2) {  // Only 20% of requests do historical queries
    group('Historical Readings', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const unit = Math.random() > 0.5 ? 'UNIT_1' : 'UNIT_2';
      const url = `${BASE_URL}/api/v1/units/${unit}/readings?from=${oneHourAgo.toISOString()}&to=${now.toISOString()}&size=50`;

      const res = http.get(url);

      check(res, {
        'historical: status 200': (r) => r.status === 200,
      });

      historicalReadingsLatency.add(res.timings.duration);
      errorRate.add(res.status !== 200);
    });
  }

  sleep(0.3);
}

// Summary report handler
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

// Inline text summary (k6 provides this when using handleSummary)
function textSummary(data) {
  return JSON.stringify(data.metrics, null, 2);
}
