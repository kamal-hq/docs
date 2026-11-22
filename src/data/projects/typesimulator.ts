import type { ProjectDocumentation } from '../docs'

export const typeSimulatorDocs: ProjectDocumentation = {
  slug: 'typesimulator',
  updatedLabel: 'RELEASE v2.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Overview & Dual Runtime',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '7 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'Human Cadence. Machine Precision. (v2.0)',
      lead: 'An OS-level humanized keystroke automation studio for Windows engineered for paste-restricted web forms, VDI/VM/remote consoles without clipboard sharing, QA regression runs, and live demos—paired with an interactive browser sandbox on Vercel.',
      sections: [
        {
          id: 'dual-runtime',
          title: 'Unified Studio UI across Web Sandbox & Native Windows Desktop',
          blocks: [
            {
              type: 'callout',
              variant: 'note',
              title: 'LIVE WEB SANDBOX',
              text: 'Try biomechanical cadence, QWERTY typo simulation, and text sanitization live in the browser at https://typesimulator-frontend.vercel.app/ (or download the standalone Windows installer TypeSimulator-Setup-v2.0.0.exe).',
            },
            {
              type: 'paragraph',
              text: 'TypeSimulator v2 renders one shared React 19 + TypeScript + Vite 8 Studio UI across two distinct execution backends behind a single EngineAdapter interface (frontend/src/adapters/engineAdapter.ts):',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: 'Web Mode (WebSandboxAdapter)',
                  body: 'Deployed on Vercel. Runs identical Box-Muller log-normal cadence and QWERTY typo algorithms inside an interactive Paste-Blocked Sandbox with localStorage snippets.',
                },
                {
                  num: '02',
                  title: 'Desktop Mode (PyWebView + Python Engine v2)',
                  body: 'Wraps the same React UI in Windows Edge WebView2 via PyWebView, driving real OS-level pynput keystroke injection, global hotkeys, and Win32 Focus Guard.',
                },
                {
                  num: '03',
                  title: 'Non-Destructive Safety First',
                  body: 'Lock-protected FSM with zero-latency Event.wait abort, exact cursor pause/resume, and automatic pause if another window steals foreground focus.',
                },
              ],
            },
            {
              type: 'table',
              columns: ['SUBSYSTEM', 'DESKTOP IMPLEMENTATION', 'WEB SANDBOX IMPLEMENTATION'],
              rows: [
                ['Keystroke Injection', 'backend/engine.py (PynputKeyboardDriver OS SendInput)', 'frontend/src/adapters/webSandboxAdapter.ts (in-memory PasteBlockedSandbox)'],
                ['Cadence & Typos', 'backend/cadence.py (CadenceGenerator, Gauss log-normal)', 'webSandboxAdapter.ts (Box-Muller log-normal + QWERTY_NEIGHBORS)'],
                ['Focus Safety', 'backend/focus_guard.py (Win32 ctypes GetForegroundWindow)', 'Simulated Target Form focus indicator'],
                ['Global Hotkeys', 'backend/hotkeys.py (pynput GlobalHotKeys: F9, F10, Ctrl+Shift+Esc)', 'In-app transport dock controls'],
                ['Persistence', 'backend/storage.py (atomic %APPDATA%/TypeSimulator JSON)', 'localStorage (typesimulator-config-v2 & typesimulator-snippets-v2)'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'fsm-engine',
      label: 'Thread-Safe FSM Engine',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'RLock State Machine, Zero-Latency Abort & Run Loop',
      lead: 'Inside backend/engine.py: how TypingEngine eliminates race conditions across UI clicks, global hotkeys, and background worker threads.',
      sections: [
        {
          id: 'fsm-invariants',
          title: 'State transitions, monotonic run tokens & Event.wait cancellation',
          blocks: [
            {
              type: 'paragraph',
              text: 'TypingEngine implements a strict finite-state machine (IDLE -> COUNTDOWN -> TYPING <-> PAUSED -> COMPLETED | ABORTED) protected by threading.RLock. Every state transition that stops or restarts typing increments a monotonic self._run_token and signals self._interrupt_event.set(). Because the worker thread waits exclusively via interrupt.wait(delay) instead of time.sleep(), pausing or pressing Ctrl+Shift+Esc interrupts mid-character with zero latency:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'backend/engine.py (TypingEngine transitions)',
              code: `def pause(self, reason: str = "Paused manually") -> EngineSnapshot:\n    with self._lock:\n        if self._state not in ("COUNTDOWN", "TYPING"):\n            return self._build_snapshot_locked()\n        self._run_token += 1\n        self._interrupt_event.set()\n        self._state = "PAUSED"\n        self._countdown_remaining = 0\n        self._live_wpm = 0\n        self._pause_reason = reason\n        snap = self._build_snapshot_locked()\n    self._emit(snap, force=True)\n    return snap\n\ndef resume(self, skip_countdown: bool = False) -> EngineSnapshot:\n    """Resume non-destructively from saved self._cursor position."""\n    with self._lock:\n        if self._state != "PAUSED":\n            return self._build_snapshot_locked()\n        countdown = 0 if skip_countdown else min(self._config.countdown, 2)\n        self._launch_worker_locked(countdown_seconds=countdown)\n        snap = self._build_snapshot_locked()\n    self._emit(snap, force=True)\n    return snap`,
            },
          ],
        },
        {
          id: 'worker-run-loop',
          title: '3-phase worker loop & rolling WPM telemetry (_run_loop)',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: 'Phase A — Interruptible Countdown',
                  detail: 'Loops while remaining > 0 using interrupt.wait(1.0), emitting forced snapshots every second so the user has time to click into their target VDI/browser input.',
                },
                {
                  title: 'Phase B — Foreground HWND Lock',
                  detail: 'Calls window_monitor.get_active_window() the instant countdown ends and binds self._target_hwnd and self._target_title for the duration of the typing run.',
                },
                {
                  title: 'Phase C — Focus Guard + Typo Injection + Rolling Telemetry',
                  detail: 'Before every keystroke, checks cur_hwnd == expected_hwnd (auto-pausing immediately on mismatch), optionally injects an adjacent QWERTY mistype + reaction pause + Backspace, sends the intended key via _inject_character() (Enter vs Shift+Enter, Tab, or type_char), advances self._cursor, and computes rolling live WPM across a 12-timestamp deque (throttled to ~15 FPS via emit_interval_sec = 0.065).',
                },
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'backend/engine.py (_run_loop Phase C excerpt)',
              code: `# Active-Window Focus Guard check BEFORE injecting keystroke\nif cfg.focus_guard and expected_hwnd != 0:\n    cur_hwnd, cur_title = self._window_monitor.get_active_window()\n    if cur_hwnd != expected_hwnd:\n        self.pause(f"Focus switched to {cur_title or 'another application'}")\n        return\n\n# Optional QWERTY typo + reaction delay + Backspace recovery\nwrong_char = self._cadence.maybe_typo(char, cfg)\nif wrong_char is not None:\n    if interrupt.is_set() or not self._is_active_token(token):\n        return\n    self._keyboard.type_char(wrong_char)\n    if interrupt.wait(self._cadence.typo_reaction_delay()) or not self._is_active_token(token):\n        return\n    self._keyboard.press_backspace()\n    self._typo_corrections += 1\n    if interrupt.wait(self._cadence.typo_recovery_delay()) or not self._is_active_token(token):\n        return\n\nself._inject_character(char, cfg)`,
            },
          ],
        },
      ],
    },
    {
      id: 'cadence-and-typos',
      label: 'Cadence & Typo Math',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'Log-Normal Biomechanical Cadence & Physical QWERTY Neighbors',
      lead: 'Walkthrough of backend/cadence.py: how TypeSimulator models natural human inter-keystroke intervals without drifting off the configured target WPM.',
      sections: [
        {
          id: 'lognormal-math',
          title: 'Mean-preserving log-normal delay model (backend/cadence.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Uniform random delays feel robotic because human inter-keystroke intervals follow a right-skewed log-normal distribution (fast bursts inside familiar words punctuated by longer cognitive pauses at clause boundaries). CadenceGenerator computes a mean-preserving log-normal multiplier (setting mu = -0.5 * sigma^2 so E[exp(N(mu, sigma^2))] = 1) anchored to base_interval = 60.0 / (wpm * 5.0), then layers contextual punctuation multipliers:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'backend/cadence.py',
              code: `def compute_delay(self, char: str, prev_char: Optional[str], config: TypingConfig) -> float:\n    wpm = max(25, min(150, config.target_wpm))\n    base_interval = 60.0 / (wpm * 5.0)  # 1 word = 5 chars\n\n    sigma = 0.05 + (max(0, min(100, config.variability)) / 100.0) * 0.40\n    mu = -0.5 * (sigma ** 2)            # Preserves target WPM mean\n    factor = max(0.45, min(2.4, math.exp(self._rng.gauss(mu, sigma))))\n    delay = base_interval * factor\n\n    if char == "\\n":                   delay *= self._rng.uniform(1.9, 3.2)   # Paragraph break\n    elif char in _SENTENCE_PUNCT:      delay *= self._rng.uniform(1.7, 2.9)   # . ! ?\n    elif char in _CLAUSE_PUNCT:        delay *= self._rng.uniform(1.25, 1.95) # , ; : -\n    elif char == " ":                  delay *= self._rng.uniform(1.12, 1.60) # Word boundary\n    elif prev_char and prev_char.isalpha() and char.isalpha():\n        delay *= self._rng.uniform(0.78, 1.08)                                # Word-interior burst\n    return max(0.012, delay)`,
            },
            {
              type: 'table',
              columns: ['PRESET', 'TARGET WPM', 'VARIABILITY', 'RHYTHM PROFILE'],
              rows: [
                ['Natural', '68 WPM', '34%', 'Balanced daily touch-typist cadence with moderate bursts and clause pauses'],
                ['Fast', '105 WPM', '24%', 'High-speed developer rhythm with tighter dispersion'],
                ['Thoughtful', '48 WPM', '58%', 'High-variance deliberate cadence suited for live demos and narration'],
                ['Steady', '75 WPM', '10%', 'Minimal variance for deterministic QA regression form runs'],
              ],
            },
          ],
        },
        {
          id: 'qwerty-typo-sim',
          title: 'Physical QWERTY neighbor map & case-preserving corrections',
          blocks: [
            {
              type: 'paragraph',
              text: 'When typos_enabled is active (0–8% error rate), maybe_typo() selects a physically adjacent key from QWERTY_NEIGHBORS (e.g., "e" -> "wsdr", "f" -> "ertgvcd"), matches uppercase/lowercase to the original character, waits a cognitive reaction delay (120–250ms), taps Backspace, and waits a motor recovery delay (50–110ms) before typing the correct key.',
            },
          ],
        },
      ],
    },
    {
      id: 'safety-sanitizer-hotkeys',
      label: 'Focus Guard, Sanitizer & Hotkeys',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'Win32 ctypes Focus Guard, Artifact Sanitizer & Global Hotkeys',
      lead: 'Walkthrough of backend/focus_guard.py, backend/sanitizer.py, and backend/hotkeys.py: zero-C-dependency Win32 safety hooks and rich-text normalization.',
      sections: [
        {
          id: 'win32-focus-guard',
          title: 'Zero-dependency Win32 Focus Guard (backend/focus_guard.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Rather than pulling in heavy pywin32 binaries, Win32WindowMonitor calls user32.GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, and shell32.IsUserAnAdmin directly through Python stdlib ctypes—reporting both foreground window handle changes and UAC elevation status:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'backend/focus_guard.py',
              code: `class Win32WindowMonitor:\n    def get_active_window(self) -> tuple[int, str]:\n        if sys.platform != "win32":\n            return (0, "")\n        user32 = ctypes.windll.user32\n        hwnd = int(user32.GetForegroundWindow())\n        if hwnd == 0:\n            return (0, "")\n        length = int(user32.GetWindowTextLengthW(hwnd))\n        buf = ctypes.create_unicode_buffer(length + 1)\n        user32.GetWindowTextW(hwnd, buf, length + 1)\n        return (hwnd, buf.value.strip())\n\n    def is_elevated(self) -> bool:\n        return bool(ctypes.windll.shell32.IsUserAnAdmin()) if sys.platform == "win32" else False`,
            },
          ],
        },
        {
          id: 'sanitizer-and-hotkeys',
          title: 'Strict Text Sanitizer & Global Hotkey Manager',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: '8-Rule Artifact Normalization (backend/sanitizer.py)',
                  detail: 'Replaces curly double/single smart quotes, em/en dashes, Unicode ellipses (…), non-breaking spaces (\\u00a0, \\u2000–\\u200a), zero-width joiners/BOMs, bullet glyphs, and CRLF line endings, returning a structured SanitizeBreakdown count for the UI diff popover.',
                },
                {
                  title: 'Configurable Markdown, Tabs & Newlines',
                  detail: 'Optionally strips Markdown headings, bold/italic, strikethrough, and inline code backticks; converts tabs to 4-spaces, 2-spaces, strip, or literal Key.tab; and emits either Enter or Shift+Enter for chat/web inputs.',
                },
                {
                  title: 'Live Rebindable Global Hotkeys (backend/hotkeys.py)',
                  detail: 'normalize_hotkey_to_pynput() translates combos like "Ctrl+Shift+Esc" and "F9" into pynput syntax (<ctrl>+<shift>+<esc>, <f9>). GlobalHotkeyManager validates that all 3 bindings are unique before stopping the previous daemon listener and starting a fresh GlobalHotKeys hook.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'bridge-and-storage',
      label: 'PyWebView Bridge & Storage',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'Bidirectional JS <-> Python IPC, Compact HUD & Atomic JSON',
      lead: 'Inside backend/bridge.py, backend/storage.py, and frontend/src/adapters/engineAdapter.ts: real-time snapshot push, native window resizing, and crash-safe persistence.',
      sections: [
        {
          id: 'ipc-bridge',
          title: 'Bidirectional PyWebView IPC & Compact HUD resizing (backend/bridge.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'DesktopBridge is exposed directly to the React frontend as window.pywebview.api. Commands flow JS -> Python via RPC methods (start, pause, resume, abort, update_config, set_compact_hud), while live engine snapshots push Python -> JS via window.evaluate_js() invoking window.__typeSimulatorOnEvent(payload). Toggling Compact HUD resizes the native window cleanly between STUDIO_SIZE = (1220, 800) and a floating always-on-top HUD_SIZE = (580, 96) telemetry pill:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'backend/bridge.py',
              code: `STUDIO_SIZE = (1220, 800)\nHUD_SIZE = (580, 96)\n\ndef _push_snapshot(self, snapshot: EngineSnapshot) -> None:\n    if self._window is None:\n        return\n    payload = json.dumps(snapshot.to_dict(), ensure_ascii=False)\n    self._window.evaluate_js(\n        f"window.__typeSimulatorOnEvent && window.__typeSimulatorOnEvent({payload});"\n    )\n\ndef set_compact_hud(self, enabled: bool) -> bool:\n    want_hud = bool(enabled)\n    if self._window is not None and want_hud != self._is_compact_hud:\n        if want_hud:\n            self._pre_hud_on_top = self._always_on_top\n            self._window.resize(*HUD_SIZE)\n            self._window.on_top = True\n        else:\n            self._window.resize(*STUDIO_SIZE)\n            self._window.on_top = self._pre_hud_on_top\n    self._is_compact_hud = want_hud\n    return self._is_compact_hud`,
            },
          ],
        },
        {
          id: 'atomic-storage',
          title: 'Atomic %APPDATA% JSON persistence (backend/storage.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'LocalStorage persists config.json and snippets.json under %APPDATA%/TypeSimulator (or ~/.typesimulator on non-Windows) using write-to-.tmp + os.replace() so abrupt power loss or process termination never leaves a truncated JSON file.',
            },
          ],
        },
      ],
    },
    {
      id: 'build-and-packaging',
      label: 'Testing & Windows Installer',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '6 MIN READ',
      title: 'TypeSimulator',
      subtitle: 'Automated Pytest Suites, Web Build & Inno Setup Packaging',
      lead: 'Reference commands for running the 6 backend test suites, deploying the Vercel web sandbox, and compiling TypeSimulator-Setup-v2.0.0.exe.',
      badge: 'v2.0',
      sections: [
        {
          id: 'dev-and-release',
          title: 'Testing, development & standalone installer pipeline',
          blocks: [
            {
              type: 'code',
              language: 'powershell',
              filename: 'Development, Test & Release Commands',
              code: `# 1. Backend tests (6 offline suites: FSM, cadence, sanitizer, hotkeys, bridge, storage)\npython -m venv venv\n.\\venv\\Scripts\\Activate.ps1\npip install -r requirements.txt pytest\npytest\n\n# 2. Frontend Web Sandbox (Vercel target -> frontend/dist/)\ncd frontend && npm install && npm run build:web\n\n# 3. Native Desktop Mode (PyWebView + Python Engine v2)\ncd frontend && npm run build:desktop && cd ..\npython -m backend.desktop_app\n\n# 4. Build Standalone Windows Setup Wizard (.exe)\n.\\installer\\build.ps1  # -> installer/output/TypeSimulator-Setup-v2.0.0.exe`,
            },
            {
              type: 'table',
              columns: ['TEST SUITE / ARTIFACT', 'PATH', 'COVERAGE'],
              rows: [
                ['FSM Engine Tests', 'tests/test_engine_fsm.py', 'State transitions, zero-latency abort, cursor preservation, Focus Guard auto-pause'],
                ['Cadence Tests', 'tests/test_cadence.py', 'WPM anchoring, log-normal bounds, punctuation multipliers, QWERTY typo case matching'],
                ['Sanitizer Tests', 'tests/test_sanitizer.py', 'Smart quotes, dashes, zero-width stripping, Markdown removal, tab policies'],
                ['Hotkeys & Bridge Tests', 'tests/test_hotkeys.py, test_bridge.py', 'Combo normalization, duplicate rejection, IPC snapshot push, HUD window state'],
                ['Atomic Storage Tests', 'tests/test_storage.py', 'Atomic .tmp -> os.replace writes, seed snippets, corrupt JSON recovery'],
                ['Windows Installer', 'installer/build.ps1, typesimulator.spec, setup.iss', 'Generates icon.ico, builds desktop Vite bundle, runs PyInstaller + Inno Setup 6'],
              ],
            },
          ],
        },
      ],
    },
  ],
}
