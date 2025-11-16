const LOOP_BUTTON_CLASS = "xt-loop-button";
const LOOP_BUTTON_WRAPPER_CLASS = "xt-loop-button-wrapper";

const SETTINGS_ARIA_LABELS = [
  "Video settings",
  "Paramètres vidéo",
  "Paramètres de la vidéo",
  "Paramètres",
  "Settings"
];

let alwaysLoop = false;
let showButton = true;

const perVideoOverride = {};
let nextVideoId = 1;

function getVideoId(video) {
  if (!video.dataset.xtLoopId) {
    video.dataset.xtLoopId = String(nextVideoId++);
  }
  return video.dataset.xtLoopId;
}

function isSettingsButton(el) {
  if (!(el instanceof HTMLButtonElement)) return false;
  const label = el.getAttribute("aria-label") || "";
  return SETTINGS_ARIA_LABELS.includes(label);
}

function updateButtonState(button, isLooping) {
  if (isLooping) {
    button.classList.add("xt-loop-button--active");
    button.title = "Loop is ON";
  } else {
    button.classList.remove("xt-loop-button--active");
    button.title = "Loop is OFF";
  }
}

function applyEffectiveLoop(video) {
  const id = getVideoId(video);
  if (perVideoOverride[id] !== undefined) {
    video.loop = perVideoOverride[id];
    return;
  }
  video.loop = alwaysLoop;
}

function createLoopButton(video) {
  const id = getVideoId(video);
  applyEffectiveLoop(video);

  const button = document.createElement("button");
  button.type = "button";
  button.className = LOOP_BUTTON_CLASS;
  button.dataset.videoId = id;
  button.setAttribute("aria-label", "Loop video");

  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
      <path fill="currentColor" d="
        M12 4V2l-4 3 4 3V6c3.31 0 6 2.69 6 6 0 1.02-.26 1.98-.73 2.82l1.49 1.49A7.95 7.95 0 0 0 20 12
        c0-4.42-3.58-8-8-8zm-6 8c0-1.02.26-1.98.73-2.82L5.24 7.69A7.95 7.95 0 0 0 4 12c0 4.42 3.58 8 8 8v2l4-3-4-3v2
        c-3.31 0-6-2.69-6-6z
      " />
    </svg>
  `;

  updateButtonState(button, video.loop);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();

    const newValue = !video.loop;
    perVideoOverride[id] = newValue;
    video.loop = newValue;

    updateButtonState(button, newValue);
  });

  return button;
}

function removeExistingLoopButtons(container) {
  const buttons = container.querySelectorAll(`.${LOOP_BUTTON_CLASS}`);
  buttons.forEach((btn) => btn.closest(`.${LOOP_BUTTON_WRAPPER_CLASS}`)?.remove());
}

function insertLoopButtonNearSettings(settingsButton) {
  if (!showButton) return;

  if (settingsButton.dataset.xtLoopInjected === "true") return;

  const root =
    settingsButton.closest('[data-testid="videoPlayer"]') ||
    settingsButton.closest("article") ||
    settingsButton.closest("div") ||
    document;

  const video = root.querySelector("video");
  if (!video) return;

  const settingsInner = settingsButton.parentElement;
  const settingsOuter = settingsInner?.parentElement;
  const row = settingsOuter?.parentElement;

  if (!row || !settingsOuter) return;

  removeExistingLoopButtons(row);

  const wrapper = document.createElement("div");
  wrapper.className = LOOP_BUTTON_WRAPPER_CLASS;

  const loopButton = createLoopButton(video);
  wrapper.appendChild(loopButton);

  row.insertBefore(wrapper, settingsOuter);

  settingsButton.dataset.xtLoopInjected = "true";
}

function refreshButtonsForAllPlayers() {
  const allSettingsButtons = document.querySelectorAll("button");

  allSettingsButtons.forEach((btn) => {
    if (!isSettingsButton(btn)) return;

    const settingsInner = btn.parentElement;
    const settingsOuter = settingsInner?.parentElement;
    const row = settingsOuter?.parentElement;
    if (!row) return;

    removeExistingLoopButtons(row);

    btn.dataset.xtLoopInjected = "false";

    if (showButton) {
      insertLoopButtonNearSettings(btn);
    }
  });
}

function initExistingVideos() {
  const videos = document.querySelectorAll("video");
  videos.forEach((video) => {
    getVideoId(video);
    applyEffectiveLoop(video);
  });
}

function applyAlwaysLoopToAllVideos() {
  const videos = document.querySelectorAll("video");
  videos.forEach((video) => {
    const id = getVideoId(video);
    if (perVideoOverride[id] === undefined) {
      video.loop = alwaysLoop;

      const button = document.querySelector(
        `button.${LOOP_BUTTON_CLASS}[data-video-id="${id}"]`
      );
      if (button) updateButtonState(button, video.loop);
    }
  });
}

function observeDom() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.tagName === "VIDEO") {
          const video = node;
          getVideoId(video);
          applyEffectiveLoop(video);
        } else {
          const vids = node.querySelectorAll("video");
          vids.forEach((v) => {
            getVideoId(v);
            applyEffectiveLoop(v);
          });
        }

        if (showButton) {
          if (node.tagName === "BUTTON" && isSettingsButton(node)) {
            insertLoopButtonNearSettings(node);
          }

          const buttons = node.querySelectorAll("button");
          buttons.forEach((btn) => {
            if (isSettingsButton(btn)) {
              insertLoopButtonNearSettings(btn);
            }
          });
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function loadSettingsAndStart() {
  if (!chrome.storage || !chrome.storage.sync) {
    initExistingVideos();
    observeDom();
    return;
  }

  chrome.storage.sync.get(
    { alwaysLoop: false, showButton: true },
    (result) => {
      alwaysLoop = Boolean(result.alwaysLoop);
      showButton = Boolean(result.showButton);

      initExistingVideos();
      observeDom();
      refreshButtonsForAllPlayers();
    }
  );

  if (chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;

      if (changes.alwaysLoop) {
        alwaysLoop = Boolean(changes.alwaysLoop.newValue);
        applyAlwaysLoopToAllVideos();
      }

      if (changes.showButton) {
        showButton = Boolean(changes.showButton.newValue);
        refreshButtonsForAllPlayers();
      }
    });
  }
}

loadSettingsAndStart();