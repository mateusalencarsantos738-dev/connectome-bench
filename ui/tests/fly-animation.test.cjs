// Run with: node --test ui/tests/fly-animation.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const source = readFileSync(join(__dirname, '../fly-animation.js'), 'utf8');

function setup(reduced = false) {
  let now = 0, sequence = 0;
  const frames = new Map(), timers = new Map(), elements = new Map();
  const listeners = new Map(), mediaListeners = new Map();
  const element = () => ({ attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } });
  const svg = { ...element(), querySelector(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); } };
  const media = { matches: reduced, addEventListener: (key, fn) => mediaListeners.set(key, fn), removeEventListener: key => mediaListeners.delete(key) };
  const document = { hidden: false, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const window = {
    matchMedia: () => media,
    requestAnimationFrame: fn => { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  runInNewContext(source, { window, document, performance: { now: () => now } });
  const controller = window.FlyAnimation.create(svg);
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 16);
      const current = [...frames.values()]; frames.clear();
      current.forEach(fn => fn(now));
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
  }
  return { controller, frames, timers, svg, elements, listeners, mediaListeners, document, advance };
}

test('six states are selectable and transient reactions return to playing', () => {
  const h = setup();
  for (const state of ['IDLE', 'PREPARANDO', 'TOCANDO', 'ACERTO', 'ERRO', 'COMBO']) {
    assert.equal(h.controller.setState(state), true);
    assert.equal(h.controller.snapshot().state, state);
    h.advance(2200);
    assert.equal(h.controller.snapshot().state, state === 'IDLE' ? 'IDLE' : 'TOCANDO');
    assert.equal(h.frames.size, 1);
  }
  assert.equal(h.controller.setState('INVALID'), false);
  assert.equal(h.controller.snapshot().state, 'TOCANDO');
});

test('pause freezes geometry and preserves a reaction until playback resumes', () => {
  const h = setup();
  h.controller.setState('ACERTO'); h.advance(240);
  h.controller.setPaused(true);
  const geometry = JSON.stringify([...h.elements]);
  h.advance(3000);
  assert.equal(JSON.stringify([...h.elements]), geometry);
  assert.equal(h.controller.snapshot().state, 'ACERTO');
  assert.equal(h.frames.size, 0);
  h.controller.setPaused(false); h.advance(450);
  assert.equal(h.controller.snapshot().state, 'TOCANDO');
});

test('rapid interruption cannot leave a stale transition or multiple loops', () => {
  const h = setup();
  for (let i = 0; i < 20; i++) h.controller.setState(i % 2 ? 'ERRO' : 'COMBO');
  h.controller.setState('IDLE'); h.advance(3000);
  assert.equal(h.controller.snapshot().state, 'IDLE');
  assert.equal(h.frames.size, 1);
  assert.equal(h.timers.size, 0);
});

test('offscreen and hidden-page suspension stop animation work', () => {
  const h = setup();
  h.controller.setState('PREPARANDO'); h.advance(200);
  h.controller.setVisible(false); h.advance(3000);
  assert.equal(h.frames.size, 0);
  assert.equal(h.controller.snapshot().state, 'PREPARANDO');
  h.controller.setVisible(true);
  h.document.hidden = true; h.listeners.get('visibilitychange')();
  assert.equal(h.frames.size, 0);
  h.document.hidden = false; h.listeners.get('visibilitychange')(); h.advance(900);
  assert.equal(h.controller.snapshot().state, 'TOCANDO');
});

test('reduced motion uses fixed poses without a frame loop and pause preserves timers', () => {
  const h = setup(true);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  h.controller.setState('ERRO'); h.advance(300); h.controller.setPaused(true);
  h.advance(2000);
  assert.equal(h.controller.snapshot().state, 'ERRO');
  assert.equal(h.timers.size, 0);
  h.controller.setPaused(false); h.advance(400);
  assert.equal(h.controller.snapshot().state, 'ERRO');
  h.advance(300);
  assert.equal(h.controller.snapshot().state, 'TOCANDO');
  assert.equal(h.timers.size, 0); assert.equal(h.frames.size, 0);
  h.mediaListeners.get('change')({ matches: false });
  assert.equal(h.frames.size, 1);
  h.mediaListeners.get('change')({ matches: true });
  assert.equal(h.frames.size, 0);
});

test('idle is alive, playing moves hands, and error interrupts string feedback', () => {
  const h = setup();
  const before = h.elements.get('#head').attrs.transform;
  h.advance(300);
  assert.notEqual(h.elements.get('#head').attrs.transform, before);
  h.controller.setState('TOCANDO'); h.advance(250);
  const hand = h.elements.get('#strumming-arm').attrs.d;
  h.advance(140);
  assert.notEqual(h.elements.get('#strumming-arm').attrs.d, hand);
  assert.ok(Number(h.elements.get('#string-feedback').attrs.opacity) > 0);
  h.controller.setState('ERRO'); h.advance(220);
  assert.equal(Number(h.elements.get('#string-feedback').attrs.opacity), 0);
  assert.equal(h.elements.get('#guitar-shell').attrs.stroke, '#e48c8b');
});

test('destroy removes work and listeners and rejects later state changes', () => {
  for (const reduced of [false, true]) {
    const h = setup(reduced);
    h.controller.setState('COMBO'); h.controller.destroy();
    assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
    assert.equal(h.listeners.size, 0); assert.equal(h.mediaListeners.size, 0);
    assert.equal(h.controller.setState('TOCANDO'), false);
  }
});

test('hands stay on the instrument and support feet stay planted across all poses', () => {
  const h = setup();
  const numbers = value => value.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const endpoint = id => numbers(h.elements.get(id).attrs.d).slice(-2);
  function turn([x, y], degrees, [cx, cy]) {
    const radians = degrees / 180 * Math.PI;
    return [cx + Math.cos(radians) * (x - cx) - Math.sin(radians) * (y - cy), cy + Math.sin(radians) * (x - cx) + Math.cos(radians) * (y - cy)];
  }
  for (const state of ['IDLE', 'PREPARANDO', 'TOCANDO', 'ACERTO', 'ERRO', 'COMBO']) {
    h.controller.setState(state);
    for (let sample = 0; sample < 20; sample++) {
      h.advance(24);
      const [guitarAngle, gx, gy] = numbers(h.elements.get('#guitar-motion').attrs.transform);
      for (const id of ['#strumming-arm', '#fretting-arm']) {
        const local = turn(turn(endpoint(id), -guitarAngle, [gx, gy]), 28, [389, 273]);
        assert.ok(local[1] > 278 && local[1] < 290, `${state}: hand must cross the string band`);
        assert.ok(id === '#strumming-arm' ? Math.abs(local[0] - 340) < .01 : local[0] > 445 && local[0] < 482);
      }
      const [, y, lean, cx, cy] = numbers(h.elements.get('#fly-pose').attrs.transform);
      const fixed = turn(endpoint('#support-near-back'), lean, [cx, cy]);
      assert.ok(Math.abs(fixed[0] - 245) < .01);
      assert.ok(Math.abs(fixed[1] + y - 356) < .01);
    }
  }
});

test('musical events own the clock, freeze on pause, return to idle and reset cleanly', () => {
  const h = setup(); h.controller.resetTimeline();
  assert.equal(h.frames.size, 0);
  h.controller.noteEvent({channel:'E3',timestampMs:100,durationMs:180});
  h.controller.renderTimeline({positionMs:145,status:'running'});
  assert.equal(h.controller.snapshot().state,'TOCANDO');
  const hand = h.elements.get('#strumming-arm').attrs.d;
  h.controller.renderTimeline({positionMs:145,status:'paused'}); h.advance(5000);
  assert.equal(h.elements.get('#strumming-arm').attrs.d,hand);
  h.controller.renderTimeline({positionMs:190,status:'running'});
  assert.notEqual(h.elements.get('#strumming-arm').attrs.d,hand);
  h.controller.renderTimeline({positionMs:280,status:'running'});
  assert.equal(h.controller.snapshot().state,'IDLE');
  h.controller.resetTimeline(); assert.equal(h.controller.snapshot().state,'IDLE');
  assert.equal(h.frames.size,0); assert.equal(h.timers.size,0);
  h.controller.setState('TOCANDO');assert.equal(h.frames.size,1);
});
test('every musical channel drives a distinct fret pose; reduced motion has no timers', () => {
  for(const reduced of [false,true]) {
    const h=setup(reduced), hands=new Set();
    for(const channel of ['E1','E2','E3','E4','E5']) {
      h.controller.resetTimeline();h.controller.noteEvent({channel,timestampMs:0,durationMs:180});h.controller.renderTimeline({positionMs:90,status:'running'});
      hands.add(h.elements.get('#fretting-arm').attrs.d);
    }
    assert.equal(hands.size,5);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
    h.controller.renderTimeline({positionMs:4000,status:'ended'});assert.equal(h.controller.snapshot().state,'IDLE');
  }
});
