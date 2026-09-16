import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { TANDEM_LINES, TANDEM_SCRIPTS, sceneBeats } from '../src/tandemDialogue.ts';
import { CHAMBERS } from '../src/chambers.ts';

const labels = {
  short: ['Short circuit', 'The supply trips after a connection bypasses the load.'],
  overload: ['Overvoltage', 'A lamp starts receiving too much voltage.'],
  recovered: ['Recovery', 'A short or overload is removed.'],
  dim: ['Insufficient voltage', 'Current flows, but a lamp is below its working voltage.'],
  isolated: ['Independent branch confirmed', 'Opening the switch extinguishes the original lamp while the other stays lit.'],
  'switch-bypassed': ['Switch bypassed', 'The original lamp remains lit after its switch opens.'],
  'both-off': ['Both lamps go dark', 'The switch opens and neither lamp stays lit.'],
  'power-lost': ['Room returns to standby', 'A previously completed circuit stops powering its room.'],
  'power-back': ['Room power returns', 'A previously completed circuit works again.'],
  'solved-hint': ['Help after a repair', 'The player asks for help at a working circuit.'],
  idle: ['Offer of help', 'About 55 seconds without an edit at an unfinished bench.'],
  formula: ['Formula discovered', 'The player inspects a new formula; speech waits until the close-up ends.'],
  arrival: ['Arrival gallery', 'First arrival beyond the circuit wing.'],
  commons: ['Station commons', 'First entry into the main open station.'],
  'Earth gallery': ['Earth gallery', 'First visit to the observation gallery.'],
  'Research concourse': ['Research concourse', 'First visit to the closed future laboratories.'],
  'Docking gallery': ['Docking gallery', 'First visit to the docking gallery.'],
  'station-story-0': ['Gardens', 'Optional station conversation · first in a repeating sequence.'],
  'station-story-1': ['The enrollment agreement', 'Optional station conversation · second in the sequence.'],
  'station-story-2': ['After you pass', 'Optional station conversation · third in the sequence.'],
};
const beats = [
  'Enrollment, not an accident. Your parents sent you to Asterion until you can ace AP Physics. Tandem introduces the residential program, its remarkably effective attendance policy, and the first circuit-controlled door.',
  'Who controls your departure? Passing the final assessment is the release condition. Switches become the first exercise in control; Tandem cannot be persuaded to substitute eagerness for understanding.',
  'Understanding survives a new diagram. Build without a prepared layout. Tandem recalls students who passed and left while it stayed to teach the next cohort.',
  'Prediction before adjustment. Share voltage, protect the lamp, and explain the readings. Tandem contrasts knowing a formula with knowing when to use it on an exam.',
  'A shared supply and a suspicious seat reservation. Equal lamps share voltage. Tandem has quietly marked a seat on the eventual return shuttle for one-wheeled essential equipment.',
  'Independent branches, shared incentives. Tandem admits it wants an off-station visit when you pass. Circuits complete the first chapter and open the main station; they do not complete the AP Physics program.',
];
const makeScene = (scene, title, trigger) => sceneBeats(scene).map((beat, index, beats) => ({
  id:beat.line, scene, sceneTitle:title, sceneTrigger:trigger,
  beat:index+1, total:beats.length, pause:beat.pause,
  title:`Tandem · ${index+1} of ${beats.length}`,
  trigger:index<beats.length-1 ? `${beat.pause/1000}s listening pause, then the next reply.` : 'End of this exchange.',
  text:beat.text, original:beat.text,
}));
const sections = CHAMBERS.map((c, index) => ({
  id:c.id, title:`${c.number} · ${c.name}`, beat:beats[index],
  lines:[
    ...makeScene(`${c.id}-entry`,'Arrival','On entering the room. A paced scene plays while you explore and work; a repair or fault can interrupt it.'),
    ...makeScene(`${c.id}-story`,'E · A proper conversation','First E request at an unfinished puzzle. All replies play automatically. E continues to the next reply; T at the bench goes straight to help. Interrupted conversations resume at their first unfinished beat.'),
    ...makeScene(`${c.id}-working`,'Response to your work','A new part or connection while the puzzle is unfinished. Queues behind the current exchange; a repair or fault cancels obsolete observations.'),
    ...[0,1,2].flatMap(i=>makeScene(`${c.id}-hint-${i}`,`Help ${i+1}`,['A conceptual explanation.','A more specific nudge.','Explicit solution and what to observe.'][i]+' Requested with E after the conversation, T at the bench, or the Tandem button.')),
    ...makeScene(`${c.id}-restored`,'The repair lands','First successful repair. The response continues as you walk through the exit; the next room waits its turn to speak.'),
    ...makeScene(`${c.id}-after`,'E · After the repair','Conversation while the circuit is working. Gives room for reflection, a callback, and the next step. A broken circuit gets relevant help instead.'),
  ],
}));
sections.push({id:'reactions',title:'Circuit reactions & guidance',beat:'Live faults interrupt stale instruction. Critical warnings remain short; recovery and successful experiments get room for a response.',lines:Object.keys(labels).slice(0,12).flatMap(id=>makeScene(id,...labels[id]))});
sections.push({id:'station',title:'The larger station',beat:'The circuit chapter opens into free exploration. Earth is home; passing the final AP Physics exam is the eventual release condition. Further labs and the exam are not implemented yet. Tandem’s longer conversations cover your parents, previous students, and its own wish to visit Earth.',lines:Object.keys(labels).slice(12).flatMap(id=>makeScene(id,...labels[id]))});
const ids=sections.flatMap(s=>s.lines.map(l=>l.id));
if(ids.length!==Object.keys(TANDEM_LINES).length || new Set(ids).size!==ids.length || ids.some(id=>!TANDEM_LINES[id])) throw new Error('Script coverage does not match the game.');
const audio={};
for(const id of ids) audio[id]='data:audio/mpeg;base64,'+(await readFile(new URL(`../public/audio/tandem/${encodeURIComponent(id)}.mp3`,import.meta.url))).toString('base64');
const revision='tandem-script-'+createHash('sha256').update(JSON.stringify(TANDEM_LINES)).digest('hex').slice(0,12);
const data={revision,sections,audio};
const json=JSON.stringify(data).replaceAll('<','\\u003c');
const html=String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tandem — Voice script</title>
<style>
:root{color-scheme:light;--paper:#f7f5ef;--ink:#203b43;--muted:#62716f;--rule:#d9ded6;--accent:#a45a36}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,sans-serif}header,main,footer{max-width:1000px;margin:auto;padding:32px}header{padding-top:56px;padding-bottom:20px}.eyebrow{font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.15em;color:var(--accent)}h1{font:normal clamp(34px,5vw,54px)/1.15 Georgia,serif;margin:10px 0 18px}h2{font:normal 28px/1.3 Georgia,serif;margin:0 0 24px}p{margin:8px 0;color:var(--muted)}.intro{max-width:720px}.toolbar{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px;align-items:center}button{font:inherit;font-size:13px;cursor:pointer;border:1px solid var(--rule);background:transparent;color:var(--ink);border-radius:5px;padding:9px 14px}button:hover{background:#e7ece5}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:2px solid #3d8991;outline-offset:4px}.primary{background:var(--ink);color:white;border-color:var(--ink)}.primary:hover{background:#355760}#status{font-size:12px;color:var(--muted);margin-left:4px}nav{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:26px;padding:18px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}a{color:var(--ink);text-underline-offset:4px;font-size:13px}main{padding-top:12px}.scene-heading{margin:36px 0 12px}.scene-heading h3{font:normal 22px/1.3 Georgia,serif;margin:0 0 8px}.scene-heading p{font-size:13px;max-width:760px;margin-bottom:12px}section{margin:30px 0 64px;scroll-margin-top:25px}.line{display:grid;grid-template-columns:180px 1fr;gap:26px;padding:24px 0;border-top:1px solid var(--rule)}.meta strong{display:block;font-size:13px;font-weight:600}.meta code{display:block;font-size:10px;color:var(--muted);margin:3px 0 10px;overflow-wrap:anywhere}.trigger{font-size:12px;line-height:1.55;margin:0 0 12px}.listen{padding:5px 10px;font-size:11px;background:#ecede5}.editor{width:100%;resize:vertical;min-height:80px;padding:12px 14px;font:17px/1.65 Georgia,serif;color:var(--ink);background:#fffdf7;border:1px solid transparent;border-radius:4px;overflow:hidden}.editor:hover{border-color:var(--rule)}.editor:focus{background:white;border-color:#81a6a2}.changed{border-left:3px solid #b6814d}.line-footer{display:flex;gap:14px;align-items:center;padding:2px 14px;font-size:11px;color:var(--muted)}.restore{padding:0;border:0;text-decoration:underline;font-size:11px;color:var(--muted)}footer{font-size:12px;padding-top:0;padding-bottom:48px}footer p{max-width:720px}@media(max-width:650px){header,main,footer{padding-left:20px;padding-right:20px}.line{grid-template-columns:1fr;gap:10px}.meta{display:grid;grid-template-columns:1fr auto;gap:0 15px}.meta code,.trigger{grid-column:1}.listen{grid-column:2;grid-row:1/4;align-self:start}.trigger{margin-bottom:0}.editor{font-size:16px}.toolbar{align-items:flex-start}#status{width:100%;margin:0}}@media print{header,main,footer{max-width:none;padding:16px}nav,.toolbar,.listen,.restore{display:none}.line{break-inside:avoid}.editor{background:none;border:0;resize:none}.line-footer{display:none}section{margin-bottom:28px}}
</style>
</head>
<body>
<header><div class="eyebrow">Asterion · Writing copy</div><h1>Tandem — Voice script</h1><p class="intro"><strong>The story:</strong> Your parents sent you to Asterion’s residential AP Physics program. Ace the exam and you can go home. Tandem, your humorously condescending AI tutor, considers this excellent parenting. It also has a personal interest in your eventual departure.</p><p class="intro">__SCENE_COUNT__ scenes and responses · __LINE_COUNT__ spoken beats. Each conversation reads in order below; play the full exchange or an individual reply. Click any reply to rewrite it.</p><p class="intro">Use <strong>Save edited HTML</strong> to keep or share your changes. This document does not change the game or regenerate its voice.</p><div class="toolbar"><button id="save-html" class="primary">Save edited HTML</button><button id="save-json">Export script JSON</button><span id="status" role="status">Ready to edit</span></div><nav aria-label="Script sections" id="contents"></nav></header>
<main id="script"></main>
<footer><p>One E request starts a whole conversation, with pauses between replies. E again advances the current exchange; T at a bench requests direct help. Movement and puzzle controls stay available throughout. Actions, faults, repairs and room changes can change what Tandem says next.</p><p>Performance: composed, smug, humorously condescending. Explain an obvious fact as if granting a rare privilege. Let a sincere admission escape before recovering the professional tone. The player stays silent; their actions and requests are the other side of the conversation. Never read the timing notes aloud.</p><p>Source: the current Tandem game script. Exported September 15, 2026. All recordings are embedded; this file works offline.</p></footer>
<script type="application/json" id="script-data">__SCRIPT_DATA__</script>
<script>
const data=JSON.parse(document.getElementById('script-data').textContent);
const lines=data.sections.flatMap(s=>s.lines), byId=new Map(lines.map(l=>[l.id,l]));
const storageKey='asterion.voice-editor.'+data.revision;
const status=document.getElementById('status');
let storageAvailable=true,playing=null,playingButton=null,playingTimer=null;
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved)for(const line of lines)if(typeof saved[line.id]==='string')line.text=saved[line.id];}catch{storageAvailable=false;}
const values=()=>Object.fromEntries(lines.map(l=>[l.id,l.text]));
const grow=el=>{el.style.height='auto';el.style.height=Math.max(80,el.scrollHeight+2)+'px';};
function updateStatus(){const count=lines.filter(l=>l.text!==l.original).length;status.textContent=count+' edited '+(count===1?'line':'lines')+(storageAvailable?' · Draft kept in this browser':' · Save a copy to keep edits');}
function store(){try{localStorage.setItem(storageKey,JSON.stringify(values()));}catch{storageAvailable=false;}updateStatus();}
function stop(){if(playingTimer)clearTimeout(playingTimer);playingTimer=null;if(playing)playing.pause();if(playingButton){playingButton.textContent=playingButton.dataset.idleLabel;playingButton.setAttribute('aria-pressed','false');}playing=null;playingButton=null;}
function playSequence(sequence,button){
 if(playingButton===button){stop();return;}stop();playingButton=button;button.textContent=sequence.length>1?'Stop conversation':'Stop recording';button.setAttribute('aria-pressed','true');
 let index=0;
 function next(){
  const line=sequence[index];playing=new Audio(data.audio[line.id]);
  playing.onended=()=>{index++;if(index<sequence.length)playingTimer=setTimeout(next,line.pause||0);else stop();};
  playing.onerror=()=>{stop();status.textContent='Recording unavailable.';};
  playing.play().catch(()=>{stop();status.textContent='Could not play this recording.';});
 }
 next();
}
function render(){
 for(const section of data.sections){
  const anchor=document.createElement('a');anchor.href='#'+section.id;anchor.textContent=section.title;document.getElementById('contents').append(anchor);
  const region=document.createElement('section');region.id=section.id;const title=document.createElement('h2');title.textContent=section.title;region.append(title);
  if(section.beat){const beat=document.createElement('p');beat.textContent=section.beat;region.append(beat);}
  for(const line of section.lines){
   if(line.beat===1){
    const heading=document.createElement('div');heading.className='scene-heading';heading.dataset.scene=line.scene;
    const title=document.createElement('h3');title.textContent=line.sceneTitle;
    const trigger=document.createElement('p');trigger.textContent=line.sceneTrigger;
    const play=document.createElement('button');play.className='listen';play.textContent='Play conversation';play.dataset.idleLabel='Play conversation';play.setAttribute('aria-label','Play conversation: '+line.scene);play.setAttribute('aria-pressed','false');
    play.onclick=()=>playSequence(section.lines.filter(l=>l.scene===line.scene),play);
    heading.append(title,trigger,play);region.append(heading);
   }
   const row=document.createElement('article');row.className='line';row.dataset.line=line.id;
   const meta=document.createElement('div');meta.className='meta';const label=document.createElement('strong');label.textContent=line.title;const id=document.createElement('code');id.textContent=line.id;const trigger=document.createElement('p');trigger.className='trigger';trigger.textContent=line.trigger;
   const play=document.createElement('button');play.className='listen';play.textContent='Play recording';play.dataset.idleLabel='Play recording';play.setAttribute('aria-label','Play current recording: '+line.id);play.setAttribute('aria-pressed','false');play.onclick=()=>playSequence([line],play);
   meta.append(label,id,trigger,play);
   const writing=document.createElement('div');const editor=document.createElement('textarea');editor.className='editor';editor.value=line.text;editor.setAttribute('aria-label',section.title+' — '+line.title);editor.spellcheck=true;
   const info=document.createElement('div');info.className='line-footer';const count=document.createElement('span');const reset=document.createElement('button');reset.className='restore';reset.textContent='Restore original';reset.setAttribute('aria-label','Restore original: '+line.id);
   function refresh(){editor.classList.toggle('changed',line.text!==line.original);count.textContent=(line.text.trim().match(/\S+/g)||[]).length+' words'+(line.text!==line.original?' · edited':'');reset.hidden=line.text===line.original;grow(editor);}
   editor.oninput=()=>{line.text=editor.value;refresh();store();};reset.onclick=()=>{line.text=line.original;editor.value=line.text;refresh();store();};
   info.append(count,reset);writing.append(editor,info);row.append(meta,writing);region.append(row);requestAnimationFrame(refresh);
  }
  document.getElementById('script').append(region);
 }
 updateStatus();
}
function download(contents,type,name){const url=URL.createObjectURL(new Blob([contents],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.getElementById('save-json').onclick=()=>download(JSON.stringify(values(),null,2),'application/json','Tandem Voice Script - Edits.json');
document.getElementById('save-html').onclick=()=>{
 stop();const snapshot=document.documentElement.cloneNode(true);snapshot.querySelector('#script').textContent='';snapshot.querySelector('#contents').textContent='';snapshot.querySelector('#status').textContent='Ready to edit';
 snapshot.querySelector('#script-data').textContent=JSON.stringify({...data,revision:'tandem-script-'+Date.now()}).replaceAll('<','\\u003c');
 download('<!doctype html>\n'+snapshot.outerHTML,'text/html;charset=utf-8','Tandem Voice Script - Edited.html');status.textContent='Edited HTML downloaded.';
};
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();document.getElementById('save-html').click();}});
window.addEventListener('resize',()=>document.querySelectorAll('.editor').forEach(grow));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
render();
</script>
</body></html>`;
const destination=resolve(process.argv[2]??resolve(homedir(),'Downloads','Tandem Voice Script.html'));
await mkdir(dirname(destination),{recursive:true});
await writeFile(destination,html.replace('__SCENE_COUNT__',String(Object.keys(TANDEM_SCRIPTS).length)).replace('__LINE_COUNT__',String(ids.length)).replace('__SCRIPT_DATA__',json));
console.log(JSON.stringify({path:destination,lines:ids.length,sections:sections.length,recordings:Object.keys(audio).length}));
