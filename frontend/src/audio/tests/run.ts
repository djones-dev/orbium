import { runSunLayerTests } from './SunLayer.test';

const logDiv = document.createElement('div');
logDiv.style.fontFamily = 'monospace';
logDiv.style.padding = '20px';
logDiv.style.background = '#111';
logDiv.style.color = '#eee';
logDiv.style.whiteSpace = 'pre-wrap';
document.body.appendChild(logDiv);

const originalLog = console.log;
const originalError = console.error;

function appendLine(text: string, color: string) {
    const line = document.createElement('div');
    line.textContent = text;
    line.style.color = color;
    logDiv.appendChild(line);
}

console.log = (...args) => {
    originalLog(...args);
    const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    let color = '#ccc';
    if (text.includes('PASS')) color = '#4f4';
    if (text.includes('FAIL')) color = '#f44';
    if (text.includes('Starting')) color = '#ffeb3b';
    appendLine(text, color);
};

console.error = (...args) => {
    originalError(...args);
    const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    appendLine(text, '#f44');
};

runSunLayerTests();
