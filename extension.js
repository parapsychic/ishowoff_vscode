// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require("path");
const Octokit = require("@octokit/core").Octokit;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ishowoff" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ishowoff.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage(`Hello World from ishowoff! ${vscode.workspace.name}`);
	});

	let showOffActivate = vscode.commands.registerCommand('ishowoff.activatePresence', function () {
		vscode.window.showInformationMessage('Github ShowOff Activated !');

		const configuration = vscode.workspace.getConfiguration('ishowoff');
		const token = configuration.get('github.token');
		const username = configuration.get('github.username');
		const repo = configuration.get('github.actionsRepo');
		const interval = configuration.get('github.interval');
		const theme = configuration.get('formatting.theme');
		const customCommands = configuration.get('runs.customCommands');

		// register on config changed
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('ishowoff')) {
				vscode.window.showInformationMessage('IShowOff detected changes in configuration. A reload is required.',
					'Reload VS Code'
				).then((value) => {
					if (value == "Reload VS Code") {
						vscode.commands.executeCommand('workbench.action.reloadWindow')

					}
				});
			}
		})

		if (checkConfig(token, username, repo, theme, interval)) {
			updateActivity(token, username, repo, theme, customCommands, interval);
		}
		else {
			vscode.window.showInformationMessage('IShowOff requires configuration. Please set the token and other information.',
				'Open Settings'
			).then((value) => {
				if (value == "Open Settings") {
					vscode.commands.executeCommand("workbench.action.openSettings", "ishowoff")
				}
			}
			);
		}

	})

	let showOffDisable = vscode.commands.registerCommand('ishowoff.disablePresence', function () {
		vscode.window.showInformationMessage('Github ShowOff Disabled !');
	})

	vscode.commands.executeCommand('ishowoff.activatePresence')
	context.subscriptions.push(disposable, showOffActivate, showOffDisable);
}

// This method is called when your extension is deactivated
function deactivate() { }

function updateActivity(token, username, repo, theme, customCommands, interval) {
	const startTime = Math.floor(Date.now() / 1000);


	const octokit = new Octokit({
		auth: token
	});

	setInterval(async () => {
		await octokit.request('POST /repos/{owner}/{repo}/dispatches', {
			owner: username,
			repo: repo,
			event_type: 'update-from-vscode',
			client_payload: {
				arguments: `starttime=${startTime} theme=${theme} primary-text=${getWorkspaceName()} lang=${findFileType()} editor-text="Visual Studio Code" ${customCommands}`
			},
			headers: {
				'X-GitHub-Api-Version': '2022-11-28'
			}
		});
	}, interval * 60 * 1000);
}
function getFileType(activeEditor) {
	const document = activeEditor ? activeEditor.document : vscode.workspace.activeTextEditor.document;
	return document.languageId;
}

function findFileType() {
	// Get the file type of the currently active editor
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor == undefined) return "none";

	const fileType = getFileType(activeEditor);
	console.log(`Current file type: ${fileType}`);
	return fileType;

}

function getWorkspaceName() {
	if (vscode.workspace.name) {
		return vscode.workspace.name;
	} else {
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			return path.basename(activeEditor.document.fileName);
		}
		else {
			return "Idling";
		}
	}
}

function checkConfig(token, username, repo, theme, interval) {
	if (token == undefined || token == "XXXXXXXX" || token.trim() == ""
		|| username == undefined || username.trim() == ""
		|| repo == undefined || repo.trim() == ""
		|| interval == undefined || interval < 1
		|| theme == undefined || theme.trim() == "") {
		return false;
	}

	return true;

}


module.exports = {
	activate,
	deactivate
}
