/* Musical demonstration only: no audio, neural dynamics or biological measurements. */
(() => {
  const data = window.MockData, views = window.SimulationViews;
  const $ = selector => document.querySelector(selector);
  const start = $("#sequence-start"), pause = $("#sequence-pause"), reset = $("#sequence-reset");
  const agentView = $("#fly-agent-view"), stateSelect = $("#fly-state"), pauseButton = $("#fly-pause");
  let animation = null, observer = null, loadedSvg = null, timeline = null, activeNotes = [], sequenceMode = false;
  let sequence, selectedId, neural;
  function reportError(message) {
    start.disabled = pause.disabled = reset.disabled = true;
    $("#agent-motion-status").textContent = "Erro na demonstração";
    $("#transport-note").textContent = message;
  }
  try { sequence = window.MusicTimeline.fromChannels(data); timeline = window.MusicTimeline.create(sequence); }
  catch (error) { reportError(error.message); return; }
  $("#music-track").innerHTML = views.musicTrack(data, sequence);
  $("#connectome-view").innerHTML = views.connectomeView(data);
  $("#activity-graph").innerHTML = views.activityGraph(data, sequence);
  $("#action-channels").innerHTML = views.actionChannels(data);

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  try {
    neural = window.NeuralVisual.create($("#connectome-view"), $("#activity-graph"), {
      durationMs: sequence.durationMs, reducedMotion: motionPreference.matches,
    });
  } catch (error) { reportError(`Painel neural: ${error.message}`); return; }
  const changeNeuralMotion = event => neural.setReducedMotion(event.matches);
  motionPreference.addEventListener("change", changeNeuralMotion);

  function selectChannel(id) {
    id = id || null;
    if (selectedId === id) return;
    selectedId = id;
    const channel = data.channels.find(item => item.id === id);
    if (channel) document.documentElement.style.setProperty("--selected", channel.color);
    document.querySelectorAll("[data-select-channel]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.selectChannel === id)));
    document.querySelectorAll("[data-channel]").forEach(element => element.classList.toggle("is-selected", element.dataset.channel === id));
    document.querySelectorAll("[data-selected-channel]").forEach(element => { element.textContent = id || "—"; });
    $("#channel-description").textContent = channel?.description || "Nenhum evento ativo · repouso entre notas.";
  }
  $("#action-channels").addEventListener("click", event => {
    const button = event.target.closest("[data-select-channel]");
    if (button && !["running", "paused"].includes(timeline.snapshot().status)) selectChannel(button.dataset.selectChannel);
  });
  $("#show-structure").addEventListener("change", event => $(".brain-structure").classList.toggle("is-hidden", !event.target.checked));
  $("#show-activity").addEventListener("change", event => $(".brain-activity").classList.toggle("is-hidden", !event.target.checked));
  function showState(info) {
    stateSelect.value = info.state;
    $("#fly-state-label").textContent = info.state;
    $("#fly-pose-description").textContent = info.label;
    if (!sequenceMode) {
      $("#agent-motion-status").textContent = info.paused ? "Animação pausada" : "Animação visual";
      pauseButton.textContent = info.paused ? "▶" : "Ⅱ";
      pauseButton.setAttribute("aria-label", info.paused ? "Retomar animação" : "Pausar animação");
      pauseButton.setAttribute("aria-pressed", String(info.paused));
      pauseButton.title = pauseButton.getAttribute("aria-label");
    }
    $("#fly-motion-note").textContent = info.reducedMotion ? "Movimento reduzido: poses fixas por evento · sem áudio." : "Movimentos demonstrativos · sem áudio ou atividade neural validada.";
  }
  function updateTime(info) {
    neural.update(info);
    animation && sequenceMode && animation.renderTimeline(info);
    const ms = Math.floor(info.positionMs);
    $("#sequence-time").textContent = `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    $("#sequence-progress").textContent = `${info.processed} / ${info.total}`;
    const x = 42 + (info.durationMs ? info.positionMs / info.durationMs : 0) * 568;
    document.querySelectorAll("[data-playhead]").forEach(element => element.setAttribute("transform", `translate(${x} 0)`));
    activeNotes = activeNotes.filter(note => info.positionMs < note.timestampMs + note.durationMs);
    if (sequenceMode) selectChannel(activeNotes.at(-1)?.channel);
  }
  function updateControls(info) {
    neural.update(info);
    $("#neural-frame-state").textContent = info.status === "ended" ? "QUADRO FINAL CONGELADO" : "VISTA DORSAL";
    const busy = ["running", "paused"].includes(info.status);
    start.disabled = !animation || busy || info.status === "empty" || info.status === "error";
    pause.disabled = !busy; reset.disabled = !animation;
    pause.textContent = info.status === "paused" ? "Retomar" : "Pausar";
    stateSelect.disabled = !animation || busy;
    document.querySelectorAll("[data-select-channel]").forEach(button => { button.disabled = busy; });
    if (sequenceMode) {
      animation?.renderTimeline(info);
      $("#agent-motion-status").textContent = ({ ready: "Pronta para iniciar", running: "Sequência em execução", paused: "Sequência pausada", ended: "Sequência concluída", empty: "Sequência vazia", error: "Erro na demonstração" })[info.status];
      pauseButton.disabled = !busy;
      pauseButton.textContent = info.status === "paused" ? "▶" : "Ⅱ";
      pauseButton.setAttribute("aria-label", info.status === "paused" ? "Retomar sequência" : "Pausar sequência");
      pauseButton.setAttribute("aria-pressed", String(info.status === "paused"));
      pauseButton.title = pauseButton.getAttribute("aria-label");
    }
  }
  timeline.on("RESET", () => { sequenceMode = true; activeNotes = []; neural.reset(); animation?.resetTimeline(); });
  timeline.on("NOTE_EVENT", event => { neural.receive(event); activeNotes.push(event); animation?.noteEvent(event); });
  timeline.on("TIME_UPDATE", updateTime);
  timeline.on("STATE", updateControls);
  timeline.on("ERROR", info => { neural.reset(); activeNotes = []; animation?.renderTimeline(info); selectChannel(null); updateControls(info); reportError(info.error); reset.disabled = !animation; });
  function togglePause() { timeline.snapshot().status === "paused" ? timeline.resume() : timeline.pause(); }
  start.addEventListener("click", () => timeline.start());
  pause.addEventListener("click", togglePause);
  reset.addEventListener("click", () => { $("#transport-note").textContent = "Sequência demonstrativa · sem áudio."; timeline.reset(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) timeline.pause(); });
  function unavailable() {
    timeline.reset(); animation?.destroy(); animation = null;
    stateSelect.disabled = pauseButton.disabled = true;
    reportError("Agente indisponível. Abra pelo servidor local indicado no README.");
  }
  function mountAgent() {
    let svg;
    try { svg = agentView.contentDocument?.documentElement; } catch { unavailable(); return; }
    if (!svg || svg.localName !== "svg") { unavailable(); return; }
    if (svg === loadedSvg) return;
    if (animation) timeline.reset();
    animation?.destroy(); observer?.disconnect(); loadedSvg = svg;
    try { animation = window.FlyAnimation.create(svg, showState); } catch { unavailable(); return; }
    window.flyAgent = animation;
    stateSelect.disabled = pauseButton.disabled = false;
    if (sequenceMode) animation.resetTimeline();
    observer = new IntersectionObserver(entries => animation.setVisible(entries[0].isIntersecting));
    observer.observe(agentView); updateControls(timeline.snapshot());
  }
  agentView.addEventListener("load", mountAgent);
  agentView.addEventListener("error", unavailable);
  if (agentView.contentDocument?.documentElement?.localName === "svg") mountAgent();
  stateSelect.addEventListener("change", () => { const next = stateSelect.value; sequenceMode = false; pauseButton.disabled = false; animation?.setPaused(false); animation?.setState(next); });
  pauseButton.addEventListener("click", () => sequenceMode ? togglePause() : animation?.setPaused(!animation.snapshot().paused));
  window.addEventListener("pagehide", event => {
    if (event.persisted) { timeline.pause(); return; }
    timeline.destroy(); neural.destroy(); animation?.destroy(); observer?.disconnect();
    motionPreference.removeEventListener("change", changeNeuralMotion);
  }, { once: false });
  updateTime(timeline.snapshot()); selectChannel(data.selectedChannel);
})();
