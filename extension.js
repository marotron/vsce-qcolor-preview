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
        await showColorPickerWithSliders(r, g, b, matchIndex, matchLength);
    });

    context.subscriptions.push(pickColorCommand);

    // Create a map to track active webview panels for different colors
    let colorWebviewPanels = new Map();

    // Show a color picker webview with sliders
    async function showColorPickerWithSliders(r, g, b, matchIndex, matchLength) {
        // Create a unique key for this color edit
        const key = `${matchIndex}-${matchLength}`;
        
        // Check if a webview already exists for this color edit
        if (colorWebviewPanels.has(key)) {
            // Focus the existing panel
            colorWebviewPanels.get(key).reveal();
            return;
        }
        
        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'qcolorPicker',
            'Color Picker',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        // Add to map
        colorWebviewPanels.set(key, panel);
        
        // Set HTML content with sliders
        panel.webview.html = getColorPickerHTML(r, g, b);
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === 'colorChanged') {
                    const newR = message.red;
                    const newG = message.green;
                    const newB = message.blue;
                    
                    // Get range of original QColor expression
                    const startPos = activeEditor.document.positionAt(matchIndex);
                    const endPos = activeEditor.document.positionAt(matchIndex + matchLength);
                    const range = new vscode.Range(startPos, endPos);
                    
                    // Get the original text to preserve formatting
                    const originalText = activeEditor.document.getText(range);
                    
                    // Create new text with updated RGB values while preserving original formatting
                    const newText = originalText.replace(
                        /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
                        `${newR}, ${newG}, ${newB}`
                    );
                    
                    // Apply the edit
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(activeEditor.document.uri, range, newText);
                    await vscode.workspace.applyEdit(edit);
                    
                    // Update decorations
                    updateDecorations();
                } else if (message.command === 'close') {
                    panel.dispose();
                }
            },
            undefined,
            context.subscriptions
        );
        
        // Clean up when the panel is closed
        panel.onDidDispose(
            () => {
                colorWebviewPanels.delete(key);
            },
            null,
            context.subscriptions
        );
    }

    // Generate HTML for the color picker webview
    function getColorPickerHTML(r, g, b) {
        const hexColor = rgbToHex(r, g, b);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QColor Picker</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .color-preview {
            width: 100%;
            height: 100px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
        }
        .slider-container {
            margin-bottom: 15px;
        }
        label {
            display: inline-block;
            width: 60px;
            margin-right: 10px;
        }
        .slider-value {
            display: inline-block;
            width: 40px;
            text-align: right;
            margin-left: 10px;
        }
        input[type="range"] {
            width: 60%;
            vertical-align: middle;
        }
        .button-container {
            margin-top: 20px;
            text-align: right;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            margin-left: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .color-info {
            margin-top: 15px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <h2>QColor Picker</h2>
    
    <div class="color-preview" id="colorPreview" style="background-color: ${hexColor};"></div>
    
    <div class="slider-container">
        <label for="redSlider" style="color: #ff6666;">Red:</label>
        <input type="range" id="redSlider" min="0" max="255" value="${r}">
        <span class="slider-value" id="redValue">${r}</span>
    </div>
    
    <div class="slider-container">
        <label for="greenSlider" style="color: #66cc66;">Green:</label>
        <input type="range" id="greenSlider" min="0" max="255" value="${g}">
        <span class="slider-value" id="greenValue">${g}</span>
    </div>
    
    <div class="slider-container">
        <label for="blueSlider" style="color: #6666ff;">Blue:</label>
        <input type="range" id="blueSlider" min="0" max="255" value="${b}">
        <span class="slider-value" id="blueValue">${b}</span>
    </div>
    
    <div class="color-info">
        <div>Hex: <span id="hexValue">${hexColor}</span></div>
        <div>RGB: <span id="rgbValue">rgb(${r}, ${g}, ${b})</span></div>
    </div>
    
    <div class="button-container">
        <button id="cancelButton">Cancel</button>
        <button id="applyButton">Apply</button>
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            // Elements
            const colorPreview = document.getElementById('colorPreview');
            const redSlider = document.getElementById('redSlider');
            const greenSlider = document.getElementById('greenSlider');
            const blueSlider = document.getElementById('blueSlider');
            const redValue = document.getElementById('redValue');
            const greenValue = document.getElementById('greenValue');
            const blueValue = document.getElementById('blueValue');
            const hexValue = document.getElementById('hexValue');
            const rgbValue = document.getElementById('rgbValue');
            const applyButton = document.getElementById('applyButton');
            const cancelButton = document.getElementById('cancelButton');
            
            // Current RGB values
            let currentRed = ${r};
            let currentGreen = ${g};
            let currentBlue = ${b};
            
            // Update color preview and text values
            function updateColorPreview() {
                const hexColor = rgbToHex(currentRed, currentGreen, currentBlue);
                colorPreview.style.backgroundColor = hexColor;
                redValue.textContent = currentRed;
                greenValue.textContent = currentGreen;
                blueValue.textContent = currentBlue;
                hexValue.textContent = hexColor;
                rgbValue.textContent = \`rgb(\${currentRed}, \${currentGreen}, \${currentBlue})\`;
            }
            
            // Convert RGB to hex
            function rgbToHex(r, g, b) {
                return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
            
            // Event listeners for sliders
            redSlider.addEventListener('input', () => {
                currentRed = parseInt(redSlider.value);
                updateColorPreview();
            });
            
            greenSlider.addEventListener('input', () => {
                currentGreen = parseInt(greenSlider.value);
                updateColorPreview();
            });
            
            blueSlider.addEventListener('input', () => {
                currentBlue = parseInt(blueSlider.value);
                updateColorPreview();
            });
            
            // Apply button
            applyButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'colorChanged',
                    red: currentRed,
                    green: currentGreen,
                    blue: currentBlue
                });
                vscode.postMessage({
                    command: 'close'
                });
            });
            
            // Cancel button
            cancelButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'close'
                });
            });
        }());
    </script>
</body>
</html>`;
    }

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
        
        // Use QuickPick to create a custom color picker experience
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = 'Pick a Color';
        quickPick.placeholder = 'Current color: ' + hexColor;
        
        // Create the items for our quick pick
        const redItem = {
            label: `Red: ${r}`,
            description: 'Adjust red component (0-255)',
            value: r,
            type: 'red'
        };
        
        const greenItem = {
            label: `Green: ${g}`,
            description: 'Adjust green component (0-255)',
            value: g,
            type: 'green'
        };
        
        const blueItem = {
            label: `Blue: ${b}`,
            description: 'Adjust blue component (0-255)',
            value: b,
            type: 'blue'
        };
        
        const confirmItem = {
            label: 'Confirm Color',
            description: `Apply ${hexColor}`,
            type: 'confirm'
        };
        
        quickPick.items = [redItem, greenItem, blueItem, confirmItem];
        
        let newR = r;
        let newG = g;
        let newB = b;
        
        quickPick.onDidChangeSelection(async selection => {
            const selectedItem = selection[0];
            
            if (selectedItem.type === 'confirm') {
                quickPick.hide();
                
                // Get range of original QColor expression
                const startPos = activeEditor.document.positionAt(matchIndex);
                const endPos = activeEditor.document.positionAt(matchIndex + matchLength);
                const range = new vscode.Range(startPos, endPos);
                
                // Get the original text to preserve formatting
                const originalText = activeEditor.document.getText(range);
                
                // Create new text with updated RGB values while preserving original formatting
                const newText = originalText.replace(
                    /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/,
                    `${newR}, ${newG}, ${newB}`
                );
                
                // Apply the edit
                const edit = new vscode.WorkspaceEdit();
                edit.replace(activeEditor.document.uri, range, newText);
                await vscode.workspace.applyEdit(edit);
                
                // Update decorations
                updateDecorations();
                return;
            }
            
            // Show input box for the selected component
            const value = await vscode.window.showInputBox({
                prompt: `Enter ${selectedItem.type} value (0-255)`,
                value: selectedItem.value.toString(),
                validateInput: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 0 || num > 255) {
                        return 'Please enter a number between 0 and 255';
                    }
                    return null;
                }
            });
            
            if (value !== undefined) {
                const numValue = parseInt(value);
                
                // Update the corresponding color component
                if (selectedItem.type === 'red') {
                    newR = numValue;
                    redItem.label = `Red: ${newR}`;
                    redItem.value = newR;
                } else if (selectedItem.type === 'green') {
                    newG = numValue;
                    greenItem.label = `Green: ${newG}`;
                    greenItem.value = newG;
                } else if (selectedItem.type === 'blue') {
                    newB = numValue;
                    blueItem.label = `Blue: ${newB}`;
                    blueItem.value = newB;
                }
                
                // Update the confirm item description with the new color
                const newHexColor = rgbToHex(newR, newG, newB);
                confirmItem.description = `Apply ${newHexColor}`;
                
                // Refresh the items
                quickPick.items = [redItem, greenItem, blueItem, confirmItem];
            }
        });
        
        quickPick.show();
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

}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}