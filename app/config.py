"""Application configuration."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Database
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'taskmanager.db')}"

# Static files
STATIC_DIR = os.path.join(BASE_DIR, "static")

# App metadata
APP_TITLE = "TaskFlow — Daily Task Manager"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "A high-performance daily task management and productivity monitoring application."

# Pomodoro defaults (in seconds)
POMODORO_WORK_DURATION = 25 * 60       # 25 minutes
POMODORO_SHORT_BREAK = 5 * 60          # 5 minutes
POMODORO_LONG_BREAK = 15 * 60          # 15 minutes
POMODORO_SESSIONS_BEFORE_LONG = 4      # Long break after 4 sessions
