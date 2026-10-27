import test from'node:test';import{fileURLToPath}from'node:url';

import fs from'node:fs';import path from'node:path';import os from'node:os';import assert from'node:assert/strict';import{spawnSync,execFileSync}from'node:child_process';
const app=fileURLToPath(new URL('../',import.meta.url));
test('CLI refuses nonregular and oversized files before read and accepts exact source boundary',()=>{
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'spotcomp-file-receiving-')),cli=app+'/scripts/operational-reading.mjs',record=app+'/examples/lakota-source-record.jsonl',source=app+'/examples/lakota-source.json';
const run=(r,s)=>spawnSync(process.execPath,[cli,r,s,'request'],{encoding:'utf8',timeout:10000,maxBuffer:1048576});
try{
const valid=run(record,source);assert.equal(valid.status,0,valid.stderr);assert.equal(JSON.parse(valid.stdout).body.rows.length,9);
const rejected=(r,s)=>{const out=run(r,s);assert.equal(out.status,1,out.error?.message??out.stderr);assert.equal(out.stdout,'');assert.match(out.stderr,/regular|size|large|bound|maximum|exceed/i);};
rejected(app,source);rejected(record,app);
const fifo=tmp+'/input.fifo';execFileSync('mkfifo',[fifo]);rejected(fifo,source);rejected(record,fifo);
const tooLargeSource=tmp+'/large-source.json';fs.writeFileSync(tooLargeSource,'{}'+' '.repeat(65535));rejected(record,tooLargeSource);
const tooLargeRecord=tmp+'/large-record.json';fs.writeFileSync(tooLargeRecord,Buffer.alloc(32769,32));rejected(tooLargeRecord,source);
const boundary=tmp+'/boundary-source.json',bytes=fs.readFileSync(source);fs.writeFileSync(boundary,Buffer.concat([bytes,Buffer.alloc(65536-bytes.length,32)]));const admitted=run(record,boundary);assert.equal(admitted.status,0,admitted.stderr);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

});
