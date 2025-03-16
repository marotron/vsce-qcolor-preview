const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('QColor Preview extension is now active');

    // Register the command to toggle color preview
    let disposable = vscode.commands.registerCommand('qcolor-preview.toggle', function () {
        vscode.window.showInformationMessage('QColor Preview toggled');
        updateDecorations();
    });

    context.subscriptions.push(disposable);

    // Create decorator type for color preview
    const colorDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '■',
            margin: '0 5px 0 0'
        }
    });

    let activeEditor = vscode.window.activeTextEditor;
    let timeout = undefined;

    // Update decorations immediately when activated
    updateDecorations();

    // Update the decorations when the text document changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    // Parse QColor values and create decorations
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }

        // Only process Python files
        if (activeEditor.document.languageId !== 'python') {
            return;
        }

        const text = activeEditor.document.getText();
        const decorations = [];

        // Regular expression to match QColor definitions
        const qcolorRegex = /QColor\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*\d+)?\s*\)/g;
        
        let match;
        while ((match = qcolorRegex.exec(text)) !== null) {
            const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, startPos);
            
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            
            const decoration = {
                range,
                renderOptions: {
                    before: {
                        contentText: '■',
                        color: `rgba(${r}, ${g}, ${b}, 1)`,
                        margin: '0 5px 0 0',
                        width: '1em',
                        height: '1em'
                    }
                }
            };
            
            decorations.push(decoration);
        }
        
        activeEditor.setDecorations(colorDecorationType, decorations);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}