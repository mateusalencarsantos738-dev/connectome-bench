/* Presentation only: static channels and local animation; no audio or neural engine. */
(() => {
  const data = window.MockData;
  const views = window.SimulationViews;
  document.querySelector("#music-track").innerHTML = views.musicTrack(data);
  document.querySelector("#connectome-view").innerHTML = views.connectomeView(data);
  document.querySelector("#activity-graph").innerHTML = views.activityGraph(data);
  document.querySelector("#action-channels").innerHTML = views.actionChannels(data);

  function selectChannel(id) {
    const channel = data.channels.find(item => item.id === id);
    if (!channel) return;
    document.documentElement.style.setProperty("--selected", channel.color);
    document.querySelectorAll("[data-select-channel]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.selectChannel === id)));
    document.querySelectorAll("[data-channel]").forEach(element => element.classList.toggle("is-selected", element.dataset.channel === id));
    document.querySelectorAll("[data-selected-channel]").forEach(element => { element.textContent = id; });
    document.querySelector("#channel-description").textContent = channel.description;
  }
  document.querySelector("#action-channels").addEventListener("click", event => {
    const button = event.target.closest("[data-select-channel]");
    if (button) selectChannel(button.dataset.selectChannel);
  });
  document.querySelector("#show-structure").addEventListener("change", event => {
    document.querySelector(".brain-structure").classList.toggle("is-hidden", !event.target.checked);
  });
  document.querySelector("#show-activity").addEventListener("change", event => {
    document.querySelector(".brain-activity").classList.toggle("is-hidden", !event.target.checked);
  });
  selectChannel(data.selectedChannel);

  // The object keeps the original SVG as the single editable artwork source.
  const agentView = document.querySelector("#fly-agent-view");
  const stateSelect = document.querySelector("#fly-state");
  const pauseButton = document.querySelector("#fly-pause");
  let animation = null;
  let observer = null;
  let loadedSvg = null;

  function showState(info) {
    stateSelect.value = info.state;
    document.querySelector("#fly-state-label").textContent = info.state;
    document.querySelector("#fly-pose-description").textContent = info.label;
    document.querySelector("#agent-motion-status").textContent = info.paused ? "Animação pausada" : info.reducedMotion ? "Movimento reduzido" : "Animação visual";
    pauseButton.textContent = info.paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-pressed", String(info.paused));
    const label = info.paused ? "Retomar animação" : "Pausar animação";
    pauseButton.setAttribute("aria-label", label);
    pauseButton.title = label;
    document.querySelector("#fly-motion-note").textContent = info.reducedMotion
      ? "Movimento reduzido: poses fixas; reações retornam a Tocando."
      : "Estados locais de animação · sem áudio ou sequência musical real.";
  }
  function unavailable() {
    stateSelect.disabled = pauseButton.disabled = true;
    document.querySelector("#agent-motion-status").textContent = "Agente estático";
    document.querySelector("#fly-motion-note").textContent = "Para animar, abra a interface pelo servidor local descrito no README.";
  }
  function mountAgent() {
    let svg;
    try { svg = agentView.contentDocument?.documentElement; } catch { unavailable(); return; }
    if (!svg || svg.localName !== "svg") { unavailable(); return; }
    if (svg === loadedSvg) return;
    animation?.destroy();
    observer?.disconnect();
    loadedSvg = svg;
    animation = window.FlyAnimation.create(svg, showState);
    // A small local API for future visual controls, not a simulation event bus.
    window.flyAgent = animation;
    stateSelect.disabled = pauseButton.disabled = false;
    observer = new IntersectionObserver(entries => animation.setVisible(entries[0].isIntersecting));
    observer.observe(agentView);
  }
  agentView.addEventListener("load", mountAgent);
  agentView.addEventListener("error", unavailable);
  // load may have fired before this deferred script ran.
  if (agentView.contentDocument?.documentElement?.localName === "svg") mountAgent();
  stateSelect.addEventListener("change", () => animation?.setState(stateSelect.value));
  pauseButton.addEventListener("click", () => animation?.setPaused(!animation.snapshot().paused));
})();
