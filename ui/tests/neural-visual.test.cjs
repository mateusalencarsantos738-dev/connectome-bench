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
