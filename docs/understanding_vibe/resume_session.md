# Session Management in Mistral Vibe

## Overview

Mistral Vibe's session system provides **persistent conversation history** for the CLI agent. When you interact with Vibe, your conversation is automatically saved, allowing you to **resume previous sessions** across terminal restarts. Sessions are stored locally and organized to enable quick access, search, and management.

This document explains **how sessions are created, stored, loaded, and used** in the `vibe/core/session` module.

---

## Session Creation

When you start a new conversation with Vibe, a session is automatically created:

### 1. Session ID Generation (`session_id.py`)

Each session gets a **unique UUID-shaped identifier**:
```
format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
example: 123e4567-e89b-12d3-a456-426614174000
```

- The **first 20 hex characters** are always randomly generated
- The **last 12 hex characters** (after the final hyphen) can be:
  - Randomly generated for new sessions
  - A **stable suffix** preserved across `/fork` and `/rewind` operations

**Key functions:**
- `generate_session_id(suffix=None)` - Creates new ID with optional stable suffix
- `extract_suffix(session_id)` - Extracts the stable suffix from an ID

### 2. Session Directory Creation (`session_logger.py`)

A new directory is created in the **session save directory** (default: `~/.vibe/sessions/`):

```
vibe_sessions/
└── vibe_20241019_153022_123e4567/
    ├── messages.jsonl
    └── meta.json
```

**Directory naming pattern:**
```
{session_prefix}_{timestamp}_{shortened_session_id}
vibe_20241019_153022_123e4567
```

The `SessionLogger` class initializes with:
- Current working directory
- Git commit and branch (if in a git repo)
- Username
- Session start timestamp
- Empty message list and metadata

---

## Session Storage Format

Each session directory contains two main files:

### `messages.jsonl` - Conversation History

This file stores the **complete conversation** as **JSON Lines** (one JSON object per line).

**Format:** Each line is a message object:
```json
{"role": "user", "content": "Hello, how are you?", "timestamp": "..."}
{"role": "assistant", "content": "I'm doing well, thank you!", "tool_calls": [...], "timestamp": "..."}
{"role": "tool", "content": [...], "tool_call_id": "...", "timestamp": "..."}
```

**Message Roles:**
- `user` - Your input
- `assistant` - Vibe's responses
- `tool` - Results from tool calls (file reads, web searches, etc.)
- `system` - Internal system prompts (not persisted to session)

**Message Loading:**
- Messages are loaded and validated as `LLMMessage` objects
- System messages are filtered out during loading
- Empty sessions are only valid if metadata records `total_messages: 0`

### `meta.json` - Session Metadata

This file contains **all session metadata** as a single JSON object:

```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "start_time": "2024-10-19T15:30:22+00:00",
  "end_time": "2024-10-19T15:45:33+00:00",
  "title": "Project documentation review",
  "title_source": "manual",
  "username": "developer",
  "git_commit": "abc123def",
  "git_branch": "feature/new-api",
  "environment": {
    "working_directory": "/home/user/project"
  },
  "origin_directory": "/home/user/project",
  "parent_session_id": null,
  "total_messages": 42,
  "last_message_fingerprint": "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "config": {
    "active_model": "mistral-large-latest",
    "max_tokens": 4096,
    "temperature": 0.7
  },
  "stats": {
    "steps": 21,
    "session_prompt_tokens": 15000,
    "session_completion_tokens": 8000,
    "tool_calls_succeeded": 5,
    "tool_calls_failed": 0
  },
  "pinned_at": null,
  "bumped_at": "2024-10-19T15:45:00+00:00",
  "child_sessions": [],
  "loops": [],
  "experiments": null
}
```

**Key Metadata Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | Unique session identifier |
| `parent_session_id` | string\|null | For forked/rewound sessions, references parent |
| `start_time` | ISO timestamp | When session was created |
| `end_time` | ISO timestamp\|null | Last time session was active |
| `title` | string\|null | Human-readable session title |
| `title_source` | "auto"\|"manual" | Whether title was auto-generated or user-set |
| `username` | string | User who created the session |
| `git_commit` | string\|null | Git commit hash (if in a git repo) |
| `git_branch` | string\|null | Git branch name |
| `environment.working_directory` | string | Current working directory |
| `origin_directory` | string\|null | Where session originally started (for moved sessions) |
| `total_messages` | integer | Number of non-system messages |
| `last_message_fingerprint` | string\|null | SHA-256 hash of last message (for integrity) |
| `config` | object | Session-scoped configuration snapshot |
| `stats` | object | Agent statistics for the session |
| `pinned_at` | string\|null | When session was pinned |
| `bumped_at` | string\|null | Latest user interaction time |
| `child_sessions` | array | Sub-sessions created by tool calls |
| `loops` | array | Scheduled loop definitions |

---

## SessionLifetime

### 1. During an Active Session

While you're conversing with Vibe:

1. **Messages are appended** to `messages.jsonl` after each turn
2. **Metadata is updated** in `meta.json` with:
   - Latest `end_time`
   - `bumped_at` timestamp (on user input)
   - Updated `stats` (token counts, tool calls)
   - Modified `config` (if you switch models)
3. **Session index** is automatically updated for quick listing
4. **Last session pointer** tracks which session is active in your current terminal

**Persistence Mechanism:**
- Uses **atomic writes** (write to temp file, then rename)
- protected with `asyncio.Lock` to prevent race conditions
- Only non-system messages are persisted

### 2. Session Resumption

When you resume a previous session:

1. **Session Discovery:**
   ```python
   # Find all sessions in the current directory
   sessions = SessionLoader.list_sessions(config.session_logging, cwd=cwd)
   ```

2. **Session Selection:**
   - You can select from the list of previous sessions
   - Sessions are sorted by `updated_at` (newest first)
   - Each session shows its title or first message as preview

3. **Session Loading:**
   ```python
   # Load messages and metadata
   session_dir = SessionLoader.find_session_by_id(session_id, config)
   messages, metadata = SessionLoader.load_session(session_dir)
   ```

4. **Session Binding:**
   ```python
   # Attach logger to existing session
   session_logger.resume_existing_session(session_id, session_dir)
   ```

5. **Continuation:**
   - New messages are **appended** to existing `messages.jsonl`
   - Metadata is updated with new timestamps and stats
   - Session operates identically to a new session

### 3. Session Deletion

When you delete a session:
```python
# Remove session directory from disk
await delete_saved_session(session_id, config)
```

This:
- Deletes the session directory and all its files
- Cleans up any "last session" pointers referencing it
- Index is automatically updated on next list operation

---

## Session Management Components

### `SessionLogger` - Core Logging Class

The central class that manages session persistence during a conversation.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `save_interaction()` | Saves complete turn (messages, stats, tools, config) |
| `persist_messages()` | Appends new messages to the conversation |
| `persist_metadata()` | Updates session metadata file |
| `persist_active_model()` | Updates which LLM model is being used |
| `persist_title()` | Updates session title |
| `persist_bumped_at()` | Updates last interaction timestamp |
| `resume_existing_session()` | Binds to an existing session directory |
| `reset_session()` | Clears and starts a new session |

**Thread Safety:**
- All persistence operations use `asyncio.Lock`
- Prevents interleaved writes in concurrent scenarios
- Atomic file operations prevent corruption

### `SessionLoader` - Loading and Discovery

Static utility class for **reading sessions from disk**.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `list_sessions()` | Returns all sessions, sorted newest-first |
| `find_latest_session()` | Finds most recent session in a directory |
| `find_session_by_id()` | Locates specific session by its ID |
| `load_session()` | Loads messages and metadata as Python objects |
| `load_metadata()` | Loads only the metadata for a session |
| `get_first_user_message()` | Extracts first user message for preview |

**Session Discovery Logic:**
1. Uses glob pattern: `{prefix}_*{short_id}`
2. Validates both `meta.json` and `messages.jsonl` exist
3. Checks `working_directory` and `origin_directory` for filtering by current dir
4. Validates message count matches `metadata.total_messages`

### `SessionIndex` - Performance Optimization

An **in-memory, disk-persisted cache** of session listings.

**Purpose:** Avoid expensive directory scans on every session list operation.

**How it Works:**
1. Maintains cache in memory as `_Entry` objects (mtime_ns + SessionInfo)
2. Persists cache to `.session_index.json` file
3. Compares file modification times on each `list()` call
4. Only re-reads `meta.json` files that have changed
5. Handles corruption by rebuilding from scratch

**Benefits:**
- First list after startup: O(n) directory scan
- Subsequent lists: O(1) with file stat checks
- Much faster for users with many sessions

### `LastSessionPointer` - Terminal Session Tracking

Tracks which session was **last active in each terminal**.

**Mechanism:**
```
.vibe/sessions/
└── .last_session/
    ├── conhost-123456   (Windows terminal)
    ├── pts-0           (Linux terminal)
    └── ttys001         (macOS terminal)
```

Each pointer file contains just the session ID. This allows Vibe to:
- Automatically resume the last session when you reopen a terminal
- Support multiple parallel terminal sessions
- Track sessions across different terminal types

**Functions:**
- `record(config, session_id)` - Save current session for active TTY
- `load(config)` - Get last session ID for current TTY
- `clear_matching(config, session_id)` - Cleanup when session deleted

### `SavedSessions` - Offline Session Operations

Operations for **modifying saved sessions** (when not actively using them).

**Functions:**

| Function | Description |
|----------|-------------|
| `update_saved_session_title()` | Change session title |
| `update_saved_session_pin()` | Pin/unpin session |
| `relocate_saved_session()` | Move session to different directory |
| `delete_saved_session()` | Delete session from disk |

### `ResumeSessions` - High-Level Resume Interface

Provides the **user-facing interface** for session resumption.

**Data Structure:**
```python
@dataclass(frozen=True)
class ResumeSessionInfo:
    session_id: str
    cwd: str
    title: str | None
    start_time: str | None
    end_time: str | None
    bumped_at: str | None
    pinned_at: str | None
    updated_at: str
    parent_session_id: str | None
```

**Functions:**
- `list_local_resume_sessions()` - Returns list of `ResumeSessionInfo`
- `session_latest_messages()` - Gets preview text for each session
- `resume_directories()` - Returns directories containing sessions

---

## Special Session Features

### Fork and Rewind Support

When you use `/fork` or `/rewind`:

1. A **new session ID** is generated with the **same stable suffix**
2. The `parent_session_id` field references the original session
3. Messages up to the fork/rewind point are copied
4. New conversation continues independently

This creates a **session tree** that you can navigate.

### Session Moving

Sessions can be **moved between directories**:
- `relocate_saved_session(session_id, new_cwd)` updates both working_directory and origin_directory
- Session remains findable from both old and new locations
- Useful when you reorganize your projects

### Session Pinning

You can **pin important sessions**:
- Pinned sessions appear first in session lists
- `pinned_at` timestamp tracks when it was pinned
- Pinned sessions maintain their order based on pin time

### Session Titles

Sessions can have **two types of titles**:
- **Auto-generated** (`title_source: "auto"`) - Based on first user message
- **Manual** (`title_source: "manual"`) - User-set via `/rename` command

Manual titles **always take precedence** over auto-generated ones.

### Worktree Context

Sessions track **git worktree creation**:
- When you create a worktree with `/worktree`, it's recorded in metadata
- `created_worktree` field contains worktree entry ID, name, branch, path
- Allows sessions to be associated with their worktree origins

---

## Directory Structure

```
~/.vibe/
├── sessions/                    # Default session save directory
│   ├── .last_session/          # Terminal-specific session pointers
│   │   ├── pts-0
│   │   └── ttys001
│   ├── .session_index.json     # Session index cache
│   ├── vibe_20241019_153022_123e4567/  # Session 1
│   │   ├── messages.jsonl
│   │   └── meta.json
│   ├── vibe_20241019_160000_abc123def/  # Session 2
│   │   ├── messages.jsonl
│   │   └── meta.json
│   └── ...
└── ...
```

---

## How Sessions Are Used in the Application

### Startup Flow

1. **Vibe CLI Initializes**
2. **Session Configuration Loaded** - From `config.session_logging`
3. **Session Index Warmed** - Background thread loads `.session_index.json`
4. **Last Session Check** - `LastSessionPointer.load()` checks for auto-resume
5. **New or Resumed Session** - Depending on user choice or auto-resume

### Conversation Flow

```
User Input → Agent Loop Processing
         → Tool Calls (if needed)
         → LLM Response
         ↓
SessionLogger.save_interaction()
         ↓
  1. Append messages to messages.jsonl
  2. Update meta.json with:
     - end_time
     - bumped_at (if user message)
     - stats
     - config
     - last_message_fingerprint
  3. Update session index
  4. Update last session pointer
```

### Resume Flow

```
User selects session from list
         ↓
SessionLoader.find_session_by_id()
         ↓
Load messages and metadata
         ↓
Initialize AgentLoop with history
         ↓
SessionLogger.resume_existing_session()
         ↓
Continue conversation (appending to existing files)
```

### Session Listing Flow

```
User requests session list
         ↓
SessionIndex.list()
         ↓
  1. Reconcile cache with disk (check mtimes)
  2. Return cached SessionInfo objects
  3. Filter by current directory if specified
         ↓
Format for display
         ↓
User selects session to resume
```

---

## Design Principles

### 1. Atomic Writes
- All file writes use **temp file + rename** pattern
- Prevents corruption if process is interrupted
- Messages are **appended** when possible, rewritten only when necessary

### 2. Thread Safety
- `SessionLogger` uses `asyncio.Lock` for persistence
- `SessionIndex` uses `threading.Lock` for cache access
- Prevents race conditions in multi-threaded scenarios

### 3. Performance
- Session index caches metadata in memory
- Reconciliation uses cheap `stat()` calls
- Only re-reads `meta.json` when files change
- Background thread warms index on startup

### 4. Data Integrity
- Message fingerprints detect boundary changes
- Validates `total_messages` matches actual count
- Corrupt sessions excluded from listings
- All writes are fsynced to disk

### 5. Portability
- Sessions can be moved between directories
- Works across different terminals (TTY-specific pointers)
- Compatible with older session formats (migration support)

---

## Configuration

Session behavior is controlled by `SessionLoggingConfig`:

```python
@dataclass
class SessionLoggingConfig:
    enabled: bool = True              # Enable/disable session logging
    save_dir: str = "~/.vibe/sessions"  # Where to save sessions
    session_prefix: str = "vibe"       # Prefix for session directories
    # ... other config fields
```

You can configure this in your Vibe settings:
- Enable/disable session saving
- Change save directory location
- Customize session prefix

---

## Command Line Usage

In the Vibe CLI:

| Command | Description |
|---------|-------------|
| `/new` or `/clear` | Start a new session (clears current conversation) |
| `/resume` | Show list of previous sessions to resume |
| `/resume <id>` | Resume specific session by ID |
| `/rename <title>` | Change current session title |
| `/fork` | Fork current session (creates child session) |
| `/rewind` | Rewind to specific point in conversation |
| `/delete` | Delete current session |

---

## Summary

Mistral Vibe's session system provides **reliable, efficient conversation persistence** that enables:

✅ **Seamless resumption** - Pick up where you left off across terminal sessions
✅ **Session management** - List, search, and organize previous conversations
✅ **Fork and rewind** - Experiment with different paths from a conversation point
✅ **Performance** - Fast session listing even with hundreds of sessions
✅ **Integrity** - Robust against interruption and corruption
✅ **Portability** - Sessions work across terminals and can be moved

The system is designed to be **invisible when it works** - you simply conversation history that's always there when you need it, without manual save/load operations.