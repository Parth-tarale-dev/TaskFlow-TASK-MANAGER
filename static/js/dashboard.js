/**
 * TaskFlow — Dashboard Module
 * Analytics charts and performance stats using Chart.js.
 */

const Dashboard = {
    charts: {},

    async init() {
        await this.renderStats();
        await this.renderCharts();
    },

    async renderStats() {
        const container = document.getElementById('dashboard-stats');
        if (!container) return;

        try {
            const summary = await API.analytics.summary();
            container.innerHTML = `
                <div class="stat-card stagger-item">
                    <div class="stat-icon purple">${Utils.icons.tasks}</div>
                    <div class="stat-info">
                        <div class="stat-value">${summary.total_tasks}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                </div>
                <div class="stat-card stagger-item">
                    <div class="stat-icon green">${Utils.icons.check}</div>
                    <div class="stat-info">
                        <div class="stat-value">${summary.completed_today}</div>
                        <div class="stat-label">Completed Today</div>
                    </div>
                </div>
                <div class="stat-card stagger-item">
                    <div class="stat-icon amber">${Utils.icons.clock}</div>
                    <div class="stat-info">
                        <div class="stat-value">${Utils.formatTime(summary.total_time_today_seconds)}</div>
                        <div class="stat-label">Time Today</div>
                    </div>
                </div>
                <div class="stat-card stagger-item">
                    <div class="stat-icon blue">${Utils.icons.fire}</div>
                    <div class="stat-info">
                        <div class="stat-value">${summary.streak_days}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Failed to load stats</div></div>';
        }
    },

    async renderCharts() {
        const container = document.getElementById('dashboard-charts');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="chart-card">
                    <div class="chart-card-header">
                        <div class="chart-card-title">Task Completion Rate</div>
                        <select id="completion-period" class="form-select" style="width:auto;min-width:100px">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div class="chart-wrapper"><canvas id="chart-completion"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-card-header">
                        <div class="chart-card-title">Time per Category</div>
                    </div>
                    <div class="chart-wrapper"><canvas id="chart-categories"></canvas></div>
                </div>
                <div class="chart-card full-width">
                    <div class="chart-card-header">
                        <div class="chart-card-title">Productivity Score Trend</div>
                    </div>
                    <div class="chart-wrapper"><canvas id="chart-productivity"></canvas></div>
                </div>
            </div>
        `;

        // Bind period selector
        document.getElementById('completion-period')?.addEventListener('change', (e) => {
            this.loadCompletionChart(e.target.value);
        });

        await Promise.all([
            this.loadCompletionChart('daily'),
            this.loadCategoryChart(),
            this.loadProductivityChart(),
        ]);
    },

    async loadCompletionChart(period = 'daily') {
        try {
            const data = await API.analytics.completionRate({ period, days: 30 });
            const ctx = document.getElementById('chart-completion');
            if (!ctx) return;

            if (this.charts.completion) this.charts.completion.destroy();

            this.charts.completion = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels.slice(-14),
                    datasets: [
                        {
                            label: 'Completed',
                            data: data.completed.slice(-14),
                            backgroundColor: 'rgba(99, 102, 241, 0.7)',
                            borderRadius: 6,
                            borderSkipped: false,
                        },
                        {
                            label: 'Total',
                            data: data.total.slice(-14),
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            borderRadius: 6,
                            borderSkipped: false,
                        },
                    ],
                },
                options: this.getChartOptions('Tasks'),
            });
        } catch (err) {
            console.error('Failed to load completion chart:', err);
        }
    },

    async loadCategoryChart() {
        try {
            const data = await API.analytics.timePerCategory({ days: 30 });
            const ctx = document.getElementById('chart-categories');
            if (!ctx) return;

            if (this.charts.categories) this.charts.categories.destroy();

            const colors = [
                'rgba(99, 102, 241, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(6, 182, 212, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(236, 72, 153, 0.8)',
            ];

            const hasData = data.labels.length > 0;

            this.charts.categories = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: hasData ? data.labels : ['No data'],
                    datasets: [{
                        data: hasData ? data.durations.map(d => Math.round(d / 60)) : [1],
                        backgroundColor: hasData ? colors.slice(0, data.labels.length) : ['rgba(255,255,255,0.05)'],
                        borderWidth: 0,
                        hoverOffset: 8,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#a0a0b8',
                                font: { family: 'Inter', size: 11 },
                                padding: 16,
                                usePointStyle: true,
                                pointStyleWidth: 8,
                            },
                        },
                        tooltip: {
                            backgroundColor: '#1a1a3e',
                            titleColor: '#f0f0f5',
                            bodyColor: '#a0a0b8',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            callbacks: {
                                label: (ctx) => ` ${ctx.label}: ${ctx.parsed} min`,
                            },
                        },
                    },
                },
            });
        } catch (err) {
            console.error('Failed to load category chart:', err);
        }
    },

    async loadProductivityChart() {
        try {
            const data = await API.analytics.productivityScores({ days: 30 });
            const ctx = document.getElementById('chart-productivity');
            if (!ctx) return;

            if (this.charts.productivity) this.charts.productivity.destroy();

            this.charts.productivity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels.slice(-14),
                    datasets: [{
                        label: 'Productivity Score',
                        data: data.scores.slice(-14),
                        borderColor: '#8b5cf6',
                        backgroundColor: (context) => {
                            const g = context.chart.ctx.createLinearGradient(0, 0, 0, 280);
                            g.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
                            g.addColorStop(1, 'rgba(139, 92, 246, 0)');
                            return g;
                        },
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#8b5cf6',
                        pointBorderColor: '#0e0e24',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    }],
                },
                options: {
                    ...this.getChartOptions('Score'),
                    scales: {
                        ...this.getChartOptions('Score').scales,
                        y: {
                            ...this.getChartOptions('Score').scales.y,
                            max: 100,
                        },
                    },
                },
            });
        } catch (err) {
            console.error('Failed to load productivity chart:', err);
        }
    },

    getChartOptions(yLabel) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#a0a0b8',
                        font: { family: 'Inter', size: 11 },
                        usePointStyle: true,
                        pointStyleWidth: 8,
                    },
                },
                tooltip: {
                    backgroundColor: '#1a1a3e',
                    titleColor: '#f0f0f5',
                    bodyColor: '#a0a0b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#6b6b80', font: { family: 'Inter', size: 10 }, maxRotation: 45 },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#6b6b80', font: { family: 'Inter', size: 10 } },
                    beginAtZero: true,
                },
            },
        };
    },
};
