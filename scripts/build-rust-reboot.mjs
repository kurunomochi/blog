import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {lessons,phases,exercises,plan,projectGuide} from '../docs/rust-reboot/course.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'docs/rust-reboot');
const output=path.join(root,'public/rust-reboot');
const [shell,css,app]=await Promise.all(['shell.html','style.css','app.js'].map(name=>readFile(path.join(source,name),'utf8')));
let codeArchive='';
try { codeArchive=(await readFile(path.join(output,'rust-code.zip'))).toString('base64'); } catch(error) { if(error.code!=='ENOENT')throw error; }
const sourcePaths=['Cargo.toml','src/domain.rs','src/error.rs','src/repository.rs','src/service.rs','src/jobs.rs','src/api.rs','src/bin/taskboard-server.rs','src/bin/taskboard-cli.rs','tests/repository.rs','tests/http.rs'];
const projectFiles=await Promise.all(sourcePaths.map(async name=>({path:name,code:await readFile(path.join(output,'taskboard',name),'utf8')})));
const data=JSON.stringify({lessons,phases,exercises,plan,projectGuide,projectFiles,codeArchive}).replace(/</g,'\\u003c');
const appSource=app.replaceAll('href="rust-reboot.zip" download','href="${packageUrl}" download="rust-code.zip"');
const html=shell.replace('/*__CSS__*/',()=>css).replace('/*__DATA__*/',()=>data).replace('/*__APP__*/',()=>appSource);
if(/\/\*__(?:CSS|DATA|APP)__\*\//.test(html))throw new Error('Unresolved build placeholder');
await mkdir(path.join(output,'workbook/examples'),{recursive:true});
await writeFile(path.join(output,'index.html'),html,'utf8');
for(const lesson of lessons){await writeFile(path.join(output,`workbook/examples/ch${lesson.id}.rs`),`// ${lesson.title}\n// 与 HTML 同源生成；在 workbook 运行 cargo run --example ch${lesson.id}\n${lesson.code}\n`,'utf8');}
const formatted=spawnSync('rustfmt',['--edition','2024',...lessons.map(l=>path.join(output,`workbook/examples/ch${l.id}.rs`))],{encoding:'utf8',windowsHide:true});
if(formatted.status!==0)throw new Error(formatted.stderr||'rustfmt failed');
console.log(`Built self-contained HTML: ${Buffer.byteLength(html)} bytes; ${lessons.length} lessons, ${lessons.reduce((n,l)=>n+l.quiz.length,0)} questions, ${exercises.length} exercises.`);
