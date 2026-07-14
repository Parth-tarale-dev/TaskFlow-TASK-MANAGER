/**
 * TaskFlow — Main Application Controller
 * SPA routing, navigation, and initialization.
 */

const App = {
    currentView: 'tasks',

    async init() {
        this.bindNavigation();
        await this.navigateTo('tasks');
        await this.updateSidebarStats();
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateTo(item.dataset.view);
            });
        });
    },

    async navigateTo(view) {
        this.currentView = view;

        // Update nav active state
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Hide all views, show current
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`view-${view}`);
        if (viewEl) viewEl.classList.add('active');

        // Update page header
        const titles = {
            tasks: ['My Tasks', 'Manage and organize your daily tasks'],
            timer: ['Time Tracker', 'Track time with Pomodoro or Stopwatch'],
            dashboard: ['Analytics', 'Monitor your productivity and performance'],
            review: ['Daily Review', "Today's productivity summary"],
        };
        const [title, subtitle] = titles[view] || ['TaskFlow', ''];
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;

        // Update header actions
        const actionsEl = document.getElementById('page-actions');
        if (view === 'tasks') {
            actionsEl.innerHTML = `
                <button class="btn btn-primary" onclick="TaskManager.openModal()">
                    ${Utils.icons.plus} New Task
                </button>
            `;
        } else {
            actionsEl.innerHTML = '';
        }

        // Initialize the module for this view
        switch (view) {
            case 'tasks':
                await TaskManager.init();
                break;
            case 'timer':
                await Timer.init();
                break;
            case 'dashboard':
                await Dashboard.init();
                break;
            case 'review':
                await Review.init();
                break;
        }
    },

    async updateSidebarStats() {
        try {
            const counts = await API.tasks.counts();
            const todoEl = document.getElementById('stat-todo');
            const doneEl = document.getElementById('stat-done');
            const progressEl = document.getElementById('stat-progress');
            const totalEl = document.getElementById('stat-total');

            if (todoEl) todoEl.textContent = counts.todo;
            if (doneEl) doneEl.textContent = counts.done;
            if (progressEl) progressEl.textContent = counts.in_progress;
            if (totalEl) totalEl.textContent = counts.total;
        } catch (err) {
            console.error('Failed to update sidebar stats:', err);
        }
    },
};

// Boot the app
document.addEventListener('DOMContentLoaded', () => App.init());
