import { Controller, Get } from '@nestjs/common';
import { MetricService } from '../services/metric.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricService: MetricService) {}

  @Get()
  async getMetrics() {
    return this.metricService.getAllMetrics();
  }
}
