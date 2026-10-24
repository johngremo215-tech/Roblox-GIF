const form = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const apiKeyInput = document.getElementById("apiKey");
const saveKeyButton = document.getElementById("saveKey");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

chrome.storage.local.get(["giphyApiKey"], ({ giphyApiKey }) => {
  if (giphyApiKey) apiKeyInput.value = giphyApiKey;
});

saveKeyButton.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    statusEl.textContent = "Paste your GIPHY API key first.";
    return;
  }
  await chrome.storage.local.set({ giphyApiKey: key });
  statusEl.textContent = "API key saved in this Chrome profile.";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;

  const { giphyApiKey } = await chrome.storage.local.get(["giphyApiKey"]);
  resultsEl.replaceChildren();

  if (!giphyApiKey) {
    statusEl.textContent = "Add a GIPHY API key in “GIF search setup” to load previews.";
    return;
  }

  statusEl.textContent = "Searching GIFs…";
  try {
    const url = new URL("https://api.giphy.com/v1/gifs/search");
    url.searchParams.set("api_key", giphyApiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "12");
    url.searchParams.set("rating", "g");
    url.searchParams.set("lang", "en");

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Search failed (${response.status}). Check your API key.`);
    const payload = await response.json();
    const gifs = (payload.data || []).filter(gif =>
      gif.images?.fixed_width?.url && gif.images?.original?.url
    );

    if (!gifs.length) {
      statusEl.textContent = "No GIFs found. Try another search.";
      return;
    }

    statusEl.textContent = `Found ${gifs.length} GIFs.`;
    for (const gif of gifs) {
      const card = document.createElement("article");
      card.className = "gif-card";

      const img = document.createElement("img");
      img.src = gif.images.fixed_width.url;
      img.alt = gif.title || "GIF preview";
      img.loading = "lazy";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Copy GIF link";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(gif.url || gif.images.original.url);
          statusEl.textContent = "GIF page link copied! Paste it where links are allowed.";
        } catch {
          statusEl.textContent = "Couldn't copy automatically. Open the GIF page instead.";
          window.open(gif.url, "_blank", "noopener");
        }
      });

      card.append(img, button);
      resultsEl.append(card);
    }
  } catch (error) {
    statusEl.textContent = error.message || "Something went wrong. Try again.";
  }
});