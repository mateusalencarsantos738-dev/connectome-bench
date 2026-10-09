/* SVG renderers consume presentation data. Geometry is artistic, not a FlyWire graph. */
window.SimulationViews = (() => {
  const svg = (label, box, content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${label}">${content}</svg>`;
  const line = (x1, y1, x2, y2, attrs = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
  const text = (x, y, value, attrs = "") => `<text x="${x}" y="${y}" fill="#829ba9" font-family="monospace" font-size="9" ${attrs}>${value}</text>`;
  const circle = (x, y, r, attrs = "") => `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}/>`;
  const xTime = (t, data) => 42 + t / data.duration * 568;

  function musicTrack(data, sequence) {
    let content = `<rect x="36" y="0" width="585" height="96" rx="3" fill="#091219"/>`;
    for (let i = 0; i <= 16; i++) content += line(42 + i * 35.5, 0, 42 + i * 35.5, 96, `stroke="${i % 4 ? "#17252e" : "#2b3e49"}" stroke-width=".7"`);
    data.channels.forEach((channel, index) => {
      const y = 10 + index * 18;
      content += text(1, y + 3, channel.id, `style="fill:${channel.color}"`);
      content += line(42, y, 610, y, 'stroke="#22333d" stroke-width=".6"');
      content += `<g class="channel-visual" data-channel="${channel.id}">`;
      sequence.events.filter(event => event.channel === channel.id).forEach(event => {
        const t = event.timestampMs / 1000;
        content += `<rect x="${xTime(t, data) - 7}" y="${y - 3}" width="14" height="6" rx="2" fill="${channel.color}"/>`;
      });
      content += "</g>";
    });
    const x = 0;
    content += `<g data-playhead transform="translate(42 0)">` + line(x, 0, x, 96, 'stroke="#d6e4e8" stroke-width="1"') + `<path d="M${x - 4} 0h8l-4 5Z" fill="#d6e4e8"/></g>`;
    return svg("Sequência de cinco canais E1 a E5, notas estáticas e referência temporal", "0 0 630 96", content);
  }

  function connectomeView(data) {
    let content = `<defs><radialGradient id="node-halo"><stop stop-color="white" stop-opacity=".22"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>`;
    content += `<g fill="none" stroke="#2c4653" stroke-width=".7" opacity=".65">${line(340, 31, 340, 320, 'stroke-dasharray="3 6"')}${line(53, 180, 627, 180, 'stroke-dasharray="3 6"')}<path d="M57 65V48h17M623 65V48h-17M57 283v17h17M623 283v17h-17"/></g>`;
    content += `<g class="brain-structure">`;
    // Four overlapping envelopes suggest bilateral central tissue and lateral lobes.
    const lobes = [[144, 184, 81, 91, -.26], [267, 174, 102, 119, -.2], [413, 174, 102, 119, .2], [536, 184, 81, 91, .26]];
    lobes.forEach(([cx, cy, rx, ry, tilt], lobe) => {
      const points = [];
      const convert = (x, y) => [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
      for (let ring = 1; ring <= 7; ring++) {
        const radius = ring / 7;
        const count = 10 + ring * 6;
        const ringPoints = [];
        for (let j = 0; j < count; j++) {
          const angle = j / count * Math.PI * 2;
          const ripple = 1 + .05 * Math.sin(angle * 5 + lobe);
          const [x, y] = convert(Math.cos(angle) * rx * radius * ripple, Math.sin(angle) * ry * radius * ripple);
          points.push([x, y]); ringPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        content += `<polygon points="${ringPoints.join(" ")}" fill="none" stroke="#6f99a8" stroke-opacity="${ring === 7 ? .62 : .2}" stroke-width="${ring === 7 ? 1 : .6}"/>`;
      }
      points.forEach(([x, y], i) => {
        // Deterministic short links are solely an illustration of structure.
        for (let j = i + 1; j < Math.min(i + 60, points.length); j++) {
          const [px, py] = points[j];
          const distance = Math.hypot(x - px, y - py);
          if (distance > 9 && distance < 33 && (i + j) % 3 === 0) content += line(x.toFixed(1), y.toFixed(1), px.toFixed(1), py.toFixed(1), 'stroke="#668e9c" stroke-opacity=".28" stroke-width=".6"');
        }
        if (i % 3 === 0) content += circle(x.toFixed(1), y.toFixed(1), i % 11 === 0 ? 1.5 : .8, 'fill="#a6c3cd" opacity=".65"');
      });
    });
    for (let i = 0; i < 25; i++) {
      const y = 108 + i * 5;
      content += `<path d="M${237 + i % 4 * 9} ${y}C310 ${y + 80} 366 ${y + 80} ${443 - i % 4 * 9} ${y}" stroke="#7498a7" stroke-opacity=".22" stroke-width=".7" fill="none"/>`;
    }
    content += `</g><g class="brain-activity">`;
    data.channels.forEach((channel, index) => {
      const [cx, cy] = channel.region;
      content += `<g class="channel-visual" data-channel="${channel.id}" fill="${channel.color}" stroke="${channel.color}">`;
      const points = [[cx, cy]];
      for (let i = 0; i < 24; i++) {
        const angle = i * 2.399 + index;
        const radius = 12 + Math.sqrt(i / 24) * 49;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * .85;
        points.push([x, y]);
        const [px, py] = points[Math.floor(i / 3)];
        content += `<path id="visual-${channel.id}-edge-${i}" d="M${px} ${py}Q${(px + x) / 2 + 9} ${(py + y) / 2 - 6} ${x} ${y}" fill="none" stroke-width="1.2"/>`;
        content += circle(x, y, i % 5 === 0 ? 2.6 : 1.5, `id="visual-${channel.id}-node-${i + 1}" stroke="none"`);
      }
      content += circle(cx, cy, 22, 'fill="url(#node-halo)" stroke="none"') + circle(cx, cy, 8, 'fill="none" stroke-opacity=".25"') + circle(cx, cy, 3.5, `id="visual-${channel.id}-node-0" stroke="none"`);
      content += line(cx, cy + 54, cx, 311, 'stroke-opacity=".4" stroke-width=".7" stroke-dasharray="2 3"') + text(cx, 327, channel.id, `text-anchor="middle" style="fill:${channel.color}"`);
      content += "</g>";
    });
    content += `</g>${text(340, 28, "FORMA CONCEITUAL · SEM ESCALA ANATÔMICA", 'text-anchor="middle" font-size="8"')}`;
    return svg("Representação artística bilateral do cérebro da mosca com cinco destaques conceituais E1 a E5, sem mapeamento biológico", "0 0 680 345", content);
  }

  function activityGraph(data, sequence) {
    let content = `<defs><clipPath id="neural-trace-clip"><rect id="neural-trace-window" x="42" y="0" width="0" height="155"/></clipPath></defs>`;
    for (let i = 0; i <= 8; i++) {
      const x = xTime(i / 2, data);
      content += line(x, 5, x, 155, 'stroke="#223641" stroke-width=".6"');
      if (i % 2 === 0) content += text(x, 171, `${i / 2}.0`, 'text-anchor="middle" font-size="8"');
    }
    data.channels.forEach((channel, index) => {
      const baseline = 25 + index * 29;
      content += text(1, baseline + 3, channel.id, `style="fill:${channel.color}"`);
      content += line(42, baseline, 610, baseline, 'stroke="#253945" stroke-width=".6"');
      const points = [];
      for (let step = 0; step <= 600; step++) {
        const t = step / 600 * data.duration;
        // A fixed decorative response around the same example notes as the track.
        // This is not a neuron model and has no physical amplitude or rate units.
        const pulse = sequence.events.filter(event => event.channel === channel.id).map(event => event.timestampMs / 1000).reduce((total, at) => total + 18 * Math.exp(-(((t - at) / .014) ** 2)) - 4 * Math.exp(-(((t - at - .028) / .02) ** 2)), 0);
        points.push(`${step === 0 ? "M" : "L"}${xTime(t, data).toFixed(2)},${(baseline - pulse).toFixed(2)}`);
      }
      content += `<path class="channel-visual" data-channel="${channel.id}" d="${points.join(" ")}" fill="none" stroke="${channel.color}" stroke-width="1.2"/>`;
      content += `<path id="neural-trace-${channel.id}" class="neural-trace" clip-path="url(#neural-trace-clip)" fill="none" stroke="${channel.color}" stroke-width="2"/>`;
    });
    const x = 0;
    content += `<g data-playhead transform="translate(42 0)">` + line(x, 2, x, 153, 'stroke="#c0d4dd" stroke-width=".9" stroke-dasharray="3 3"') + "</g>";
    return svg("Eventos musicais em linha fina e intensidade visual demonstrativa em linha grossa, de zero a quatro segundos", "0 0 630 180", content);
  }

  function actionChannels(data) {
    return data.channels.map(channel => `<button class="channel-button" type="button" data-select-channel="${channel.id}" style="--channel:${channel.color}" aria-pressed="false" aria-label="Destacar canal ${channel.id}, ${channel.label}"><span class="channel-dot" aria-hidden="true"></span><strong>${channel.id}</strong><small>${channel.label}</small></button>`).join("");
  }
  return { musicTrack, connectomeView, activityGraph, actionChannels };
})();
