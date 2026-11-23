// Mantiene el comando de inicio del proyecto anterior.
import { spawn } from 'node:child_process';
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const child = spawn(python, ['hallazgos/servidor.py'], {cwd: new URL('.', import.meta.url), stdio:'inherit', env:{...process.env, PORT:process.argv[2] || process.env.PORT || '5180'}});
child.on('error', err => { console.error(err.message); process.exitCode=1; });
child.on('exit', code => { process.exitCode=code ?? 1; });
