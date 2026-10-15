(function () {
    "use strict";

    /**
     * Purpose: pure launch plan for the desktop shell (which python to spawn).
     * Does not: spawn, stat, or call Neutralino.
     */

    /**
     * Normalize a path string.
     * @param {string} nlPath - The path to normalize.
     * @returns {string} The normalized path.
     */
    function normalizeBase(nlPath) {
        if (!nlPath) return "";
        // Replace backslashes with forward slashes
        let normalized = nlPath.replace(/\\/g, "/");
        // Remove trailing slashes
        normalized = normalized.replace(/\/+$/, "");
        return normalized;
    }

    /**
     * Resolve application and repository roots from a path.
     * @param {Object} params - The parameters.
     * @param {string} params.nlPath - The Neutralino path.
     * @returns {Object} The resolved roots.
     */
    function resolveRoots({ nlPath }) {
        const appDir = normalizeBase(nlPath) || null;
        let repoRoot = null;

        if (appDir) {
            // Match /desktop/ or /desktop/dist/.../
            const match1 = appDir.match(/^(.*)\/desktop$/);
            if (match1) {
                repoRoot = match1[1];
            } else {
                const match2 = appDir.match(/^(.*)\/desktop\/dist\/[^/]+$/);
                if (match2) {
                    repoRoot = match2[1];
                }
            }
        }

        return { appDir, repoRoot };
    }

    /**
     * Build candidate launch configurations.
     * @param {Object} params - The parameters.
     * @param {string} params.nlPath - The Neutralino path.
     * @param {string} params.os - The operating system.
     * @param {number} params.nlPort - The Neutralino port.
     * @param {number} params.parentPid - The parent process ID.
     * @returns {Array} The candidate configurations.
     */
    function buildCandidates({ nlPath, os, nlPort, parentPid }) {
        const { appDir, repoRoot: repo } = resolveRoots({ nlPath });
        if (!appDir) return [];

        const isWin = os === "Windows";
        const q = (p) => `"${p}"`;

        // Base environment variables
        const envs = {
            APPFLY_ALLOWED_ORIGINS: [`http://localhost:${nlPort}`, `http://127.0.0.1:${nlPort}`].join(",")
        };

        if (typeof parentPid === "number" && Number.isFinite(parentPid)) {
            envs.APPFLY_PARENT_PID = String(parentPid);
        }

        const candidates = [];

        // Sidecar candidate
        const sidecarPy = `${appDir}/sidecar/${isWin ? "python.exe" : "python"}`;
        candidates.push({
            id: "sidecar",
            label: "bundled Python",
            requires: sidecarPy,
            command: `${q(sidecarPy)} -m jobhunt.api`,
            cwd: appDir,
            envs: { ...envs },
            waitMs: 20000
        });

        // If repo is null, only return the sidecar candidate
        if (!repo) {
            return candidates;
        }

        // Venv candidate
        const venvPy = isWin ? `${repo}/backend/.venv/Scripts/python.exe` : `${repo}/backend/.venv/bin/python`;
        candidates.push({
            id: "venv",
            label: "backend/.venv",
            requires: venvPy,
            command: `${q(venvPy)} -m jobhunt.api`,
            cwd: repo,
            envs: { ...envs },
            waitMs: 20000
        });

        // UV candidate
        const pyproject = `${repo}/backend/pyproject.toml`;
        candidates.push({
            id: "uv",
            label: "uv",
            requires: pyproject,
            command: `uv run --frozen --project ${q(`${repo}/backend`)} python -m jobhunt.api`,
            cwd: `${repo}/backend`,
            envs: { ...envs },
            waitMs: 60000
        });

        // Python candidate
        candidates.push({
            id: "python",
            label: isWin ? "python" : "python3",
            requires: pyproject,
            command: `${isWin ? "python" : "python3"} -m jobhunt.api`,
            cwd: repo,
            envs: { ...envs, PYTHONPATH: `${repo}/backend/src` },
            waitMs: 20000
        });

        return candidates;
    }

    /**
     * Generate a failure message based on attempts.
     * @param {Array} attempts - The attempt results.
     * @param {Object} options - The options.
     * @param {boolean} options.packaged - Whether the app is packaged.
     * @param {string} options.os - The operating system.
     * @returns {Object} The failure message.
     */
    function failureMessage(attempts, { packaged = false, os = "" } = {}) {
        const title = "AppFly couldn't start its local engine";

        if (!attempts || attempts.length === 0) {
            return {
                title,
                content: "AppFly couldn't work out where it's installed (no app path). Reinstall AppFly."
            };
        }

        // Check for timeout
        const timeoutAttempt = attempts.find(t => t.outcome === "timeout");
        if (timeoutAttempt) {
            return {
                title,
                content: `The engine started (${timeoutAttempt.label}) but didn't answer on 127.0.0.1:8787 within ${timeoutAttempt.waitMs / 1000} s. Close AppFly, check the terminal or log, and try again.`
            };
        }

        if (packaged) {
            return {
                title,
                content: "The bundled Python isn't next to the app (looked in sidecar/). Reinstall AppFly. Your data and settings are kept."
            };
        }

        const pythonLabel = os === "Windows" ? "python" : "python3";
        return {
            title,
            content: `Tried the bundled Python, backend/.venv, uv and ${pythonLabel}. None of them started the API on 127.0.0.1:8787. In the repo, run: cd backend && uv sync. Then reopen AppFly.`
        };
    }

    globalThis.AppFlyLaunchPlan = {
        normalizeBase,
        resolveRoots,
        buildCandidates,
        failureMessage
    };
})();
