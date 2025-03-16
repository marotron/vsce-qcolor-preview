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

    // Register command for opening color picker
    let pickColorCommand = vscode.commands.registerCommand('qcolor-preview.pickColor', async (r, g, b, matchIndex, matchLength) => {
        await showColorPicker(r, g, b, matchIndex, matchLength);
    });

    context.subscriptions.push(pickColorCommand);

    // Create decorator type for color preview with clickable squares
    const colorDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '■',
            margin: '0 5px 0 0'
        }
    });

    let activeEditor = vscode.window.activeTextEditor;
    let timeout = undefined;
    let colorMatches = [];

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

    // Handle clicks on color squares
    vscode.window.onDidChangeTextEditorSelection(event => {
        if (!activeEditor || event.textEditor !== activeEditor) {
            return;
        }

        const position = event.selections[0].active;
        
        // Check if click was near a color decoration
        for (const match of colorMatches) {
            const clickPos = activeEditor.document.positionAt(match.index);
            const linePos = new vscode.Position(clickPos.line, 0);
            
            // If clicked on the same line as a color match
            if (position.line === clickPos.line && position.character <= clickPos.character) {
                vscode.commands.executeCommand(
                    'qcolor-preview.pickColor',
                    match.r,
                    match.g,
                    match.b,
                    match.index,
                    match.length
                );
                break;
            }
        }
    });

    // Show color picker and update color values in the document
    async function showColorPicker(r, g, b, matchIndex, matchLength) {
        // Convert RGB to hex for color picker
        const hexColor = rgbToHex(r, g, b);
        
        // Show color picker
        const result = await vscode.window.showInputBox({
            prompt: 'Pick a color (hex format: #RRGGBB)',
            value: hexColor,
            validateInput: input => {
                return /^#[0-9A-Fa-f]{6}$/.test(input) ? null : 'Please enter a valid hex color';
            }
        });
        
        if (result) {
            // Convert hex back to RGB
            const newRGB = hexToRgb(result);
            
            if (newRGB) {
                // Get range of original QColor expression
                const startPos = activeEditor.document.positionAt(matchIndex);
                const endPos = activeEditor.document.positionAt(matchIndex + matchLength);
                const range = new vscode.Range(startPos, endPos);
                
                // Get the original text to preserve formatting
                const originalText = activeEditor.document.getText(range);
                
                // Create new text with updated RGB values while preserving original formatting
                const newText = originalText.replace(
                    /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
                    `${newRGB.r}, ${newRGB.g}, ${newRGB.b}`
                );
                
                // Apply the edit
                const edit = new vscode.WorkspaceEdit();
                edit.replace(activeEditor.document.uri, range, newText);
                await vscode.workspace.applyEdit(edit);
                
                // Update decorations
                updateDecorations();
            }
        }
    }

    // Helper: Convert RGB to hex
    function rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    // Helper: Convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
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
        colorMatches = [];

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
            
            // Store match information for later use
            colorMatches.push({
                index: match.index,
                length: match[0].length,
                r: r,
                g: g,
                b: b
            });
            
            const decoration = {
                range,
                renderOptions: {
                    before: {
                        contentText: '■',
                        color: `rgba(${r}, ${g}, ${b}, 1)`,
                        margin: '0 5px 0 0',
                        width: '1em',
                        height: '1em',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }
                },
                hoverMessage: 'Click to edit color'
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