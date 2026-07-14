/**
 * TaskFlow — Daily Review Module
 */

const Review = {
    async init() {
        await this.render();
    },

    async render() {
        const container = document.getElementById('review-view-content');
        if (!container) return;

        try {
            const review = await API.reviews.today();
            container.innerHTML = this.renderReviewCard(review);
        } catch (err) {
            // No review yet — show generate button
            container.innerHTML = `
                <div class="empty-state" style="padding:4rem">
                    <div class="empty-state-icon">${Utils.icons.review}</div>
                    <div class="empty-state-title">No review for today</div>
                    <div class="empty-state-text">Generate your daily review to see a summary of your productivity.</div>
                    <button class="btn btn-primary" onclick="Review.generate()">
                        ${Utils.icons.bolt} Generate Review
                    </button>
                </div>
            `;
        }
    },

    renderReviewCard(review) {
        const scoreColor = review.productivity_score >= 70 ? '#10b981'
            : review.productivity_score >= 40 ? '#f59e0b' : '#ef4444';

        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-date">
                        ${Utils.icons.calendar}
                        <span style="margin-left:8px">${new Date(review.review_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div class="review-score">
                        Score: <span class="review-score-value" style="color:${scoreColor}">${review.productivity_score}</span>/100
                    </div>
                </div>

                <div class="review-summary">${review.summary}</div>

                <div class="stats-grid" style="margin-bottom:var(--space-xl)">
                    <div class="stat-card">
                        <div class="stat-icon green">${Utils.icons.check}</div>
                        <div class="stat-info">
                            <div class="stat-value">${review.tasks_completed}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon amber">${Utils.icons.clock}</div>
                        <div class="stat-info">
                            <div class="stat-value">${review.tasks_pending}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue">${Utils.icons.timer}</div>
                        <div class="stat-info">
                            <div class="stat-value">${Utils.formatTime(review.total_time_seconds)}</div>
                            <div class="stat-label">Time Tracked</div>
                        </div>
                    </div>
                </div>

                ${review.wins.length > 0 ? `
                    <div class="review-section">
                        <div class="review-section-title">🏆 Wins</div>
                        <ul class="review-list">
                            ${review.wins.map(w => `<li class="review-win">${w}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${review.incomplete.length > 0 ? `
                    <div class="review-section">
                        <div class="review-section-title">📋 Incomplete</div>
                        <ul class="review-list">
                            ${review.incomplete.map(t => `<li class="review-incomplete">${t}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div style="margin-top:var(--space-xl);text-align:center">
                    <button class="btn btn-ghost" onclick="Review.generate()">
                        ${Utils.icons.refresh} Regenerate Review
                    </button>
                </div>
            </div>

            <div style="margin-top:var(--space-2xl)">
                <h3 style="margin-bottom:var(--space-lg);font-size:var(--font-md)">Past Reviews</h3>
                <div id="past-reviews"></div>
            </div>
        `;
    },

    async generate() {
        try {
            Utils.toast('Generating review...', 'info');
            await API.reviews.generate({});
            await this.render();
            Utils.toast('Review generated! 📊', 'success');
        } catch (err) {
            Utils.toast('Failed to generate review', 'error');
        }
    },

    async loadPastReviews() {
        const container = document.getElementById('past-reviews');
        if (!container) return;

        try {
            const reviews = await API.reviews.list();
            if (reviews.length <= 1) {
                container.innerHTML = '<div class="empty-state-text" style="color:var(--text-tertiary)">No past reviews yet.</div>';
                return;
            }

            container.innerHTML = reviews.slice(1, 8).map(r => `
                <div class="task-item" style="cursor:default;margin-bottom:var(--space-sm)">
                    <div class="task-content">
                        <div class="task-title" style="font-size:var(--font-sm)">
                            ${new Date(r.review_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div class="task-meta">
                            <span class="badge badge-status-done">Score: ${r.productivity_score}</span>
                            <span class="tag">${r.tasks_completed} completed</span>
                            <span class="tag">${r.tasks_pending} pending</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Failed to load past reviews:', err);
        }
    },
};
