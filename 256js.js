const { performance } = require('perf_hooks');
const { readFileSync } = require('fs');
const readline = require('readline');

let getInputChar = () => {
  let l = inputBuffer.length;
  let r = inputBuffer.charCodeAt(l);
  inputBuffer = inputBuffer.substr(0, l - 1);
  return r;
};

let inputBuffer = '';

process.stdin.resume();
process.stdin.setEncoding('utf-8');

process.stdin.on('data', (c) => {
  inputBuffer += c;
});

async function interpret(code) {
  code = code.replace(/\n|\r/g, ''); // Allow new lines by just ignoring them

  let vars = {};
  let lastVar = undefined;

  let lex = lexer2(lexer(code));
  //console.log(lex);

  for (let i = 0; i < lex.length; i++) {
    let cur = lex[i];
    //console.log(i, cur);
    [cur, i, lex, vars, lastVar] = await runCommand(cur, i, lex, vars, lastVar);
  }
}

async function runCommand(cur, i, lex, vars, lastVar) {
  //console.log(cur, i);
  switch (cur[0]) {
    case '2':
      vars[lastVar] = getInputChar();
      break;
    case '5':
      vars[cur[1][0]] = cur[1][1];
      lastVar = cur[1][0];
      break;

    case '6':
      if (cur[1] === false) break;
      i = getLoopPos(lex, cur[1]);
      break;
    case '^':
      if (cur[1][0] === true) {
        i = getIfPos(lex, vars, i, cur[1][1]);
        break;
      }

      [cur, i, lex, vars, lastVar] = await runCommand(cur[1], i, lex, vars, lastVar);

      break;

    case false:
      process.stdout.write(vars[cur[1]] ? vars[cur[1]].toString() : cur[1]);
      break;

    case '++':
      vars[cur[1]]++;
      break;
    case '--':
      vars[cur[1]]--;
      break;
  }

  //await new Promise(res => setTimeout(res, 1));

  return [cur, i, lex, vars, lastVar];
}

function getIfPos(lex, variables, indexStart, condition) {
  for (let c of condition) {
    if (variables[c] !== undefined) condition = condition.replace(c, variables[c]);
  }

  //console.log(lex.filter((x, i) => i > indexStart && x[0] === '^' && typeof x[1][0] !== 'number'));

  return lex.indexOf(lex.filter((x, i) => i > indexStart && x[0] === '^' && typeof x[1][0] !== true)[eval(condition) === true ? 0 : 1]) - 1;
}

function getLoopPos(lex, loopNum) {
  //console.log(lex.filter((x) => x[0] === '6' && x[1] === false));
  return lex.indexOf(lex.filter((x) => x[0] === '6' && x[1] === false)[loopNum - 1]);
}

let cmds = ['2', '5', '6', '^', '--', '++']

/*
  Commands:
  2, set last defined variable to user input character: 2
  5, set a variable: 5 | <variable name, 1 Unicode char> | <optional, variable value, can be of any type>
  6, label: 6 - defines a label, 6 | <which label to jump to, a number starting from 1 (1 = first label, 2 = second label, etc)
  ^, if (/ if else): ^<condition>^<code if true>^<code if false> (implemented via if true, jump to next command starting with ^, if false jump to second next command starting with ^

  (Spec doesn't actually say it but code examples use it:)
  <variable>--: decrease <variable> by one
  (and <variable>++: increase <variable> by one)
*/

function lexer2(lex) { // Fix ^ ifs
  for (let i = 0; i < lex.length; i++) {
    let cur = lex[i];
    if (cur[1][0] === false) {
      let conSplit = cur[1][1].split('^');
      let con = conSplit[0];
      let after = conSplit[1];

      cur[1][1] = con;
      cur[1][0] = true;
      lex.splice(i + 1, 0, lexCommand(`^${after}`, i + 1));
      i++;
    }
  }

  return lex;
}

function lexer(code) { // *Seems* simple enough - each command is seperated via semi colons and first character is also the command itself (although variables / 5 is more complex)
  return code.split(';').map((x, i) => {
    return lexCommand(x, i);
  });
}

function lexCommand(x, i) {
  let command = x[0];

  if (!cmds.includes(command)) {
    if (x.length === 3) {
      if (x.substr(1, 2) === '++') {
        return ['++', command];
      }

      if (x.substr(1, 2) === '--') {
        return ['--', command];
      }
    }

    return [false, x];
  }

  let other = command === '5' ? [x[1], x.substr(2)] : x.substr(1);

  if (command === '6') {
    if (x[1] === undefined) {
      other = false; //[false, i];
    } else {
      other = parseInt(other);
    }
  }

  if (command === '^') {
    other = lexCommand(other);

    if (other[0] === false) {
      //other[0] = other[0] === false ? i : other[0];
    }
  }

  return [command, other];
}

async function wrapper(code) {
  let start = performance.now();

  await interpret(code);

  console.log('\n\nInterpreted - took', `${(performance.now() - start).toFixed(2)}ms`);

  rl.close();
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('close', function() {
  process.exit(0);
});

let file = process.argv[2];

if (file === undefined) {
  //console.log('Give a 256 file as input.');
  rl.question('256 code (or pass a file as an argument):\n', async function(code) {
    wrapper(code);
  });
  return;
}

console.log(`${file}\n`);
wrapper(readFileSync(file, 'utf8'));