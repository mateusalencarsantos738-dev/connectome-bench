/* Demonstration events only. Timestamps are milliseconds, never inferred from BPM. */
window.MusicTimeline = (() => {
  function normalize(events, durationMs) {
    if (!Array.isArray(events)) throw new Error("Sequência musical ausente.");
    if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error("Duração inválida.");
    const ids = new Set();
    const sequence = events.map(event => {
      if (!event || event.type !== "NOTE_EVENT" || !/^E[1-5]$/.test(event.channel) ||
          typeof event.eventId !== "string" || !event.eventId || ids.has(event.eventId) ||
          !Number.isFinite(event.timestampMs) || event.timestampMs < 0 ||
          !Number.isFinite(event.durationMs) || event.durationMs <= 0 ||
          event.timestampMs + event.durationMs > durationMs) throw new Error("Evento musical inválido ou duplicado.");
      ids.add(event.eventId);
      return Object.freeze({ ...event });
    });
    // Source channel order has no temporal meaning; equal timestamps retain input order.
    sequence.sort((a, b) => a.timestampMs - b.timestampMs);
    return Object.freeze({ events: Object.freeze(sequence), durationMs });
  }
  function fromChannels(data) {
    if (!Array.isArray(data?.channels)) throw new Error("Canais musicais ausentes.");
    return normalize(data.channels.flatMap(channel => {
      if (!Array.isArray(channel.times)) throw new Error("Tempos musicais ausentes.");
      return channel.times.map((time, index) => ({ type: "NOTE_EVENT", channel: channel.id,
        eventId: `${channel.id}-${index + 1}`, timestampMs: typeof time === "number" ? time * 1000 : NaN,
        durationMs: data.noteDurationMs }));
    }), data.duration * 1000);
  }
  function create(input, runtime = {}) {
    const sequence = normalize(input?.events, input?.durationMs);
    const now = runtime.now || (() => performance.now());
    const request = runtime.requestFrame || (fn => window.requestAnimationFrame(fn));
    const cancel = runtime.cancelFrame || (id => window.cancelAnimationFrame(id));
    const listeners = new Map();
    let status = sequence.events.length ? "ready" : "empty", positionMs = 0, cursor = 0;
    let frame = null, anchor = 0, base = 0, generation = 0, destroyed = false, error = null;
    const snapshot = () => ({ status, positionMs, processed: cursor, total: sequence.events.length, durationMs: sequence.durationMs, error });
    function emit(type, payload) { for (const fn of listeners.get(type) || []) fn(payload); }
    function stop() { if (frame !== null) cancel(frame); frame = null; }
    function fail(cause) {
      stop(); generation++; status = "error"; error = cause.message || String(cause);
      // A failing consumer must never leave the transport running.
      for (const fn of listeners.get("ERROR") || []) { try { fn(snapshot()); } catch {} }
    }
    function guarded(fn) { try { fn(); } catch (cause) { fail(cause); } }
    function update() {
      positionMs = Math.min(sequence.durationMs, Math.max(positionMs, base + now() - anchor));
      const run = generation;
      while (cursor < sequence.events.length && sequence.events[cursor].timestampMs <= positionMs) {
        const event = sequence.events[cursor++];
        emit("NOTE_EVENT", event);
        if (generation !== run || status !== "running") return;
      }
      emit("TIME_UPDATE", snapshot());
      if (generation !== run || status !== "running") return;
      if (positionMs >= sequence.durationMs) { stop(); status = "ended"; emit("STATE", snapshot()); }
    }
    function schedule() { if (!destroyed && status === "running" && frame === null) frame = request(tick); }
    function tick() { frame = null; guarded(update); schedule(); }
    function reset() {
      if (destroyed) return;
      stop(); generation++; positionMs = cursor = 0; error = null;
      status = sequence.events.length ? "ready" : "empty";
      guarded(() => { emit("RESET", snapshot()); emit("TIME_UPDATE", snapshot()); emit("STATE", snapshot()); });
    }
    function start() {
      if (destroyed || status === "running" || !sequence.events.length) return;
      reset(); if (status === "error") return;
      status = "running"; base = 0; anchor = now();
      guarded(() => { emit("STATE", snapshot()); update(); }); schedule();
    }
    function pause() {
      if (destroyed || status !== "running") return;
      guarded(() => { update(); if (status === "running") { stop(); status = "paused"; emit("STATE", snapshot()); } });
    }
    function resume() {
      if (destroyed || status !== "paused") return;
      base = positionMs; anchor = now(); status = "running";
      guarded(() => emit("STATE", snapshot())); schedule();
    }
    function on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn); return () => listeners.get(type)?.delete(fn);
    }
    function destroy() { stop(); destroyed = true; generation++; listeners.clear(); }
    return Object.freeze({ on, start, pause, resume, reset, snapshot, destroy });
  }
  return Object.freeze({ normalize, fromChannels, create });
})();
