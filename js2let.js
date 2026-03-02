#!/usr/bin/env node

// js2let - Convert JavaScript to bookmarklet format
// Based on the hoplet project utility

const fs = require('fs');

// Check if a file path is provided
if (process.argv.length < 3) {
  console.error('Please provide a path to the JavaScript file');
  console.error('Usage: node js2let.js <path-to-js-file>');
  process.exit(1);
}

// Read the file
const filePath = process.argv[2];
let code = '';

try {
  code = fs.readFileSync(filePath, 'utf8');
} catch (err) {
  console.error('Error reading file:', err.message);
  process.exit(1);
}

// Safe minimal minification
const minified = code
  // Remove blank lines
  .replace(/^\s*[\r\n]/gm, '')
  // Convert multiple spaces to single space
  .replace(/[ \t]+/g, ' ')
  // Trim lines
  .split('\n').map(line => line.trim()).join(' ');

// Convert to bookmarklet format
const bookmarklet = `javascript:${encodeURIComponent(minified)}`;

// Output the result
console.log('Copy the bookmarklet URL below:\n');
console.log(bookmarklet);
console.log('\n');

// Also save to file
const outputFile = filePath.replace(/\.js$/, '.bookmarklet.txt');
try {
  fs.writeFileSync(outputFile, bookmarklet);
  console.log(`Bookmarklet also saved to: ${outputFile}`);
} catch (err) {
  console.log('Could not save to file:', err.message);
}

console.log('\nTo use:');
console.log('1. Copy the bookmarklet URL above');
console.log('2. Create a new bookmark in your browser');
console.log('3. Paste the URL as the bookmark location');
console.log('4. Name it "WASM Chat Exporter" or similar');
console.log('5. Click the bookmark on any chat page to use');

