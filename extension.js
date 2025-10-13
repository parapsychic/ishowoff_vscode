const vscode = require('vscode');
const path = require("path");
const fs = require('fs');
const os = require('os');
const { Octokit } = require("@octokit/core");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    console.log('IShowOff is now active!');

    const disposableHello = vscode.commands.registerCommand('ishowoff.helloWorld', () => {
        vscode.window.showInformationMessage(`Hello from IShowOff! ${vscode.workspace.name || "No workspace"}`);
    });

    const disposableActivate = vscode.commands.registerCommand('ishowoff.activatePresence', async () => {
        vscode.window.showInformationMessage('Activating GitHub ShowOff...');

        let auth = await getGitHubAuth();
        if (!auth) return;

        const { token, username, octokit } = auth;

        const configuration = vscode.workspace.getConfiguration('ishowoff');
        let repo = configuration.get('github.actionsRepo');
        let interval = configuration.get('github.interval') || 10;
        let theme = configuration.get('formatting.theme') || "default";
        let customCommands = configuration.get('runs.customCommands') || "";

        // Check if user already has forked repo, else fork automatically
        if (!repo){
            // user has not overridden repo, check for fork
            repo = await ensureForkExists(octokit, username, repo, configuration);
        }

        // React to configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('ishowoff')) {
                vscode.window.showInformationMessage(
                    'IShowOff configuration changed. Reload required.',
                    'Reload VS Code'
                ).then(val => {
                    if (val === "Reload VS Code") vscode.commands.executeCommand('workbench.action.reloadWindow');
                });
            }
        });

        if (repo) {
            vscode.window.showInformationMessage(`IShowOff connected as @${username}`);
            updateActivity(octokit, username, repo, theme, customCommands, interval);
        } else {
            vscode.window.showErrorMessage("Could not find or create the repository for IShowOff.");
        }
    });

    const disposableDisable = vscode.commands.registerCommand('ishowoff.disablePresence', () => {
        vscode.window.showInformationMessage('GitHub ShowOff Disabled.');
    });

    // Auto activate
    vscode.commands.executeCommand('ishowoff.activatePresence');
    context.subscriptions.push(disposableHello, disposableActivate, disposableDisable);
}

function deactivate() { }

// === CORE FUNCTIONS === //

/**
 * Uses GitHub auth provider or falls back to manual token entry for Codium.
 */
async function getGitHubAuth() {
    const githubAuthProvider = vscode.authentication?.getSession
        ? 'github'
        : null;

    try {
        let session;
        if (githubAuthProvider) {
            try {
                session = await vscode.authentication.getSession('github', ['repo', 'workflow'], { createIfNone: true });
            } catch (err) {
                console.warn("GitHub authentication not available, using fallback.");
            }
        }

        if (!session) {
            // fallback: ask for a personal access token
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your GitHub Personal Access Token (repo + workflow scopes)',
                ignoreFocusOut: true,
                password: true
            });
            if (!token) {
                vscode.window.showErrorMessage("GitHub token is required for IShowOff to work.");
                return null;
            }
            const octokit = new Octokit({ auth: token });
            const { data: user } = await octokit.request('/user');
            return { token, username: user.login, octokit };
        }

        const octokit = new Octokit({ auth: session.accessToken });
        const { data: user } = await octokit.request('/user');
        return { token: session.accessToken, username: user.login, octokit };

    } catch (err) {
        vscode.window.showErrorMessage(`GitHub authentication failed: ${err.message}`);
        return null;
    }
}

/**
 * Ensures the user has a fork of parapsychic/ishowoff, else prompts to fork.
 */
async function ensureForkExists(octokit, username, repo, configuration) {
    try {
        // Check if fork exists
        const { data: forks } = await octokit.request('GET /repos/{owner}/{repo}/forks', {
            owner: 'parapsychic',
            repo: 'ishowoff'
        });

        const userFork = forks.find(f => f.owner.login === username);
        if (userFork) {
            repo = userFork.name;
            await configuration.update('github.actionsRepo', repo, vscode.ConfigurationTarget.Global);
            return repo;
        }

        // Prompt to fork
        const choice = await vscode.window.showInformationMessage(
            'You need your own fork of parapsychic/ishowoff to continue.',
            'Fork Automatically',
            'Cancel'
        );

        if (choice === 'Fork Automatically') {
            const { data: forked } = await octokit.request('POST /repos/{owner}/{repo}/forks', {
                owner: 'parapsychic',
                repo: 'ishowoff'
            });

            vscode.window.showInformationMessage(`Fork created: ${forked.full_name}`);
            repo = forked.name;
            await configuration.update('github.actionsRepo', repo, vscode.ConfigurationTarget.Global);
            await configuration.update('github.username', username, vscode.ConfigurationTarget.Global);
            return repo;
        }

        return null;
    } catch (err) {
        vscode.window.showErrorMessage(`Error checking or creating fork: ${err.message}`);
        return null;
    }
}

/**
 * Periodically updates GitHub repo dispatch event
 */
function updateActivity(octokit, username, repo, theme, customCommands, interval) {
    const startTime = Math.floor(Date.now() / 1000);
    setInterval(async () => {
        try {
            await octokit.request('POST /repos/{owner}/{repo}/dispatches', {
                owner: username,
                repo,
                event_type: 'update-from-vscode',
                client_payload: {
                    arguments: `starttime=${startTime} theme=${theme} primary-text=${getWorkspaceName()} lang=${findFileType()} editor-text="VS Code" ${customCommands}`
                },
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
        } catch (err) {
            console.error(`IShowOff dispatch failed: ${err.message}`);
        }
    }, interval * 60 * 1000);
}

function getWorkspaceName() {
    if (vscode.workspace.name) return vscode.workspace.name;
    const editor = vscode.window.activeTextEditor;
    return editor ? path.basename(editor.document.fileName) : "Idling";
}

function findFileType() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return "none";
    return editor.document.languageId;
}

module.exports = { activate, deactivate };
