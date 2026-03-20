const path = require('path');

// Ensure node is on PATH for child processes
const nodeDir = path.dirname(process.execPath);
process.env.PATH = nodeDir + ';' + (process.env.PATH || '');

// Require next's CLI directly
const nextDev = require(path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'));
