const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const window = {};
for (const file of ['mock-data.js', 'music-timeline.js']) runInNewContext(readFileSync(join(__dirname, '..', file), 'utf8'), { window });
const api = window.MusicTimeline;
const note = (time, id = String(time)) => ({ type: 'NOTE_EVENT', channel: 'E1', timestampMs: time, durationMs: 50, eventId: id });
function setup(events = [note(100), note(200), note(300)], durationMs = 400) {
  let now = 0, id = 0; const frames = new Map(), received = [];
  const player = api.create({ events, durationMs }, { now: () => now, requestFrame: fn => { frames.set(++id, fn); return id; }, cancelFrame: id => frames.delete(id) });
  player.on('NOTE_EVENT', event => received.push({ ...event, at: now }));
  const advance = ms => { now += ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); };
  return { player, frames, received, advance };
}
test('existing fixture retains all twenty timestamps, sorted with stable ties', () => {
  const sequence = api.fromChannels(window.MockData);
  assert.equal(sequence.events.length, 20);
  for (const channel of window.MockData.channels) assert.deepEqual(Array.from(sequence.events.filter(e => e.channel === channel.id), e => e.timestampMs), Array.from(channel.times, t => t * 1000));
  assert.equal(sequence.events[0].channel, 'E4');
  assert.deepEqual(Array.from(api.normalize([note(200), note(100,'a'), note(100,'b')], 300).events, e => e.eventId), ['a','b','200']);
});
test('boundary rejects absent events, invalid time, required fields and duplicate ids', () => {
  assert.throws(() => api.normalize(undefined, 400));
  for (const patch of [{timestampMs:-1},{timestampMs:NaN},{timestampMs:Infinity},{channel:'E6'},{channel:undefined},{eventId:''},{durationMs:0},{durationMs:500},{type:undefined}]) assert.throws(() => api.normalize([{...note(100),...patch}],400));
  assert.throws(() => api.normalize([note(100),note(100)],400));
  assert.throws(() => api.fromChannels({channels:[{id:'E1'}],duration:4}));
});
test('empty sequence never schedules work', () => { const h=setup([],0); h.player.start(); assert.equal(h.player.snapshot().status,'empty'); assert.equal(h.frames.size,0); });
test('first following frame delivers once with less than 16 ms lateness on 16 ms frames', () => {
  const h=setup(); h.player.start(); for(let i=0;i<26;i++)h.advance(16);
  assert.equal(h.received.length,3); for(const e of h.received)assert.ok(e.at-e.timestampMs>=0 && e.at-e.timestampMs<16);
  assert.equal(h.player.snapshot().status,'ended'); assert.equal(h.frames.size,0);
});
test('large rendering delay drains every due event once and finishes', () => { const h=setup(); h.player.start(); h.advance(5000); assert.equal(h.received.length,3); assert.equal(h.player.snapshot().positionMs,400); h.advance(100); assert.equal(h.received.length,3); assert.equal(h.frames.size,0); });
test('repeated pause/resume retains position and prevents duplicate events and loops', () => {
  const h=setup(); h.player.start(); h.player.start(); assert.equal(h.frames.size,1); h.advance(125);
  for(let i=0;i<5;i++){h.player.pause();h.player.pause();h.advance(1000);assert.equal(h.player.snapshot().positionMs,125);h.player.resume();h.player.resume();assert.equal(h.frames.size,1);}
  h.advance(275); assert.equal(h.received.length,3); assert.equal(h.player.snapshot().status,'ended');
});
test('reset during playback clears position; subsequent runs start clean', () => {
  const h=setup();h.player.start();h.advance(210);h.player.reset();assert.equal(h.frames.size,0);assert.equal(h.player.snapshot().processed,0);
  h.player.start();h.advance(400);h.player.start();h.advance(400);assert.equal(h.received.length,8);assert.equal(h.frames.size,0);
});
test('consumer failures stop execution and are reported; reset recovers', () => {
  const h=setup();let error;h.player.on('ERROR', info=>error=info.error);const off=h.player.on('NOTE_EVENT',()=>{throw Error('failed consumer');});
  h.player.start();h.advance(120);assert.equal(error,'failed consumer');assert.equal(h.player.snapshot().status,'error');assert.equal(h.frames.size,0);off();h.player.start();h.advance(400);assert.equal(h.player.snapshot().status,'ended');
});
test('reset within a listener stops delivery from the previous run; destroy cancels work', () => {
  const h=setup();h.player.on('NOTE_EVENT',()=>h.player.reset());h.player.start();h.advance(400);assert.equal(h.received.length,1);assert.equal(h.player.snapshot().status,'ready');h.player.start();h.player.destroy();h.advance(1000);assert.equal(h.frames.size,0);
});
test('zero-time events fire on start; tied notes each fire once', () => {
  const h=setup([note(0,'a'),note(0,'b'),note(100,'c')],200);h.player.start();assert.equal(h.received.length,2);h.advance(200);assert.equal(h.received.length,3);assert.equal(h.player.snapshot().status,'ended');
});
