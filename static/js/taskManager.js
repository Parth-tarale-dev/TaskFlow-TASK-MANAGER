/**
 * TaskFlow — Task Manager Module
 * Handles task CRUD UI, list/kanban views, filtering, and the task modal.
 */

const TaskManager = {
    tasks: [],
    currentFilter: { status: '', priority: '', search: '' },
    viewMode: 'list', // 'list' or 'kanban'

    async init() {
        await this.loadTasks();
        this.renderFilters();
        this.render();
        this.bindEvents();
    },

    async loadTasks() {
        try {
            const params = {};
            if (this.currentFilter.status) params.status = this.currentFilter.status;
            if (this.currentFilter.priority) params.priority = this.currentFilter.priority;
            if (this.currentFilter.search) params.search = this.currentFilter.search;
            this.tasks = await API.tasks.list(params);
        } catch (err) {
            Utils.toast('Failed to load tasks', 'error');
            this.tasks = [];
        }
    },

    renderFilters() {
        const container = document.getElementById('task-filters');
        if (!container) return;
        container.innerHTML = `
            <div class="search-input-wrapper" style="flex:1;min-width:180px">
                ${Utils.icons.search}
                <input type="text" id="task-search" class="form-input" placeholder="Search tasks..." value="${this.currentFilter.search}">
            </div>
            <select id="filter-status" class="form-select" style="width:auto;min-width:130px;flex-shrink:0">
                <option value="">All Status</option>
                <option value="todo" ${this.currentFilter.status === 'todo' ? 'selected' : ''}>To Do</option>
                <option value="in_progress" ${this.currentFilter.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="done" ${this.currentFilter.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
            <select id="filter-priority" class="form-select" style="width:auto;min-width:130px;flex-shrink:0">
                <option value="">All Priority</option>
                <option value="high" ${this.currentFilter.priority === 'high' ? 'selected' : ''}>High</option>
                <option value="medium" ${this.currentFilter.priority === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="low" ${this.currentFilter.priority === 'low' ? 'selected' : ''}>Low</option>
            </select>
            <div class="view-toggle" style="flex-shrink:0">
                <button class="view-toggle-btn ${this.viewMode === 'list' ? 'active' : ''}" data-mode="list">
                    ${Utils.icons.list} List
                </button>
                <button class="view-toggle-btn ${this.viewMode === 'kanban' ? 'active' : ''}" data-mode="kanban">
                    ${Utils.icons.grid} Board
                </button>
            </div>
        `;
    },

    render() {
        if (this.viewMode === 'list') {
            this.renderList();
        } else {
            this.renderKanban();
        }
        App.updateSidebarStats();
    },

    renderList() {
        const container = document.getElementById('task-content');
        if (!container) return;

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${Utils.icons.tasks}</div>
                    <div class="empty-state-title">No tasks yet</div>
                    <div class="empty-state-text">Create your first task to start tracking your productivity.</div>
                    <button class="btn btn-primary" onclick="TaskManager.openModal()">
                        ${Utils.icons.plus} New Task
                    </button>
                </div>
            `;
            return;
        }

        const listHTML = this.tasks.map((task, i) => `
            <div class="task-item stagger-item ${task.status === 'done' ? 'done' : ''}" data-id="${task.id}">
                <button class="task-checkbox ${task.status === 'done' ? 'checked' : ''}" 
                        onclick="TaskManager.toggleStatus(${task.id}, '${task.status}')" title="Toggle completion">
                    ${Utils.icons.check}
                </button>
                <div class="task-content" onclick="TaskManager.openModal(${task.id})">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="badge badge-priority-${task.priority}">${task.priority}</span>
                        <span class="badge badge-status-${task.status}">${task.status.replace('_', ' ')}</span>
                        ${task.due_date ? `<span class="task-due ${Utils.isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}">${Utils.icons.calendar} ${Utils.formatDate(task.due_date)}</span>` : ''}
                        ${task.total_time_seconds > 0 ? `<span class="task-time">${Utils.icons.clock} ${Utils.formatTime(task.total_time_seconds)}</span>` : ''}
                        ${task.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-ghost btn-icon" onclick="TaskManager.openModal(${task.id})" title="Edit">
                        ${Utils.icons.edit}
                    </button>
                    <button class="btn btn-ghost btn-icon" onclick="TaskManager.deleteTask(${task.id})" title="Delete">
                        ${Utils.icons.trash}
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="task-list">${listHTML}</div>`;
    },

    renderKanban() {
        const container = document.getElementById('task-content');
        if (!container) return;

        const columns = {
            todo: { title: 'To Do', color: 'var(--color-todo)', tasks: [] },
            in_progress: { title: 'In Progress', color: 'var(--color-inprogress)', tasks: [] },
            done: { title: 'Done', color: 'var(--color-done)', tasks: [] },
        };

        this.tasks.forEach(t => {
            if (columns[t.status]) columns[t.status].tasks.push(t);
        });

        let html = '<div class="kanban-board">';
        for (const [status, col] of Object.entries(columns)) {
            html += `
                <div class="kanban-column" data-status="${status}">
                    <div class="kanban-column-header">
                        <div class="kanban-column-title">
                            <span class="kanban-column-dot" style="background:${col.color}"></span>
                            ${col.title}
                        </div>
                        <span class="kanban-column-count">${col.tasks.length}</span>
                    </div>
                    <div class="kanban-column-body" data-status="${status}"
                         ondragover="TaskManager.onDragOver(event)"
                         ondragleave="TaskManager.onDragLeave(event)"
                         ondrop="TaskManager.onDrop(event, '${status}')">
                        ${col.tasks.map(t => this.renderKanbanCard(t)).join('')}
                        ${col.tasks.length === 0 ? '<div class="empty-state" style="padding:2rem"><div class="empty-state-text">Drop tasks here</div></div>' : ''}
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    renderKanbanCard(task) {
        return `
            <div class="kanban-card stagger-item" draggable="true" data-id="${task.id}"
                 ondragstart="TaskManager.onDragStart(event, ${task.id})">
                <div class="kanban-card-title" onclick="TaskManager.openModal(${task.id})">${this.escapeHtml(task.title)}</div>
                <div class="kanban-card-footer">
                    <span class="badge badge-priority-${task.priority}">${task.priority}</span>
                    ${task.due_date ? `<span class="task-due ${Utils.isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}">${Utils.formatDate(task.due_date)}</span>` : ''}
                </div>
            </div>
        `;
    },

    // ── Drag and Drop ──
    draggedTaskId: null,

    onDragStart(e, taskId) {
        this.draggedTaskId = taskId;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    },

    onDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    },

    onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    },

    async onDrop(e, newStatus) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        if (!this.draggedTaskId) return;

        try {
            await API.tasks.update(this.draggedTaskId, { status: newStatus });
            Utils.toast(`Task moved to ${newStatus.replace('_', ' ')}`, 'success');
            await this.loadTasks();
            this.render();
        } catch (err) {
            Utils.toast('Failed to move task', 'error');
        }

        this.draggedTaskId = null;
    },

    // ── Task Actions ──
    async toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'done' ? 'todo' : 'done';
        try {
            await API.tasks.update(id, { status: newStatus });
            Utils.toast(newStatus === 'done' ? 'Task completed! 🎉' : 'Task reopened', 'success');
            await this.loadTasks();
            this.render();
        } catch (err) {
            Utils.toast('Failed to update task', 'error');
        }
    },

    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        try {
            await API.tasks.delete(id);
            Utils.toast('Task deleted', 'success');
            await this.loadTasks();
            this.render();
        } catch (err) {
            Utils.toast('Failed to delete task', 'error');
        }
    },

    // ── Modal ──
    editingTaskId: null,
    modalTags: [],

    async openModal(taskId = null) {
        this.editingTaskId = taskId;
        this.modalTags = [];

        const modal = document.getElementById('task-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('task-form');

        title.textContent = taskId ? 'Edit Task' : 'New Task';

        if (taskId) {
            try {
                const task = await API.tasks.get(taskId);
                form.elements['task-title'].value = task.title;
                form.elements['task-desc'].value = task.description;
                form.elements['task-priority'].value = task.priority;
                form.elements['task-status'].value = task.status;
                form.elements['task-due'].value = task.due_date ? task.due_date.slice(0, 16) : '';
                this.modalTags = [...task.tags];
            } catch (err) {
                Utils.toast('Failed to load task', 'error');
                return;
            }
        } else {
            form.reset();
            form.elements['task-priority'].value = 'medium';
            form.elements['task-status'].value = 'todo';
        }

        this.renderModalTags();
        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('task-modal').classList.remove('active');
        this.editingTaskId = null;
        this.modalTags = [];
    },

    renderModalTags() {
        const wrapper = document.getElementById('tags-input-wrapper');
        if (!wrapper) return;

        const input = wrapper.querySelector('input');
        const tags = wrapper.querySelectorAll('.tag');
        tags.forEach(t => t.remove());

        this.modalTags.forEach((tag, i) => {
            const el = Utils.el('span', { className: 'tag' }, [
                tag,
                Utils.el('button', {
                    className: 'tag-remove',
                    textContent: '×',
                    onClick: () => {
                        this.modalTags.splice(i, 1);
                        this.renderModalTags();
                    }
                })
            ]);
            wrapper.insertBefore(el, input);
        });
    },

    addTag(value) {
        const tag = value.trim().toLowerCase();
        if (tag && !this.modalTags.includes(tag)) {
            this.modalTags.push(tag);
            this.renderModalTags();
        }
    },

    async saveTask() {
        const form = document.getElementById('task-form');
        const data = {
            title: form.elements['task-title'].value.trim(),
            description: form.elements['task-desc'].value.trim(),
            priority: form.elements['task-priority'].value,
            status: form.elements['task-status'].value,
            tags: this.modalTags,
            due_date: form.elements['task-due'].value || null,
        };

        if (!data.title) {
            Utils.toast('Title is required', 'error');
            return;
        }

        try {
            if (this.editingTaskId) {
                await API.tasks.update(this.editingTaskId, data);
                Utils.toast('Task updated', 'success');
            } else {
                await API.tasks.create(data);
                Utils.toast('Task created! 🚀', 'success');
            }
            this.closeModal();
            await this.loadTasks();
            this.render();
        } catch (err) {
            Utils.toast(err.message || 'Failed to save task', 'error');
        }
    },

    // ── Events ──
    bindEvents() {
        // Search
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(async (e) => {
                this.currentFilter.search = e.target.value;
                await this.loadTasks();
                this.render();
            }, 300));
        }

        // Filters
        document.addEventListener('change', async (e) => {
            if (e.target.id === 'filter-status') {
                this.currentFilter.status = e.target.value;
                await this.loadTasks();
                this.render();
            }
            if (e.target.id === 'filter-priority') {
                this.currentFilter.priority = e.target.value;
                await this.loadTasks();
                this.render();
            }
        });

        // View toggle
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.view-toggle-btn');
            if (btn) {
                this.viewMode = btn.dataset.mode;
                this.renderFilters();
                this.render();
                this.bindEvents();
            }
        });

        // Modal tags input
        const tagsInput = document.querySelector('#tags-input-wrapper input');
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTag(tagsInput.value);
                    tagsInput.value = '';
                }
            });
        }

        // Close modal on overlay click
        const overlay = document.getElementById('task-modal');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal();
            });
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};
