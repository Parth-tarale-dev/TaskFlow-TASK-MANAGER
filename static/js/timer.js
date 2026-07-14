/**
 * TaskFlow — Timer Module
 * Pomodoro and Stopwatch timer with task association.
 */

const Timer = {
    mode: 'pomodoro',           // 'pomodoro' or 'stopwatch'
    isRunning: false,
    seconds: 25 * 60,           // Current countdown/countup value
    pomodoroDefault: 25 * 60,   // 25 min
    interval: null,
    selectedTaskId: null,
    activeEntryId: null,        // Backend time entry ID
    startTimestamp: null,

    async init() {
        this.renderTimerView();
        this.bindEvents();
        await this.loadTaskOptions();
    },

    renderTimerView() {
        const container = document.getElementById('timer-view-content');
        if (!container) return;

        container.innerHTML = `
            <div class="timer-container">
                <div class="timer-mode-toggle">
                    <button class="timer-mode-btn ${this.mode === 'pomodoro' ? 'active' : ''}" data-mode="pomodoro">Pomodoro</button>
                    <button class="timer-mode-btn ${this.mode === 'stopwatch' ? 'active' : ''}" data-mode="stopwatch">Stopwatch</button>
                </div>

                <div class="timer-display ${this.isRunning ? 'timer-running' : ''}" id="timer-display-card">
                    <div class="timer-time" id="timer-display">${Utils.formatTimerDisplay(this.seconds)}</div>
                    <div class="timer-task-label" id="timer-task-label">
                        ${this.selectedTaskId ? 'Tracking task...' : 'Select a task below to start tracking'}
                    </div>
                    <div class="timer-controls">
                        ${this.isRunning ? `
                            <button class="timer-btn timer-btn-stop" onclick="Timer.pause()" title="Pause">
                                ${Utils.icons.pause}
                            </button>
                            <button class="timer-btn timer-btn-reset" onclick="Timer.stop()" title="Stop & Save">
                                ${Utils.icons.stop}
                            </button>
                        ` : `
                            <button class="timer-btn timer-btn-reset" onclick="Timer.reset()" title="Reset">
                                ${Utils.icons.refresh}
                            </button>
                            <button class="timer-btn timer-btn-play" onclick="Timer.start()" title="Start" ${!this.selectedTaskId ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                                ${Utils.icons.play}
                            </button>
                        `}
                    </div>
                </div>

                <div class="timer-task-select">
                    <div class="form-group">
                        <label class="form-label">Select Task to Track</label>
                        <select id="timer-task-select" class="form-select">
                            <option value="">Choose a task...</option>
                        </select>
                    </div>
                </div>

                <div id="timer-history" style="margin-top:var(--space-2xl)"></div>
            </div>
        `;
    },

    async loadTaskOptions() {
        try {
            const tasks = await API.tasks.list({ sort_by: 'created_at', sort_dir: 'desc' });
            const select = document.getElementById('timer-task-select');
            if (!select) return;

            const activeTasks = tasks.filter(t => t.status !== 'done');
            select.innerHTML = '<option value="">Choose a task...</option>' +
                activeTasks.map(t =>
                    `<option value="${t.id}" ${t.id === this.selectedTaskId ? 'selected' : ''}>
                        [${t.priority.toUpperCase()}] ${t.title}
                    </option>`
                ).join('');
        } catch (err) {
            console.error('Failed to load tasks for timer:', err);
        }
    },

    async loadHistory() {
        if (!this.selectedTaskId) return;
        const container = document.getElementById('timer-history');
        if (!container) return;

        try {
            const entries = await API.timer.list({ task_id: this.selectedTaskId });
            const total = await API.timer.taskTotal(this.selectedTaskId);

            if (entries.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Time Log — ${total.task_title}</div>
                        <span class="badge badge-status-done">Total: ${total.total_formatted}</span>
                    </div>
                    <div class="task-list">
                        ${entries.slice(0, 10).map(e => `
                            <div class="task-item" style="cursor:default">
                                <div class="stat-icon ${e.timer_type === 'pomodoro' ? 'purple' : 'blue'}" style="width:32px;height:32px">
                                    ${e.timer_type === 'pomodoro' ? Utils.icons.target : Utils.icons.clock}
                                </div>
                                <div class="task-content">
                                    <div class="task-title" style="font-size:var(--font-sm)">${Utils.formatTime(e.duration_seconds)}</div>
                                    <div class="task-meta">
                                        <span class="task-due">${Utils.timeAgo(e.started_at)}</span>
                                        ${e.notes ? `<span class="tag">${e.notes}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load timer history:', err);
        }
    },

    // ── Timer Controls ──
    async start() {
        if (!this.selectedTaskId) {
            Utils.toast('Please select a task first', 'error');
            return;
        }

        if (this.isRunning) return;

        // Create backend time entry
        try {
            const entry = await API.timer.start({
                task_id: this.selectedTaskId,
                timer_type: this.mode,
            });
            this.activeEntryId = entry.id;
        } catch (err) {
            Utils.toast('Failed to start timer', 'error');
            return;
        }

        this.isRunning = true;
        this.startTimestamp = Date.now();

        if (this.mode === 'stopwatch') {
            this.seconds = 0;
            this.interval = setInterval(() => {
                this.seconds++;
                this.updateDisplay();
            }, 1000);
        } else {
            // Pomodoro countdown
            this.interval = setInterval(() => {
                this.seconds--;
                this.updateDisplay();
                if (this.seconds <= 0) {
                    this.stop();
                    Utils.toast('Pomodoro complete! Time for a break 🎉', 'success');
                }
            }, 1000);
        }

        this.renderTimerView();
        this.bindEvents();
        Utils.toast('Timer started ⏱️', 'info');
    },

    pause() {
        if (!this.isRunning) return;
        clearInterval(this.interval);
        this.isRunning = false;
        this.renderTimerView();
        this.bindEvents();
    },

    async stop() {
        clearInterval(this.interval);
        this.isRunning = false;

        const elapsed = this.mode === 'stopwatch'
            ? this.seconds
            : this.pomodoroDefault - this.seconds;

        // Save to backend
        if (this.activeEntryId && elapsed > 0) {
            try {
                await API.timer.stop(this.activeEntryId, {
                    duration_seconds: elapsed,
                });
                Utils.toast(`Saved ${Utils.formatTime(elapsed)} of work!`, 'success');
            } catch (err) {
                Utils.toast('Failed to save time entry', 'error');
            }
        }

        this.activeEntryId = null;
        this.reset();
        await this.loadHistory();
    },

    reset() {
        clearInterval(this.interval);
        this.isRunning = false;
        this.seconds = this.mode === 'pomodoro' ? this.pomodoroDefault : 0;
        this.renderTimerView();
        this.bindEvents();
        if (this.selectedTaskId) this.loadTaskOptions();
    },

    updateDisplay() {
        const display = document.getElementById('timer-display');
        if (display) {
            display.textContent = Utils.formatTimerDisplay(this.seconds);
        }
    },

    // ── Events ──
    bindEvents() {
        // Mode toggle
        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isRunning) return;
                this.mode = btn.dataset.mode;
                this.seconds = this.mode === 'pomodoro' ? this.pomodoroDefault : 0;
                this.renderTimerView();
                this.bindEvents();
                this.loadTaskOptions();
            });
        });

        // Task select
        const select = document.getElementById('timer-task-select');
        if (select) {
            select.addEventListener('change', async (e) => {
                this.selectedTaskId = e.target.value ? parseInt(e.target.value) : null;
                const label = document.getElementById('timer-task-label');
                if (label) {
                    label.textContent = this.selectedTaskId
                        ? select.options[select.selectedIndex].text
                        : 'Select a task below to start tracking';
                }
                // Re-render to enable/disable play button
                this.renderTimerView();
                this.bindEvents();
                this.loadTaskOptions();
                await this.loadHistory();
            });
        }
    },
};
