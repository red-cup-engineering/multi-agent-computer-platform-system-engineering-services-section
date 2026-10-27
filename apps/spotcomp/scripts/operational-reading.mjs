#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { projectOperationalReading } from '../src/operational-reading.mjs';

async function main() {
const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) {
  process.stderr.write('Usage: operational-reading.mjs <recordFile> <sourceFile> [mode]\n');
  process.exitCode = 1;
  return;
}

const [recordFile, sourceFile, mode = 'json'] = args;
const validModes = ['json', 'nquads', 'request', 'form', 'quote'];
if (!validModes.includes(mode)) {
  process.stderr.write(`Invalid mode: ${mode}\n`);
  process.exitCode = 1;
  return;
}

try {
  const recordBytes = new Uint8Array(readFileSync(recordFile));
  const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
  const packet = projectOperationalReading({ recordBytes, source });

  function replacer(key,value){const original=this[key];return original instanceof Uint8Array?{encoding:'base64',data:Buffer.from(original).toString('base64')}:value}

  if (mode === 'json') {
    process.stdout.write(JSON.stringify(packet, replacer, 2) + '\n');
  } else if (mode === 'nquads') {
    process.stdout.write(packet.nquads);
  } else if (mode === 'request') {
    process.stdout.write(JSON.stringify(packet.sparql, null, 2) + '\n');
  } else if (mode === 'form') {
    process.stdout.write(JSON.stringify(packet.svgForm, null, 2) + '\n');
  } else if (mode === 'quote') {
    const { sparql } = packet;
    const response = await fetch(sparql.url, {
      method: sparql.method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sparql.body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    if (response.status !== 402) throw new Error(`Expected 402, got ${response.status}: ${text}`);
    const requiredHeader = response.headers.get('payment-required');
    const responseHeader = response.headers.get('payment-response');
    if (!requiredHeader || responseHeader !== null) throw new Error('Missing payment-required header or unexpected payment-response header');
    const quote = JSON.parse(Buffer.from(requiredHeader, 'base64').toString('utf8'));
    process.stdout.write(JSON.stringify({ kind: 'spotcomp.sparql-quote', status: 402, request: sparql, quote, paymentSubmitted: false }, null, 2) + '\n');
  }
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
}
await main();
