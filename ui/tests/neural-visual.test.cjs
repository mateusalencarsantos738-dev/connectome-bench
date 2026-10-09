const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const window = { requestAnimationFrame() { throw Error('Independent clock forbidden'); }, setTimeout() { throw Error('Independent timer forbidden'); } };
for (const file of ['mock-data.js', 'music-timeline.js', 'components.js', 'neural-visual.js']) runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), { window });
const api = window.NeuralVisual, music = window.MusicTimeline;
const note = (channel='E1', timestampMs=100, eventId=`${channel}-${timestampMs}`) => ({type:'NOTE_EVENT',channel,timestampMs,eventId,durationMs:180});
function dom(markup) {
  const elements = new Map();
  for(const match of markup.matchAll(/\bid="([^"]+)"/g)) {
    assert.ok(!elements.has(match[1]), `duplicate SVG id: ${match[1]}`);
    elements.set(match[1], { attrs: {}, setAttribute(key,value){ this.attrs[key]=String(value); } });
  }
  return { attrs:{}, setAttribute(key,value){this.attrs[key]=String(value);}, querySelector(selector){return elements.get(selector.slice(1)) || null;}, elements };
}
function setup(options={}) {
  const sequence=music.fromChannels(window.MockData);
  const root=dom(window.SimulationViews.connectomeView(window.MockData));
  const graph=dom(window.SimulationViews.activityGraph(window.MockData,sequence));
  const controller=api.create(root,graph,{durationMs:4000,...options});
  const level=id=>Number(root.elements.get(id).attrs['data-intensity']);
  const update=(positionMs,status='running')=>controller.update({positionMs,status});
  const snapshot=()=>JSON.stringify({root:root.attrs,nodes:[...root.elements],graph:[...graph.elements]});
  return {controller,root,graph,level,update,snapshot};
}
test('all configured targets exist in actual SVG; one event activates its nodes and edges only',()=>{
  const h=setup();h.controller.receive(note());h.update(140);
  for(const id of [...api.channelMap.E1.nodes,...api.channelMap.E1.edges])assert.equal(h.level(id),1);
  for(const id of api.channelMap.E2.nodes)assert.equal(h.level(id),0);
  assert.ok(h.graph.elements.get('neural-trace-E1').attrs.d.includes(',7.00'));
});
test('each channel drives distinct existing groups',()=>{
  const h=setup();
  for(const channel of Object.keys(api.channelMap)) {
    h.controller.reset();h.controller.receive(note(channel));h.update(140);
    for(const other of Object.keys(api.channelMap)) assert.equal(h.level(api.channelMap[other].nodes[0]),other===channel?1:0);
  }
});
test('unknown type, unmapped channel and missing fields fail explicitly without partial mutation',()=>{
  const h=setup(),before=h.snapshot();
  for(const event of [null,{}, {...note(),type:'OTHER'}, {...note(),channel:'E9'}, {...note(),eventId:''}, {...note(),timestampMs:-1}, {...note(),durationMs:NaN}]) assert.throws(()=>h.controller.receive(event));
  assert.equal(h.snapshot(),before);
});
test('missing element and graph or invalid mapping fail initialization explicitly',()=>{
  const h=setup();h.root.elements.delete('visual-E1-node-0');
  assert.throws(()=>api.create(h.root,h.graph,{durationMs:4000}),/Elemento visual ausente/);
  assert.throws(()=>api.create(null,null,{durationMs:4000}),/incompleta/);
  assert.throws(()=>setup({map:{E1:{nodes:[],edges:[]}}}),/Mapeamento/);
});
test('smooth attack and deterministic decay return to resting opacity',()=>{
  const h=setup();h.controller.receive(note());h.update(120);assert.equal(h.level('visual-E1-node-0'),.5);
  h.update(140);assert.equal(h.level('visual-E1-node-0'),1);
  h.update(420);assert.equal(h.level('visual-E1-node-0'),.25);
  h.update(700);assert.equal(h.level('visual-E1-node-0'),0);
  assert.equal(h.root.elements.get('visual-E1-node-0').attrs.opacity,'0.1600');
});
test('consecutive, simultaneous and shared-target events add with saturation',()=>{
  const shared='visual-E1-node-0';
  const h=setup({map:{...api.channelMap,E2:{nodes:[shared],edges:api.channelMap.E2.edges}}});
  h.controller.receive(note('E1',100));h.controller.receive(note('E2',100));h.update(420);assert.equal(h.level(shared),.5);
  h.controller.receive(note('E1',420));h.update(460);assert.equal(h.level(shared),1);
  h.update(1020);assert.equal(h.level(shared),0);
});
test('pause and resume use supplied time; reset restores graph and exact initial state',()=>{
  const h=setup(),before=h.snapshot();h.controller.receive(note());h.update(250,'paused');const frozen=h.snapshot();
  h.update(250,'paused');assert.equal(h.snapshot(),frozen);
  h.update(400,'running');assert.notEqual(h.snapshot(),frozen);
  h.controller.reset();assert.equal(h.snapshot(),before);
});
test('late batches have bounded graph size and duplicates do not change response',()=>{
  const h=setup();
  for(let i=0;i<1000;i++)h.controller.receive(note('E1',100,`n${i}`));
  h.update(450);const before=h.snapshot();
  assert.equal(h.controller.receive(note('E1',100,'n0')),false);h.update(450);assert.equal(h.snapshot(),before);
  assert.equal((h.graph.elements.get('neural-trace-E1').attrs.d.match(/[ML]/g)||[]).length,401);
  h.update(4000);assert.equal(h.level('visual-E1-node-0'),0);
});
test('terminal frame freezes unfinished response without timers; destroy releases targets',()=>{
  const h=setup();h.controller.receive(note('E5',3800));h.update(4000,'ended');assert.ok(h.level('visual-E5-node-0')>0);
  const frozen=h.snapshot();h.update(4000,'ended');assert.equal(h.snapshot(),frozen);
  h.controller.destroy();const destroyed=h.snapshot();assert.equal(h.controller.receive(note()),false);h.update(4000);assert.equal(h.snapshot(),destroyed);
});
test('same received sequence reproduces identical visuals and graph after reset',()=>{
  const h=setup();const events=music.fromChannels(window.MockData).events;
  const run=()=>{for(const event of events)h.controller.receive(event);h.update(3450);return h.snapshot();};
  const first=run();h.controller.reset();assert.equal(run(),first);
});
test('reduced motion retains event information with fixed modest emphasis, no fading',()=>{
  const h=setup({reducedMotion:true});h.controller.receive(note());h.update(140);
  const opacity=h.root.elements.get('visual-E1-node-0').attrs.opacity;
  h.update(420);assert.equal(h.root.elements.get('visual-E1-node-0').attrs.opacity,opacity);
  assert.equal(h.level('visual-E1-node-0'),.25);
  h.controller.setReducedMotion(false);assert.notEqual(h.root.elements.get('visual-E1-node-0').attrs.opacity,opacity);
  h.update(700);assert.equal(h.level('visual-E1-node-0'),0);
});
test('unchanged timeline drives notes, pause, resume, reset, completion and error safely',()=>{
  const h=setup();let now=0,id=0;const frames=new Map();
  const player=music.create(music.fromChannels(window.MockData),{now:()=>now,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id)});
  player.on('NOTE_EVENT',h.controller.receive);player.on('TIME_UPDATE',h.controller.update);player.on('STATE',h.controller.update);player.on('RESET',h.controller.reset);
  const advance=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
  player.start();advance(160);assert.equal(h.level('visual-E4-node-0'),1);assert.equal(frames.size,1);
  player.pause();const frozen=h.snapshot();advance(1000);assert.equal(h.snapshot(),frozen);assert.equal(frames.size,0);
  player.resume();advance(150);assert.ok(h.level('visual-E4-node-0')<1);
  player.reset();assert.equal(h.level('visual-E4-node-0'),0);
  player.start();advance(4000);assert.equal(player.snapshot().processed,20);assert.equal(player.snapshot().status,'ended');assert.equal(frames.size,0);
  assert.equal(h.root.attrs['data-neural-time'],'4000');
  player.destroy();
});
test('empty timeline generates no activity',()=>{
  const h=setup({durationMs:0});const player=music.create({events:[],durationMs:0},{now:()=>0,requestFrame:()=>{throw Error('Unexpected frame');}});
  player.on('NOTE_EVENT',h.controller.receive);player.start();h.controller.update(player.snapshot());assert.equal(h.level('visual-E1-node-0'),0);assert.equal(h.graph.elements.get('neural-trace-window').attrs.width,'0');
});
test('neural input error is surfaced through existing timeline ERROR and stops the loop',()=>{
  const h=setup({map:{E1:api.channelMap.E1}});let callback,reported;
  const player=music.create({events:[note('E2',0)],durationMs:4000},{now:()=>0,requestFrame:fn=>{callback=fn;},cancelFrame:()=>{}});
  player.on('NOTE_EVENT',h.controller.receive);player.on('ERROR',info=>reported=info.error);player.start();
  assert.match(reported,/não mapeado/);assert.equal(player.snapshot().status,'error');assert.equal(callback,undefined);
});

test('sustain ring outlives the unchanged transient pulse and ends without affecting its curve',()=>{
  const h=setup(),event={...note(),sustainMs:1500};h.controller.receive(event);
  h.update(140);assert.equal(h.level('visual-E1-node-0'),1);assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'.8');
  h.update(900);assert.equal(h.level('visual-E1-node-0'),0);assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'.8');
  const curve=h.graph.elements.get('neural-trace-E1').attrs.d;
  h.controller.release({type:'NOTE_END',eventId:event.eventId,channel:'E1',timestampMs:1600});h.update(1600);
  assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'0');assert.equal(h.graph.elements.get('neural-trace-E1').attrs.d,curve);
});
test('sustain release preserves other holds, pause freezes and reset or delayed time clears rings',()=>{
  const h=setup(),a={...note(),sustainMs:1000},b={...note('E1',200,'b'),sustainMs:2000};
  h.controller.receive(a);h.controller.receive(b);h.update(500,'paused');const frozen=h.snapshot();h.update(500,'paused');assert.equal(h.snapshot(),frozen);
  h.controller.release({type:'NOTE_END',eventId:a.eventId,channel:'E1',timestampMs:1100});h.update(1100);
  assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'.8');
  h.controller.release({type:'NOTE_END',eventId:b.eventId,channel:'E4',timestampMs:2200});h.update(1200);assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'.8');
  h.update(3500);assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'0');
  h.controller.reset();h.controller.receive(a);h.update(500);h.controller.reset();assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'0');
});
test('short sustain release does not truncate onset pulse; end frame clears rings only',()=>{
  const h=setup(),event={...note(),sustainMs:100};h.controller.receive(event);h.update(140);
  h.controller.release({type:'NOTE_END',eventId:event.eventId,channel:'E1',timestampMs:200});h.update(200);
  assert.ok(h.level('visual-E1-node-0')>0);assert.equal(h.root.elements.get('sustain-E1').attrs.opacity,'0');
  h.controller.receive({...note('E5',3800),sustainMs:200});h.update(4000,'ended');assert.ok(h.level('visual-E5-node-0')>0);assert.equal(h.root.elements.get('sustain-E5').attrs.opacity,'0');
});
test('track tail length and fill derive from duration and central time, independently by note',()=>{
  const sequence=music.normalize([{...note('E1',100,'a'),sustainMs:1000},{...note('E1',600,'b'),sustainMs:2000},note('E2',100)],4000);
  const markup=window.SimulationViews.musicTrack(window.MockData,sequence),root=dom(markup);
  const update=window.SimulationViews.trackProgress(root,sequence);
  assert.match(markup,/class="sustain-tail"[^>]*width="142"/);assert.match(markup,/class="sustain-tail"[^>]*width="284"/);
  update({positionMs:600,status:'paused'});assert.equal(root.elements.get('track-fill-0').attrs.width,'71');
  assert.equal(root.elements.get('track-note-0').attrs['data-note-state'],'active');
  assert.equal(root.elements.get('track-fill-2').attrs.width,'0');
  update({positionMs:1100,status:'running'});assert.equal(root.elements.get('track-note-0').attrs['data-note-state'],'ended');assert.equal(root.elements.get('track-note-2').attrs['data-note-state'],'active');
  update({positionMs:0,status:'ready'});assert.equal(root.elements.get('track-fill-0').attrs.width,'0');assert.equal(root.elements.get('track-note-2').attrs['data-note-state'],'pending');
});
test('demo start/end stream reconciles track and rings after a delayed frame and repeated reset',()=>{
  const h=setup();const original=music.fromChannels(window.MockData),sequence=music.normalize([...original.events,...window.SustainDemo],4000);
  const root=dom(window.SimulationViews.musicTrack(window.MockData,sequence)),updateTrack=window.SimulationViews.trackProgress(root,sequence);
  let now=0,id=0;const frames=new Map(),ends=[];
  const player=music.create(sequence,{now:()=>now,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id)});
  player.on('NOTE_EVENT',h.controller.receive);player.on('NOTE_END',e=>{h.controller.release(e);ends.push(e.eventId);});
  player.on('RESET',h.controller.reset);player.on('TIME_UPDATE',info=>{h.controller.update(info);updateTrack(info);});player.on('STATE',h.controller.update);
  const advance=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
  player.start();advance(500);player.pause();const paused=h.snapshot();advance(10000);assert.equal(h.snapshot(),paused);
  player.resume();advance(10000);assert.deepEqual(ends,['demo-hold-1','demo-hold-2','demo-hold-3']);assert.equal(player.snapshot().processed,23);
  for(const channel of Object.keys(api.channelMap))assert.equal(h.root.elements.get(`sustain-${channel}`).attrs.opacity,'0');
  for(const [i,event] of sequence.events.entries())if(event.sustainMs>0)assert.equal(root.elements.get(`track-note-${i}`).attrs['data-note-state'],'ended');
  player.reset();assert.equal(frames.size,0);player.start();advance(4000);assert.equal(ends.length,6);assert.equal(frames.size,0);
});
