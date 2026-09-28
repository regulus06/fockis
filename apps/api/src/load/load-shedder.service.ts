import { Injectable } from '@nestjs/common';

@Injectable()
export class LoadShedderService {
  private currentLoad = 0;
  private maxCapacity = 100;

  updateLoad(increment: number) {
    this.currentLoad = Math.max(0, this.currentLoad + increment);

    return this.evaluateLoad();
  }

  private evaluateLoad() {
    const loadRatio = this.currentLoad / this.maxCapacity;

    let status: 'healthy' | 'degraded' | 'overloaded' = 'healthy';

    if (loadRatio > 0.9) {
      status = 'overloaded';
    } else if (loadRatio > 0.7) {
      status = 'degraded';
    }

    return {
      currentLoad: this.currentLoad,
      maxCapacity: this.maxCapacity,
      loadRatio,
      status,
      shedding: status === 'overloaded',
    };
  }

  resetLoad() {
    this.currentLoad = 0;

    return {
      reset: true,
      currentLoad: this.currentLoad,
    };
  }
}