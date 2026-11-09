import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {lessons,exercises,phases,plan,projectGuide} from '../docs/rust-reboot/course.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=path.join(root,'public/rust-reboot/workbook/Cargo.toml');
assert.equal(lessons.length,30);assert.equal(new Set(lessons.map(l=>l.id)).size,30);
assert.equal(exercises.length,12);assert.equal(phases.length,6);assert.equal(plan.length,14);
assert.equal(projectGuide.length,8);
for(const l of lessons){assert.ok(l.sections.length>=3);assert.equal(l.quiz.length,2);for(const q of l.quiz){assert.ok(q[1][q[2]]);assert.ok(q[3]);}}
const html=readFileSync(path.join(root,'public/rust-reboot/index.html'),'utf8');
assert.ok(!/<script[^>]*\bsrc=|<link[^>]*href=["']https?:/.test(html),'HTML should not require remote runtime assets');
assert.ok(html.includes('const COURSE = {'));
for(const lesson of lessons){
 const result=spawnSync('cargo',['run','--quiet','--offline','--manifest-path',manifest,'--example',`ch${lesson.id}`],{cwd:root,encoding:'utf8',timeout:60000,windowsHide:true});
 if(result.status!==0)throw new Error(`ch${lesson.id} failed: ${result.error||result.stderr}`);
 const actual=result.stdout.replace(/\r\n/g,'\n').trim();
 if(lesson.id==='26')assert.ok(actual.startsWith('rust-reboot-workbook 0.1.0\ndebug_assertions=true'));
 else if(lesson.id==='28')assert.ok(actual.startsWith('sum=49995000; elapsed='));
 else assert.equal(actual,lesson.output,`ch${lesson.id} output differs`);
 console.log(`PASS ch${lesson.id}: ${lesson.title}`);
}
console.log('PASS: 30 examples executed; outputs, course structure and offline HTML verified.');
