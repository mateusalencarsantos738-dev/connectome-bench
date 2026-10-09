/* Demonstration fixtures only; no audio or biological measurements. */
window.MockData = Object.freeze({
  duration: 4,
  noteDurationMs: 180, // Visual stroke duration, not a measured biological response.
  selectedChannel: "E3",
  channels: [
    { id: "E1", color: "#6dd7ac", label: "Nota 01", description: "E1 · Associação ilustrativa da nota 01. Movimento de guitarra demonstrativo; sem atribuição biológica.", times: [0.32, 1.26, 2.05, 3.38], region: [155, 176] },
    { id: "E2", color: "#e48c8b", label: "Nota 02", description: "E2 · Associação ilustrativa da nota 02. Movimento de guitarra demonstrativo; sem atribuição biológica.", times: [0.65, 1.72, 2.86, 3.65], region: [251, 145] },
    { id: "E3", color: "#e9c96b", label: "Nota 03", description: "E3 · Associação ilustrativa da nota 03. Movimento de guitarra demonstrativo; sem atribuição biológica.", times: [0.98, 1.88, 2.48, 3.18], region: [340, 184] },
    { id: "E4", color: "#6fc5eb", label: "Nota 04", description: "E4 · Associação ilustrativa da nota 04. Movimento de guitarra demonstrativo; sem atribuição biológica.", times: [0.12, 1.5, 2.7, 3.52], region: [427, 145] },
    { id: "E5", color: "#bf9be3", label: "Nota 05", description: "E5 · Associação ilustrativa da nota 05. Movimento de guitarra demonstrativo; sem atribuição biológica.", times: [0.48, 1.12, 2.22, 3.8], region: [524, 177] },
  ],
});

// Optional invented sustain examples; the original twenty notes remain unchanged.
window.SustainDemo = Object.freeze([
  Object.freeze({ type: "NOTE_EVENT", eventId: "demo-hold-1", channel: "E1", timestampMs: 200, durationMs: 180, sustainMs: 2400 }),
  Object.freeze({ type: "NOTE_EVENT", eventId: "demo-hold-2", channel: "E4", timestampMs: 1200, durationMs: 180, sustainMs: 2000 }),
  Object.freeze({ type: "NOTE_EVENT", eventId: "demo-hold-3", channel: "E1", timestampMs: 2600, durationMs: 180, sustainMs: 1400 }),
]);
