/* Artistic response to musical events. No neuronal model, anatomy or FlyWire data. */
window.NeuralVisual = (() => {
  // IDs refer exclusively to the existing artistic nodes/branches in components.js.
  // Channels may share targets. Their contributions add, capped at one.
  const channelMap = Object.freeze(Object.fromEntries(['E1', 'E2', 'E3', 'E4', 'E5'].map(channel => [channel,
    Object.freeze({ nodes: Object.freeze(Array.from({ length: 25 }, (_, i) => `visual-${channel}-node-${i}`)),
      edges: Object.freeze(Array.from({ length: 24 }, (_, i) => `visual-${channel}-edge-${i}`)) })])));
  const responseMs = 600, attackMs = 40, sampleCount = 401;
  function envelope(ageMs) {
    if (ageMs < 0 || ageMs >= responseMs) return 0;
    if (ageMs < attackMs) { const p = ageMs / attackMs; return p * p * (3 - 2 * p); }
    return ((responseMs - ageMs) / (responseMs - attackMs)) ** 2;
  }
  function create(root, graph, { durationMs, map = channelMap, reducedMotion = false } = {}) {
    if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('Duração da visualização inválida.');
    const channels = Object.keys(map), targets = new Map(), series = new Map(), paths = new Map();
    const stepMs = durationMs > 0 ? durationMs / (sampleCount - 1) : 1;
    const clip = graph?.querySelector('#neural-trace-window');
    if (!root || !clip || !channels.length) throw new Error('Visualização demonstrativa incompleta.');
    for (const channel of channels) {
      const group = map[channel];
      if (!/^E[1-5]$/.test(channel) || !Array.isArray(group?.nodes) || !Array.isArray(group?.edges) || !group.nodes.length) throw new Error('Mapeamento visual inválido.');
      for (const [kind, ids] of Object.entries(group)) {
        if (!['nodes', 'edges'].includes(kind)) throw new Error('Tipo de elemento visual inválido.');
        for (const id of ids) {
          if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) throw new Error('Identificador visual inválido.');
          const element = root.querySelector(`#${id}`);
          if (!element) throw new Error(`Elemento visual ausente: ${id}`);
          if (!targets.has(id)) targets.set(id, { element, kind, channels: new Set() });
          const target = targets.get(id);
          if (target.kind !== kind) throw new Error(`Tipo visual conflitante: ${id}`);
          target.channels.add(channel);
        }
      }
      const path = graph.querySelector(`#neural-trace-${channel}`);
      if (!path) throw new Error(`Traço visual ausente: ${channel}`);
      paths.set(channel, path); series.set(channel, new Float64Array(sampleCount));
    }
    let positionMs = 0, status = 'ready', destroyed = false, reduced = Boolean(reducedMotion);
    const seen = new Set(), dirty = new Set(channels);
    // Fixed-size sampled series are the common state for the graph and node intensity.
    // Only received events contribute; no independent reading/scheduling of notes.
    function receive(event) {
      if (destroyed) return false;
      if (!event || event.type !== 'NOTE_EVENT' || typeof event.eventId !== 'string' || !event.eventId ||
          !Number.isFinite(event.timestampMs) || event.timestampMs < 0 || event.timestampMs > durationMs ||
          !Number.isFinite(event.durationMs) || event.durationMs <= 0) throw new Error('Evento visual inválido.');
      if (!series.has(event.channel)) throw new Error(`Canal visual não mapeado: ${event.channel}`);
      if (seen.has(event.eventId)) return false;
      seen.add(event.eventId);
      const values = series.get(event.channel);
      const from = Math.max(0, Math.ceil(event.timestampMs / stepMs));
      const to = Math.min(sampleCount - 1, Math.ceil((event.timestampMs + responseMs) / stepMs));
      for (let i = from; i <= to; i++) values[i] += envelope(i * stepMs - event.timestampMs);
      dirty.add(event.channel);
      return true;
    }
    function intensity(channel) {
      const values = series.get(channel);
      const index = Math.min(sampleCount - 1, positionMs / stepMs), lo = Math.floor(index), hi = Math.min(sampleCount - 1, lo + 1);
      // Interpolate the same saturated samples plotted in the complementary graph.
      return Math.min(1, values[lo]) + (Math.min(1, values[hi]) - Math.min(1, values[lo])) * (index - lo);
    }
    function paint() {
      const levels = Object.fromEntries(channels.map(channel => [channel, intensity(channel)]));
      for (const target of targets.values()) {
        const level = Math.min(1, [...target.channels].reduce((sum, channel) => sum + levels[channel], 0));
        // Reduced motion: fixed subdued emphasis while active, no fading or geometry motion.
        const visible = reduced ? (level > 0 ? .55 : 0) : level;
        target.element.setAttribute('opacity', (target.kind === 'nodes' ? .16 + .84 * visible : .08 + .92 * visible).toFixed(4));
        target.element.setAttribute('data-intensity', level.toFixed(4));
      }
      for (const channel of dirty) {
        const baseline = 25 + (Number(channel.slice(1)) - 1) * 29;
        const points = Array.from(series.get(channel), (value, i) => `${i ? 'L' : 'M'}${(42 + i / (sampleCount - 1) * 568).toFixed(2)},${(baseline - 18 * Math.min(1, value)).toFixed(2)}`);
        paths.get(channel).setAttribute('d', points.join(' '));
      }
      dirty.clear();
      clip.setAttribute('width', String(durationMs ? positionMs / durationMs * 568 : 0));
      root.setAttribute('data-neural-status', status);
      root.setAttribute('data-neural-time', String(positionMs));
    }
    function update(info) {
      if (destroyed) return;
      if (!Number.isFinite(info?.positionMs) || info.positionMs < 0 || info.positionMs > durationMs) throw new Error('Instante visual inválido.');
      positionMs = info.positionMs; status = info.status;
      // End freezes the last frame, including unfinished responses. No tail clock.
      paint();
    }
    function reset() {
      if (destroyed) return;
      seen.clear(); positionMs = 0; status = 'ready';
      for (const channel of channels) { series.get(channel).fill(0); dirty.add(channel); }
      paint();
    }
    function setReducedMotion(value) { if (!destroyed) { reduced = Boolean(value); paint(); } }
    function destroy() { if (destroyed) return; reset(); destroyed = true; targets.clear(); paths.clear(); series.clear(); dirty.clear(); }
    reset();
    return Object.freeze({ receive, update, reset, setReducedMotion, destroy });
  }
  return Object.freeze({ channelMap, responseMs, attackMs, envelope, create });
})();
