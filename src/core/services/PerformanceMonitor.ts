import { EventEmitter } from 'events';
import os from 'os';

interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  timestamp: Date;
  activeConnections: number;
  messagesPerMinute: number;
  errorRate: number;
}

class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private messageCounter = 0;
  private errorCounter = 0;
  private lastMinuteMessages = 0;
  private lastMinuteErrors = 0;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    super();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);
  }

  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: new Date(),
      activeConnections: this.getActiveConnections(),
      messagesPerMinute: this.messageCounter - this.lastMinuteMessages,
      errorRate: this.errorCounter - this.lastMinuteErrors
    };

    this.metrics.push(metrics);
    this.lastMinuteMessages = this.messageCounter;
    this.lastMinuteErrors = this.errorCounter;

    // Emit performance warning if needed
    this.checkPerformanceWarnings(metrics);
  }

  private checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    const memoryThreshold = 500 * 1024 * 1024; // 500MB
    const errorRateThreshold = 10; // 10 errors per minute

    if (metrics.memoryUsage.heapUsed > memoryThreshold) {
      this.emit('warning', {
        type: 'HIGH_MEMORY_USAGE',
        message: `Memory usage: ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        metrics
      });
    }

    if (metrics.errorRate > errorRateThreshold) {
      this.emit('warning', {
        type: 'HIGH_ERROR_RATE',
        message: `Error rate: ${metrics.errorRate} errors/min`,
        metrics
      });
    }
  }

  private getActiveConnections(): number {
    // This would be integrated with WhatsappService
    return 0;
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  public incrementMessageCounter(): void {
    this.messageCounter++;
  }

  public incrementErrorCounter(): void {
    this.errorCounter++;
  }

  public getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      loadAverage: os.loadavg()
    };
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  public getMetricsHistory(hours = 1): PerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();