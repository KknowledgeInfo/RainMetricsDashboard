import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Chart as ChartInstance } from 'chart.js';
import {
  MetricsView,
  RainMetricsDevice,
  RainMetricsFilters,
  RainMetricsLocation,
  RainMetricsOverview,
  RainMetricsOverviewLocation,
  RainMetricsQuery,
  RainMetricsResponse
} from './rain-metrics.models';
import { RainMetricsApiService } from './rain-metrics-api.service';

type ChartModule = typeof import('chart.js');

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('overviewCanvas') overviewCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChildren('metricsCanvas') metricsCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  readonly views: { value: MetricsView; label: string }[] = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];
  readonly currentYear = new Date().getFullYear();

  activeSection: 'overview' | 'rainMetrics' = 'overview';
  sidebarExpanded = false;
  private sidebarPinned = false;
  private sidebarHasFocus = false;
  darkTheme = false;
  loadingOverview = true;
  loadingMetrics = false;
  errorMessage = '';
  overview?: RainMetricsOverview;
  metrics?: RainMetricsResponse;
  filters: RainMetricsFilters = { devices: [], locations: [] };
  view: MetricsView = 'DAILY';
  chartType: 'bar' | 'line' = 'bar';
  selectedDate = this.formatDate(new Date());
  selectedMonth = new Date().getMonth();
  selectedYear = this.currentYear;
  selectedWeek = 1;
  selectedLocation = '';
  selectedDeviceId = '';

  private chartModulePromise?: Promise<ChartModule>;
  private overviewChart?: ChartInstance;
  private readonly metricsCharts: ChartInstance[] = [];
  private overviewRenderRevision = 0;
  private metricsRenderRevision = 0;

  constructor(
    private readonly api: RainMetricsApiService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFilters();
    this.loadOverview();
  }

  ngAfterViewInit(): void {
    this.metricsCanvases.changes.subscribe(() => this.renderMetricsCharts());
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  get availableDevices(): RainMetricsDevice[] {
    return this.selectedLocation
      ? this.filters.devices.filter((device) => device.location === this.selectedLocation)
      : this.filters.devices;
  }

  get weeks(): number[] {
    const daysInMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate();
    return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => index + 1);
  }

  get totalRainfall(): number {
    return this.overview?.locations.reduce((total, location) => total + location.totalMm, 0) ?? 0;
  }

  get heavyLocationCount(): number {
    return this.overview?.locations.filter((location) => location.heavyRain).length ?? 0;
  }

  get selectedMonthName(): string {
    return this.months[this.selectedMonth];
  }

  hasHeavyRain(location: RainMetricsLocation): boolean {
    return location.readings.some((reading) => reading.heavyRain);
  }

  heavyBucketCount(location: RainMetricsLocation): number {
    return location.readings.filter((reading) => reading.heavyRain).length;
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (filters) => {
        this.filters = filters;
      },
      error: () => {
        this.errorMessage = 'Could not load station filters. Check that the RainMetrics API is running.';
      }
    });
  }

  loadOverview(): void {
    this.loadingOverview = true;
    this.api.getOverview().subscribe({
      next: (overview) => {
        this.overview = overview;
        this.loadingOverview = false;
        this.errorMessage = '';
        this.changeDetector.detectChanges();
        this.renderOverviewChart();
      },
      error: () => {
        this.loadingOverview = false;
        this.errorMessage = 'Could not load rain data. Check that the RainMetrics API is running.';
      }
    });
  }

  showSection(section: 'overview' | 'rainMetrics'): void {
    this.activeSection = section;
    if (section === 'overview' && !this.overview) {
      this.loadOverview();
    } else if (section === 'rainMetrics' && !this.metrics) {
      this.loadMetrics();
    } else {
      this.changeDetector.detectChanges();
      this.renderCharts();
    }
  }

  loadMetrics(): void {
    const query: RainMetricsQuery = {
      view: this.view,
      location: this.selectedLocation || undefined,
      deviceId: this.selectedDeviceId || undefined
    };
    if (this.view === 'DAILY') {
      query.date = this.selectedDate;
    } else if (this.view === 'WEEKLY') {
      query.month = this.selectedMonthName;
      query.year = this.selectedYear;
      query.week = this.selectedWeek;
    } else if (this.view === 'MONTHLY') {
      query.month = this.selectedMonthName;
      query.year = this.selectedYear;
    } else {
      query.year = this.selectedYear;
    }

    this.loadingMetrics = true;
    this.errorMessage = '';
    this.api.getMetrics(query).subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.loadingMetrics = false;
        this.changeDetector.detectChanges();
        this.renderMetricsCharts();
      },
      error: () => {
        this.loadingMetrics = false;
        this.errorMessage = 'Could not load the selected rainfall data. Please try again.';
      }
    });
  }

  onLocationChange(): void {
    if (this.selectedDeviceId && !this.availableDevices.some((device) => device.id === this.selectedDeviceId)) {
      this.selectedDeviceId = '';
    }
  }

  onViewChange(): void {
    this.metrics = undefined;
    this.renderMetricsCharts();
  }

  setChartType(type: 'bar' | 'line'): void {
    if (this.chartType === type) return;
    this.chartType = type;
    this.renderMetricsCharts();
  }

  toggleSidebar(): void {
    this.sidebarPinned = !this.sidebarPinned;
    this.sidebarExpanded = this.sidebarPinned;
  }

  onMenuToggleMouseEnter(): void {
    if (!this.sidebarPinned) this.sidebarExpanded = true;
  }

  onSidebarMouseEnter(): void {
    if (!this.sidebarPinned) this.sidebarExpanded = true;
  }

  onSidebarMouseLeave(): void {
    if (!this.sidebarPinned && !this.sidebarHasFocus) this.sidebarExpanded = false;
  }

  onSidebarFocusIn(): void {
    this.sidebarHasFocus = true;
    this.sidebarExpanded = true;
  }

  onSidebarFocusOut(event: FocusEvent): void {
    const sidebar = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (sidebar instanceof HTMLElement && nextTarget instanceof HTMLElement && sidebar.contains(nextTarget)) return;
    this.sidebarHasFocus = false;
    if (!this.sidebarPinned && sidebar instanceof HTMLElement && !sidebar.matches(':hover')) {
      this.sidebarExpanded = false;
    }
  }

  toggleTheme(): void {
    this.darkTheme = !this.darkTheme;
    this.changeDetector.detectChanges();
    this.renderCharts();
  }

  refresh(): void {
    this.loadOverview();
    if (this.activeSection === 'rainMetrics') this.loadMetrics();
  }

  private renderCharts(): void {
    if (this.activeSection === 'overview') this.renderOverviewChart();
    if (this.activeSection === 'rainMetrics') this.renderMetricsCharts();
  }

  private async renderOverviewChart(): Promise<void> {
    if (!this.overviewCanvas || !this.overview) return;
    const revision = ++this.overviewRenderRevision;
    const overview = this.overview;
    const canvas = this.overviewCanvas.nativeElement;
    let chartModule: ChartModule;
    try {
      chartModule = await this.loadChartModule();
    } catch (error) {
      console.error('Unable to load rainfall chart library', error);
      this.errorMessage = 'The rainfall chart could not be loaded. Refresh the dashboard to try again.';
      return;
    }
    if (revision !== this.overviewRenderRevision
        || this.activeSection !== 'overview'
        || this.overview !== overview
        || this.overviewCanvas?.nativeElement !== canvas) return;
    this.overviewChart?.destroy();
    const palette = this.darkTheme
      ? ['#f2f2ef', '#b5b5b0', '#82827e']
      : ['#191919', '#777777', '#b0b0b0'];
    const datasets = overview.locations.map((location, index) => ({
      label: location.location,
      data: location.hourlyRainfallMm,
      borderColor: location.heavyRain ? '#dc4545' : palette[index % palette.length],
      backgroundColor: location.heavyRain ? 'rgba(220, 69, 69, 0.12)' : 'transparent',
      pointBackgroundColor: location.hourlyRainfallMm.map((value) =>
        value >= overview.heavyRainThresholdMm ? '#dc4545' : palette[index % palette.length]
      ),
      borderWidth: 2,
      pointRadius: 2.5,
      tension: 0.35,
      fill: false
    }));
    this.overviewChart = new chartModule.Chart(canvas, {
      type: 'line',
      data: {
        labels: overview.buckets.map((bucket) => bucket.label),
        datasets
      },
      options: this.chartOptions()
    });
  }

  private async renderMetricsCharts(): Promise<void> {
    const revision = ++this.metricsRenderRevision;
    this.metricsCharts.forEach((chart) => chart.destroy());
    this.metricsCharts.length = 0;
    if (this.activeSection !== 'rainMetrics' || !this.metrics) return;
    const metrics = this.metrics;
    let chartModule: ChartModule;
    try {
      chartModule = await this.loadChartModule();
    } catch (error) {
      console.error('Unable to load rainfall chart library', error);
      this.errorMessage = 'The rainfall chart could not be loaded. Refresh the dashboard to try again.';
      return;
    }
    if (revision !== this.metricsRenderRevision
        || this.activeSection !== 'rainMetrics'
        || this.metrics !== metrics) return;
    this.metricsCanvases?.forEach((canvas, index) => {
      const location = metrics.locations[index];
      if (location) this.metricsCharts.push(this.createLocationChart(chartModule, canvas.nativeElement, location, this.chartType));
    });
  }

  private createLocationChart(
    chartModule: ChartModule,
    canvas: HTMLCanvasElement,
    location: RainMetricsLocation,
    type: 'bar' | 'line'
  ): ChartInstance {
    const rainfall = location.readings.map((reading) => reading.rainfallMm);
    const heavyThreshold = this.metrics?.heavyRainThresholdMm ?? 5;
    const lineColor = this.darkTheme ? '#6fc7ff' : '#2563eb';
    const colors = location.readings.map((reading) =>
      reading.rainfallMm >= heavyThreshold ? '#dc4545' : (type === 'line' ? lineColor : (this.darkTheme ? '#d9e8f2' : '#1a1a1a'))
    );
    return new chartModule.Chart(canvas, {
      type,
      data: {
        labels: location.readings.map((reading) => reading.label),
        datasets: [{
          label: 'Rainfall (mm)',
          data: rainfall,
          backgroundColor: type === 'bar' ? colors : (this.darkTheme ? 'rgba(111, 199, 255, 0.12)' : 'rgba(37, 99, 235, 0.08)'),
          borderColor: type === 'bar' ? colors : lineColor,
          pointBackgroundColor: colors,
          pointBorderColor: this.darkTheme ? '#1d1d1d' : '#ffffff',
          borderWidth: type === 'line' ? 3 : 1,
          borderRadius: type === 'bar' ? 5 : 0,
          pointRadius: type === 'line' ? 3 : 0,
          tension: 0.35,
          fill: type === 'line'
        }]
      },
      options: this.chartOptions()
    });
  }

  private chartOptions(): ChartInstance['options'] {
    const textColor = this.darkTheme ? '#c7c7c7' : '#696969';
    const gridColor = this.darkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: this.activeSection === 'overview' && (this.overview?.locations.length ?? 0) > 1,
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 7, color: textColor, padding: 18 }
        },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${Number(context.parsed.y).toFixed(2)} mm`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, maxTicksLimit: this.view === 'DAILY' ? 12 : 16 }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rainfall (mm)', color: textColor },
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      }
    };
  }

  private destroyCharts(): void {
    this.overviewRenderRevision++;
    this.metricsRenderRevision++;
    this.overviewChart?.destroy();
    this.overviewChart = undefined;
    this.metricsCharts.forEach((chart) => chart.destroy());
    this.metricsCharts.length = 0;
  }

  private loadChartModule(): Promise<ChartModule> {
    if (!this.chartModulePromise) {
      this.chartModulePromise = import('chart.js').then((chartModule) => {
        chartModule.Chart.register(
          chartModule.BarController,
          chartModule.BarElement,
          chartModule.CategoryScale,
          chartModule.Filler,
          chartModule.Legend,
          chartModule.LinearScale,
          chartModule.LineController,
          chartModule.LineElement,
          chartModule.PointElement,
          chartModule.Tooltip
        );
        return chartModule;
      });
    }
    return this.chartModulePromise;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
