export interface LatencyBucket {
  label: string
  min: number
  max: number
  count: number
  percentage: number
  color: string
}

export interface BenchmarkMetrics {
  totalSent: number
  totalCompleted: number
  successCount: number
  errorCount: number
  qps: number
  avgLatency: number
  minLatency: number
  maxLatency: number
  p50Latency: number
  p90Latency: number
  p95Latency: number
  p99Latency: number
  totalBytes: number
  durationMs: number
  statusCodeDistribution: Record<string, number>
  latencyBuckets: LatencyBucket[]
}

export interface BenchmarkSampleResult {
  id: string
  requestId: string
  requestName: string
  method: string
  url: string
  status: number
  statusText?: string
  time: number
  size?: number
  error?: string
  timestamp: number
}

/**
 * Calculates a specific percentile (0 ~ 1) from an array of numbers.
 * The array does not need to be pre-sorted.
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (!values || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * percentile) - 1
  const boundedIndex = Math.max(0, Math.min(sorted.length - 1, index))
  return sorted[boundedIndex]
}

/**
 * Categorizes latencies into standardized latency distribution buckets.
 */
export function computeLatencyBuckets(latencies: number[]): LatencyBucket[] {
  const buckets: { label: string; min: number; max: number; color: string }[] = [
    { label: '< 50ms', min: 0, max: 50, color: 'text-emerald-400 bg-emerald-500' },
    { label: '50 - 100ms', min: 50, max: 100, color: 'text-teal-400 bg-teal-500' },
    { label: '100 - 300ms', min: 100, max: 300, color: 'text-sky-400 bg-sky-500' },
    { label: '300 - 500ms', min: 300, max: 500, color: 'text-amber-400 bg-amber-500' },
    { label: '500 - 1000ms', min: 500, max: 1000, color: 'text-orange-400 bg-orange-500' },
    { label: '> 1000ms', min: 1000, max: Infinity, color: 'text-rose-400 bg-rose-500' }
  ]

  const total = latencies.length
  return buckets.map((b) => {
    const count = latencies.filter((lat) => {
      if (b.max === Infinity) {
        return lat >= b.min
      }
      return lat >= b.min && lat < b.max
    }).length
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      count,
      percentage,
      color: b.color
    }
  })
}

/**
 * Formats byte size into human readable string (B, KB, MB, GB)
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

/**
 * Calculates aggregate benchmark metrics from collected results.
 */
export function calculateBenchmarkMetrics(
  totalSent: number,
  totalCompleted: number,
  successCount: number,
  errorCount: number,
  latencies: number[],
  totalBytes: number,
  durationMs: number,
  statusCounts: Record<string, number>
): BenchmarkMetrics {
  const safeDurationMs = Math.max(1, durationMs)
  const qps = Number(((totalCompleted / safeDurationMs) * 1000).toFixed(1))

  let avgLatency = 0
  let minLatency = 0
  let maxLatency = 0
  let p50Latency = 0
  let p90Latency = 0
  let p95Latency = 0
  let p99Latency = 0

  if (latencies.length > 0) {
    const sum = latencies.reduce((acc, curr) => acc + curr, 0)
    avgLatency = Math.round(sum / latencies.length)
    minLatency = Math.min(...latencies)
    maxLatency = Math.max(...latencies)
    p50Latency = calculatePercentile(latencies, 0.5)
    p90Latency = calculatePercentile(latencies, 0.9)
    p95Latency = calculatePercentile(latencies, 0.95)
    p99Latency = calculatePercentile(latencies, 0.99)
  }

  const latencyBuckets = computeLatencyBuckets(latencies)

  return {
    totalSent,
    totalCompleted,
    successCount,
    errorCount,
    qps,
    avgLatency,
    minLatency,
    maxLatency,
    p50Latency,
    p90Latency,
    p95Latency,
    p99Latency,
    totalBytes,
    durationMs,
    statusCodeDistribution: statusCounts,
    latencyBuckets
  }
}

/**
 * Generates a clean Markdown report for benchmark summary
 */
export function generateBenchmarkMarkdown(
  metrics: BenchmarkMetrics,
  title: string,
  targetCount: number,
  concurrency: number
): string {
  const successRate =
    metrics.totalCompleted > 0
      ? ((metrics.successCount / metrics.totalCompleted) * 100).toFixed(2)
      : '0.00'
  const errorRate =
    metrics.totalCompleted > 0
      ? ((metrics.errorCount / metrics.totalCompleted) * 100).toFixed(2)
      : '0.00'

  let md = `## 🚀 Relay 接口性能基准测试报告 (Benchmark Report)\n\n`
  md += `**测试目标**: ${title} (${targetCount} 个接口)\n`
  md += `**测试时间**: ${new Date().toLocaleString()}\n`
  md += `**并发连接数 (Concurrency)**: ${concurrency}\n`
  md += `**测试耗时 (Duration)**: ${(metrics.durationMs / 1000).toFixed(2)} s\n\n`

  md += `### 📊 核心指标概览 (Key Metrics)\n\n`
  md += `| 指标 (Metric) | 数值 (Value) |\n`
  md += `| :--- | :--- |\n`
  md += `| **吞吐能力 (QPS)** | **${metrics.qps} req/s** |\n`
  md += `| **完成请求数** | ${metrics.totalCompleted} / ${metrics.totalSent} |\n`
  md += `| **成功率 (Success)** | ${successRate}% (${metrics.successCount} 请求) |\n`
  md += `| **失败率 (Errors)** | ${errorRate}% (${metrics.errorCount} 请求) |\n`
  md += `| **总接收数据量** | ${formatBytes(metrics.totalBytes)} |\n\n`

  md += `### ⏱️ 响应延迟分布 (Latency Percentiles)\n\n`
  md += `| 分位数 (Percentile) | 耗时 (Latency) |\n`
  md += `| :--- | :--- |\n`
  md += `| Min (最小耗时) | ${metrics.minLatency} ms |\n`
  md += `| P50 (中位数) | ${metrics.p50Latency} ms |\n`
  md += `| P90 (90% 分位) | ${metrics.p90Latency} ms |\n`
  md += `| P95 (95% 分位) | ${metrics.p95Latency} ms |\n`
  md += `| P99 (99% 分位) | ${metrics.p99Latency} ms |\n`
  md += `| Max (最大耗时) | ${metrics.maxLatency} ms |\n`
  md += `| **Avg (平均耗时)** | **${metrics.avgLatency} ms** |\n\n`

  md += `### 📈 耗时区间分布 (Latency Buckets)\n\n`
  md += `| 区间 (Bucket) | 请求数 (Count) | 占比 (Percentage) |\n`
  md += `| :--- | :--- | :--- |\n`
  for (const b of metrics.latencyBuckets) {
    md += `| ${b.label} | ${b.count} | ${b.percentage}% |\n`
  }
  md += `\n`

  md += `### 🏷️ 状态码分布 (Status Codes)\n\n`
  md += `| 状态码 (Status) | 响应次数 (Count) |\n`
  md += `| :--- | :--- |\n`
  for (const [code, count] of Object.entries(metrics.statusCodeDistribution)) {
    md += `| ${code} | ${count} |\n`
  }

  return md
}
