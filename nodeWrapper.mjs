import { interpret } from './256js.mjs';

import { readFileSync } from 'fs';
import * as readline from "readline";
//const { readFileSync } = require('fs');
//const readline = require('readline');

let getInputChar = async () => {
  inputBuffer = '';

  while (inputBuffer.length < 1) { await new Promise(res => setTimeout(res, 1)); }

  return inputBuffer[inputBuffer.length - 1];
};

let inputBuffer = '';

process.stdin.resume();
process.stdin.setEncoding('utf-8');

process.stdin.on('data', (c) => {
  inputBuffer += c;
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('close', function() {
  process.exit(0);
});

async function wrapper(code) {
  await interpret(code, {getInput: getInputChar, sendOutput: (s) => process.stdout.write(s)});

  rl.close();
}

let file = process.argv[2];

if (file === undefined) {
  rl.question('256 code (or pass a file as an argument):\n', async function(code) {
    wrapper(code);
  });

  process.exit();
}

console.log(`${file}\n`);
wrapper(readFileSync(file, 'utf8'));