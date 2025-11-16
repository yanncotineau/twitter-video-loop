document.addEventListener("DOMContentLoaded", () => {
  const alwaysLoop = document.getElementById("alwaysLoop");
  const showButton = document.getElementById("showButton");

  if (!chrome.storage || !chrome.storage.sync) {
    alwaysLoop.disabled = true;
    showButton.disabled = true;
    return;
  }

  chrome.storage.sync.get(
    { alwaysLoop: false, showButton: true },
    (result) => {
      alwaysLoop.checked = Boolean(result.alwaysLoop);
      showButton.checked = Boolean(result.showButton);
    }
  );

  alwaysLoop.addEventListener("change", () => {
    chrome.storage.sync.set({ alwaysLoop: alwaysLoop.checked });
  });

  showButton.addEventListener("change", () => {
    chrome.storage.sync.set({ showButton: showButton.checked });
  });
});
