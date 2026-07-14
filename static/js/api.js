/**
 * TaskFlow — API Client
 * Centralized HTTP client for all backend communication.
 */

const API = {
    BASE: '',

    async request(method, path, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${this.BASE}${path}`, options);

        if (res.status === 204) return null;
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    },

    // ── Tasks ──
    tasks: {
        list(params = {}) {
            const qs = new URLSearchParams(params).toString();
            return API.request('GET', `/api/tasks/${qs ? '?' + qs : ''}`);
        },
        get(id) { return API.request('GET', `/api/tasks/${id}`); },
        create(data) { return API.request('POST', '/api/tasks/', data); },
        update(id, data) { return API.request('PUT', `/api/tasks/${id}`, data); },
        delete(id) { return API.request('DELETE', `/api/tasks/${id}`); },
        reorder(tasks) { return API.request('PUT', '/api/tasks/reorder/bulk', { tasks }); },
        counts() { return API.request('GET', '/api/tasks/stats/counts'); },
    },

    // ── Timer ──
    timer: {
        list(params = {}) {
            const qs = new URLSearchParams(params).toString();
            return API.request('GET', `/api/timer/entries${qs ? '?' + qs : ''}`);
        },
        start(data) { return API.request('POST', '/api/timer/start', data); },
        stop(id, data) { return API.request('PUT', `/api/timer/stop/${id}`, data); },
        log(data) { return API.request('POST', '/api/timer/log', data); },
        taskTotal(taskId) { return API.request('GET', `/api/timer/task/${taskId}/total`); },
    },

    // ── Analytics ──
    analytics: {
        summary() { return API.request('GET', '/api/analytics/summary'); },
        completionRate(params = {}) {
            const qs = new URLSearchParams(params).toString();
            return API.request('GET', `/api/analytics/completion-rate${qs ? '?' + qs : ''}`);
        },
        timePerCategory(params = {}) {
            const qs = new URLSearchParams(params).toString();
            return API.request('GET', `/api/analytics/time-per-category${qs ? '?' + qs : ''}`);
        },
        productivityScores(params = {}) {
            const qs = new URLSearchParams(params).toString();
            return API.request('GET', `/api/analytics/productivity-scores${qs ? '?' + qs : ''}`);
        },
        tags() { return API.request('GET', '/api/analytics/tags'); },
    },

    // ── Reviews ──
    reviews: {
        list() { return API.request('GET', '/api/reviews/'); },
        today() { return API.request('GET', '/api/reviews/today'); },
        get(date) { return API.request('GET', `/api/reviews/${date}`); },
        generate(data = {}) { return API.request('POST', '/api/reviews/generate', data); },
    },
};
