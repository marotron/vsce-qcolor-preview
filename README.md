# QColor Preview Extension

A simple VS Code extension that provides real-time preview of QColor values in Python code with interactive color picking.

## Features

- Shows colored squares next to QColor definitions
- Click on color squares to open an interactive color adjustment dialog
- Adjust each RGB component individually with sliders
- Update QColor RGB values instantly
- Automatically updates when you edit your code
- Works with standard QColor format: QColor(r, g, b) and QColor(r, g, b, a)

## Usage

1. Install the extension
2. Open a Python file containing QColor definitions
3. The extension will automatically show color previews next to each QColor instance
4. Click on any color square to open the color adjustment dialog
5. Select a color component (Red, Green, or Blue) to adjust its value
6. Enter a new value (0-255) for the selected component
7. Repeat for other components as needed
8. Click "Confirm Color" to apply your changes
9. Use the command "Toggle QColor Preview" to turn the feature on/off

## Release Notes

### 0.3.0

Added interactive RGB color adjustment dialog

### 0.2.0

Added interactive color picker feature

### 0.1.0

Initial release of QColor Preview