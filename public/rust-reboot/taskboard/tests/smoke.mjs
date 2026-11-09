// Actual-process HTTP and restart verification. Build with cargo build --locked first.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=await mkdtemp(path.join(tmpdir(),'rust-taskboard-smoke-'));
const executable=path.join(root,'target/debug',process.platform==='win32'?'taskboard-server.exe':'taskboard-server');
let processHandle;
async function start(){
 processHandle=spawn(executable,[],{cwd:root,env:{...process.env,TASKBOARD_DB:path.join(temporary,'test.sqlite'),TASKBOARD_BIND:'127.0.0.1:0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
 return await new Promise((resolve,reject)=>{
   let output='';const timer=setTimeout(()=>reject(new Error('server readiness timed out')),15000);
   processHandle.once('error',e=>{clearTimeout(timer);reject(e);});
   processHandle.once('exit',code=>{clearTimeout(timer);reject(new Error(`server exited early: ${code}`));});
   processHandle.stdout.on('data',chunk=>{output+=chunk;const found=output.match(/Rust Taskboard: (http:\/\/127\.0\.0\.1:\d+)/);if(found){clearTimeout(timer);resolve(found[1]);}});
   processHandle.stderr.on('data',chunk=>process.stderr.write(chunk));
 });
}
async function stop(){if(!processHandle||processHandle.exitCode!==null)return;const child=processHandle;await new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGINT');});processHandle=null;}
async function call(base,method,url,body){const response=await fetch(base+url,{method,headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return{status:response.status,data:response.status===204?null:await response.json()};}
try{
 let base=await start();assert.equal((await call(base,'GET','/health')).status,200);
 const created=await call(base,'POST','/tasks',{title:'真实端口验证',priority:3,tags:['rust']});assert.equal(created.status,201);const task=created.data;
 const update={expected_version:1,title:task.title,priority:3,tags:task.tags,status:'done',due_at:null};
 assert.equal((await call(base,'PUT',`/tasks/${task.id}`,update)).status,200);
 assert.equal((await call(base,'PUT',`/tasks/${task.id}`,update)).status,409);
 const submitted=await call(base,'POST','/jobs/import',[{title:'batch-one'},{title:'batch-two'}]);assert.equal(submitted.status,202);
 let finished=false;for(let i=0;i<100;i++){const job=await call(base,'GET',`/jobs/${submitted.data.id}`);if(job.data.status==='succeeded'){finished=true;break;}assert.notEqual(job.data.status,'failed');await new Promise(r=>setTimeout(r,20));}assert.ok(finished);
 assert.equal((await call(base,'GET','/stats')).data.total,3);
 await stop();
 const cli=path.join(root,'target/debug',process.platform==='win32'?'taskboard-cli.exe':'taskboard-cli');
 const cliStats=spawnSync(cli,['--db',path.join(temporary,'test.sqlite'),'stats'],{encoding:'utf8',windowsHide:true});assert.equal(cliStats.status,0,cliStats.stderr);assert.equal(JSON.parse(cliStats.stdout).total,3);
 const cliStale=spawnSync(cli,['--db',path.join(temporary,'test.sqlite'),'done',String(task.id),'1'],{encoding:'utf8',windowsHide:true});assert.equal(cliStale.status,1);
 base=await start();const persisted=await call(base,'GET',`/tasks/${task.id}`);assert.equal(persisted.data.status,'done');assert.equal(persisted.data.version,2);assert.equal((await call(base,'GET','/stats')).data.total,3);
 console.log('PASS real server and CLI: health, UTF-8 create, update, stale conflict, background import, shared database, persisted restart.');
}finally{
 await stop();const resolved=path.resolve(temporary);const parent=path.resolve(tmpdir());
 assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('rust-taskboard-smoke-'));
 await rm(resolved,{recursive:true,force:true});
}
