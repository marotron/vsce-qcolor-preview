# QColor Preview Extension

A simple VS Code extension that provides real-time preview of QColor values in Python code.

## Features

- Shows colored squares next to QColor definitions
- Automatically updates when you edit your code
- Works with standard QColor format: QColor(r, g, b) and QColor(r, g, b, a)

## Usage

1. Install the extension
2. Open a Python file containing QColor definitions
3. The extension will automatically show color previews next to each QColor instance
4. Use the command "Toggle QColor Preview" to turn the feature on/off

## Extension Settings

None at the moment.

## Known Issues

- Only works with QColor format QColor(r, g, b) or QColor(r, g, b, a)
- Doesn't support QColor.fromRgb() or other factory methods

## Release Notes

### 0.1.0

Initial release of QColor Preview