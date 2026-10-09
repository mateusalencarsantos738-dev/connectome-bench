/* Artistic pose controller only. One shared clock; no musical or neural model. */
window.FlyAnimation = (() => {
  const states = Object.freeze({
    IDLE: { label: "Em repouso", duration: null },
    PREPARANDO: { label: "Ajustando postura", duration: 0.85 },
    TOCANDO: { label: "Execução visual", duration: null },
    ACERTO: { label: "Acerto demonstrativo", duration: 0.55 },
    ERRO: { label: "Correção de postura", duration: 0.95 },
    COMBO: { label: "Sequência demonstrativa", duration: 1.8 },
  });
  // Artistic channel-to-fret mapping, not a biological motor mapping.
  const fretByChannel = Object.freeze({ E1: -18, E2: -10, E3: -2, E4: 6, E5: 10 });
  const pivot = [340, 215];
  const guitarPivot = [357, 299];
  const smooth = t => { const n = Math.max(0, Math.min(1, t)); return n * n * (3 - 2 * n); };
  const rotate = ([x, y], degrees, [cx, cy]) => {
    const a = degrees * Math.PI / 180;
    return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
  };
  const point = ([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`;

  function poseFor(state, elapsed, clock, reduced) {
    // This cadence is purely visual, intentionally independent of the mock BPM/notes.
    const phase = reduced ? Math.PI / 3 : clock * Math.PI * 2 / 0.62;
    const beat = Math.sin(phase);
    const slow = reduced ? 0 : Math.sin(clock * 1.1);
    const pose = { y: slow * .65, lean: slow * .2, head: slow * .7, wing: slow * .35, guitar: slow * .18, strum: 0, fret: 0, strings: 0, feedback: 0 };
    if (state === "IDLE") return pose;
    const ready = state === "PREPARANDO" ? smooth(reduced ? 1 : elapsed / .7) : 1;
    Object.assign(pose, { y: -1.5 * ready, lean: -.7 * ready, head: -1.5 * ready, guitar: -.8 * ready, fret: -10 * ready });
    if (state === "PREPARANDO") return pose;
    Object.assign(pose, {
      y: -1.5 - .8 * beat, lean: -.7 + .25 * beat,
      head: -1 + 1.4 * beat, wing: .35 * beat,
      guitar: -.8 + .55 * beat, strum: 4.8 * beat,
      fret: -8 + 9 * Math.sin(phase / 4), strings: .2 + .5 * Math.abs(Math.cos(phase)),
    });
    const reaction = reduced ? 1 : Math.sin(Math.PI * Math.min(1, elapsed / (states[state].duration || 1)));
    if (state === "ACERTO") {
      pose.y -= 1.3 * reaction;
      pose.head -= 1.8 * reaction;
      pose.guitar -= .5 * reaction;
      pose.feedback = reaction;
    } else if (state === "ERRO") {
      // Deliberate interruption: no strumming or string shimmer during this state.
      pose.y = 1.5 * reaction;
      pose.lean = 1.2 * reaction;
      pose.head = 5 * reaction;
      pose.guitar = 1.1 * reaction;
      pose.strum = 0;
      pose.fret = -8;
      pose.wing = 0;
      pose.strings = 0;
      pose.feedback = reaction;
    } else if (state === "COMBO") {
      pose.strum *= 1.15;
      pose.lean -= .8 * reaction;
      pose.y -= .7 * reaction;
      pose.guitar += .4 * beat;
      pose.feedback = .65 * reaction;
    }
    if (reduced) { pose.strings = 0; pose.strum = 0; }
    return pose;
  }

  function create(svg, onChange = () => {}) {
    const ids = ["fly-pose", "head", "wing-near", "wing-far", "guitar-motion", "guitar-shell", "string-feedback", "contact-marker", "strumming-arm", "strumming-fingers", "fretting-arm", "fretting-fingers", "support-far-back", "support-far-front", "support-near-back", "support-near-front"];
    const parts = Object.fromEntries(ids.map(id => [id, svg.querySelector(`#${id}`)]));
    if (ids.some(id => !parts[id])) throw new Error("SVG do agente incompleto.");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let state = "IDLE", elapsed = 0, clock = 0, lastTime = null;
    let paused = false, visible = true, destroyed = false, reduced = media.matches;
    let timelineMode = false, notes = [], timelinePosition = 0, musicalPhase = "idle", heldChannel = null;
    let frame = null, timer = null, timerStart = 0;
    let previousPose = null, currentPose = poseFor(state, 0, 0, reduced);
    const active = () => !destroyed && !paused && visible && !document.hidden;
    const snapshot = () => ({ state, label: timelineMode && musicalPhase === "hold" ? `Sustentando ${heldChannel}` : states[state].label, phase: musicalPhase, paused, reducedMotion: reduced, suspended: !visible || document.hidden });
    const notify = () => onChange(snapshot());
    const attr = (id, name, value) => parts[id].setAttribute(name, String(value));

    function render(override) {
      const target = override || poseFor(state, elapsed, clock, reduced || paused);
      const mix = reduced || paused ? 1 : smooth(elapsed / .16);
      const pose = Object.fromEntries(Object.entries(target).map(([key, value]) => [key, previousPose && !override ? previousPose[key] + (value - previousPose[key]) * mix : value]));
      currentPose = pose;
      attr("fly-pose", "transform", `translate(0 ${pose.y}) rotate(${pose.lean} ${point(pivot)})`);
      attr("head", "transform", `rotate(${pose.head} 387 174)`);
      attr("wing-near", "transform", `rotate(${pose.wing} 340 180)`);
      attr("wing-far", "transform", `rotate(${-pose.wing * .65} 344 182)`);
      attr("guitar-motion", "transform", `rotate(${pose.guitar} ${point(guitarPivot)})`);

      // Hand targets live in guitar coordinates. Both limb endpoints follow the
      // same nested transforms as the instrument, instead of independent keyframes.
      const onGuitar = p => rotate(rotate(p, -28, [389, 273]), pose.guitar, guitarPivot);
      const strumLocal = [340, 284 + pose.strum];
      const fretLocal = [470 + pose.fret, 284];
      const strum = onGuitar(strumLocal), fret = onGuitar(fretLocal);
      attr("strumming-arm", "d", `M381 192L353 225L${point([strum[0] - 8, strum[1] - 18])}L${point(strum)}`);
      attr("fretting-arm", "d", `M399 190L430 223L${point([fret[0] - 10, fret[1] - 5])}L${point(fret)}`);
      for (const [id, hand] of [["strumming-fingers", strumLocal], ["fretting-fingers", fretLocal]]) {
        attr(id, "d", `M${point(onGuitar([hand[0] - 3, hand[1] - 3]))}L${point(onGuitar(hand))}L${point(onGuitar([hand[0] + 4, hand[1] + 2]))}`);
      }

      // Compensate the body transform at the support feet to keep them on the floor.
      const planted = ([x, y]) => rotate([x, y - pose.y], -pose.lean, pivot);
      const supports = [
        ["support-far-back", [311, 219], [240, 280], [[178, 333], [156, 338]]],
        ["support-far-front", [345, 218], [380, 292], [[435, 338], [457, 340]]],
        ["support-near-back", [300, 222], [259, 277], [[274, 340], [263, 353], [245, 356]]],
        ["support-near-front", [328, 224], [341, 266], [[384, 333], [388, 351], [407, 354]]],
      ];
      supports.forEach(([id, hip, knee, feet]) => attr(id, "d", `M${point(hip)}L${point(knee)}${feet.map(p => `L${point(planted(p))}`).join("")}`));
      const color = state === "ERRO" ? "#e48c8b" : state === "ACERTO" ? "#6dd7ac" : "#e9c96b";
      attr("guitar-shell", "stroke", pose.feedback > .1 ? color : "#b2d9ce");
      attr("guitar-shell", "stroke-width", 2 + pose.feedback * .8);
      attr("string-feedback", "opacity", pose.strings);
      attr("contact-marker", "transform", `translate(${point(strum)})`);
      attr("contact-marker", "stroke", color);
      attr("contact-marker", "opacity", pose.feedback * .8);
      svg.setAttribute("data-state", state);
      svg.setAttribute("data-motion", paused ? "paused" : reduced ? "reduced" : "active");
    }

    function stopClock() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (timer !== null) {
        // Preserve remaining reaction time when reduced-motion playback is paused.
        elapsed += (performance.now() - timerStart) / 1000;
        window.clearTimeout(timer);
      }
      frame = timer = lastTime = null;
    }

    function schedule() {
      if (timelineMode || !active() || frame !== null || timer !== null) return;
      if (reduced) {
        const duration = states[state].duration;
        if (duration !== null) {
          timerStart = performance.now();
          timer = window.setTimeout(() => {
            timer = null;
            if (active()) setState("TOCANDO");
          }, Math.max(0, duration - elapsed) * 1000);
        }
      } else frame = window.requestAnimationFrame(tick);
    }

    function tick(now) {
      frame = null;
      if (!active()) { lastTime = null; return; }
      const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      elapsed += delta;
      clock += delta;
      if (states[state].duration !== null && elapsed >= states[state].duration) {
        setState("TOCANDO");
        return;
      }
      render();
      schedule();
    }

    function setState(next) {
      if (destroyed || !Object.hasOwn(states, next)) return false;
      stopClock();
      timelineMode = false; notes = []; musicalPhase = "idle"; heldChannel = null;
      svg.setAttribute("data-note-phase", "idle");
      previousPose = currentPose;
      state = next;
      elapsed = 0;
      render();
      notify();
      schedule();
      return true;
    }
    function setPaused(value) {
      if (destroyed || paused === Boolean(value)) return;
      stopClock();
      paused = Boolean(value);
      if (!paused) previousPose = currentPose;
      // Keep exactly the same pose when pausing; only the status changes.
      svg.setAttribute("data-motion", paused ? "paused" : reduced ? "reduced" : "active");
      notify();
      schedule();
    }
    function setVisible(value) {
      if (destroyed || visible === Boolean(value)) return;
      stopClock();
      visible = Boolean(value);
      schedule();
    }
    function visibilityChanged() { stopClock(); schedule(); }
    function preferenceChanged(event) {
      stopClock();
      reduced = event.matches;
      previousPose = null;
      if (timelineMode) renderTimeline({ positionMs: timelinePosition, status: paused ? "paused" : "running" });
      else render();
      notify();
      schedule();
    }
    function resetTimeline() {
      stopClock(); timelineMode = true; notes = []; paused = false; previousPose = null;
      renderTimeline({ positionMs: 0, status: "ready" });
    }
    function noteEvent(event) { if (!destroyed && timelineMode) notes.push(event); }
    function noteEnd(event) {
      if (destroyed || event.type !== "NOTE_END") return;
      notes = notes.filter(note => note.eventId !== event.eventId || note.channel !== event.channel || note.timestampMs + note.sustainMs !== event.timestampMs);
    }
    function renderTimeline(info) {
      if (destroyed) return;
      timelinePosition = info.positionMs;
      paused = info.status === "paused";
      notes = notes.filter(note => timelinePosition < note.timestampMs + (note.sustainMs || note.durationMs));
      if (["ended", "ready", "error"].includes(info.status)) notes = [];
      const next = notes.length ? "TOCANDO" : "IDLE";
      const primary = notes.at(-1);
      const nextPhase = !primary ? "idle" : primary.sustainMs > 0 && timelinePosition - primary.timestampMs >= Math.min(primary.durationMs, primary.sustainMs) ? "hold" : "pluck";
      const changed = state !== next || musicalPhase !== nextPhase || heldChannel !== primary?.channel;
      musicalPhase = nextPhase; heldChannel = primary?.channel;
      svg.setAttribute("data-note-phase", musicalPhase);
      state = next;
      const pose = poseFor("IDLE", 0, timelinePosition / 1000, reduced);
      for (const note of notes) {
        const age = timelinePosition - note.timestampMs;
        const strikeMs = note.sustainMs > 0 ? Math.min(note.durationMs, note.sustainMs) : note.durationMs;
        const progress = Math.max(0, Math.min(1, age / strikeMs));
        const envelope = reduced ? 1 : Math.sin(Math.PI * progress) ** 2;
        pose.strum += reduced ? 0 : 4.8 * Math.sin(2 * Math.PI * progress) * envelope;
        if (note.sustainMs > 0) {
          // One fret hand: newest active note wins, stable input order for ties.
          if (note === primary) {
            const hold = reduced ? 1 : smooth(age / 40) * smooth((note.sustainMs - age) / Math.min(80, note.sustainMs / 2));
            pose.fret = fretByChannel[note.channel] * hold;
            pose.head -= hold; pose.guitar -= .5 * hold;
          }
        } else {
          pose.fret += fretByChannel[note.channel] * envelope;
          pose.head -= envelope; pose.guitar -= .5 * envelope;
        }
        pose.strings = reduced ? 0 : Math.max(pose.strings, .7 * envelope);
      }
      pose.strum = Math.max(-5.5, Math.min(5.5, pose.strum));
      pose.fret = Math.max(-18, Math.min(10, pose.fret));
      render(pose);
      if (changed) notify();
    }
    function destroy() {
      stopClock();
      destroyed = true;
      document.removeEventListener("visibilitychange", visibilityChanged);
      media.removeEventListener("change", preferenceChanged);
    }
    document.addEventListener("visibilitychange", visibilityChanged);
    media.addEventListener("change", preferenceChanged);
    render();
    notify();
    schedule();
    return Object.freeze({ setState, setPaused, setVisible, snapshot, destroy, resetTimeline, noteEvent, noteEnd, renderTimeline });
  }
  return Object.freeze({ states, create });
})();
