// Spotify app client ID (public, not a secret). Create at https://developer.spotify.com/dashboard
// and add this page's URL (e.g. https://<project>.pages.dev/ and http://127.0.0.1:8788/) as a redirect URI.
const CLIENT_ID = "ad62d4a193134bd983d392c0c291ea92";
// Must match the dashboard entry byte-for-byte, so pin it to the site root rather than whatever
// path the browser happens to be on (/index.html, a trailing-slash-less URL, ...).
const REDIRECT_URI = location.origin + "/";
const SCOPES = "user-library-read";

// Slimmed down from the Spotify album object so the whole library fits in localStorage.
interface Album {
  name: string;
  artists: string;
  image: string;
  uri: string;
}

interface SpotifyAlbum {
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  uri: string;
}

const CACHE_KEY = "albums";
const REFRESH_KEY = "refresh";
const MAX_AGE = 24 * 60 * 60 * 1000;

const $ = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};
// `idle` marks the "N liked albums" line, which phones hide; loading and errors always show.
const setStatus = (msg: string, idle = false) => {
  $("status").textContent = msg;
  $("status").classList.toggle("idle", idle);
};

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function login() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  sessionStorage.setItem("verifier", verifier);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  location.href =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
}

// Access token lives in sessionStorage (1h); the refresh token in localStorage, so reopening the
// site gets a new one silently instead of bouncing through the authorize redirect again.
async function tokenRequest(body: Record<string, string>): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${await res.text()}`);
  const { access_token, expires_in, refresh_token } = await res.json();
  sessionStorage.setItem("token", access_token);
  sessionStorage.setItem("expires", String(Date.now() + expires_in * 1000));
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  return access_token;
}

async function getToken(): Promise<string | null> {
  const code = new URLSearchParams(location.search).get("code");
  if (code) {
    history.replaceState(null, "", REDIRECT_URI);
    return tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: sessionStorage.getItem("verifier") ?? "",
    });
  }

  const token = sessionStorage.getItem("token");
  if (token && Date.now() < Number(sessionStorage.getItem("expires"))) return token;

  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refresh }).catch(() => {
    localStorage.removeItem(REFRESH_KEY); // revoked or expired — fall back to the login button
    return null;
  });
}

function loadCache(): Album[] | null {
  try {
    const { at, albums } = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") ?? {};
    return albums && Date.now() - at < MAX_AGE ? albums : null;
  } catch {
    return null; // corrupt cache, just refetch
  }
}

function saveCache(albums: Album[]): Album[] {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), albums }));
  } catch {
    // ponytail: quota or private mode — the cache is an optimisation, not a requirement
  }
  return albums;
}

async function fetchAllAlbums(token: string): Promise<Album[]> {
  const albums: Album[] = [];
  let url: string | null = "https://api.spotify.com/v1/me/albums?limit=50";
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify API ${res.status}: ${await res.text()}`);
    const page: { items: { album: SpotifyAlbum }[]; next: string | null; total: number } = await res.json();
    albums.push(
      ...page.items.map(({ album }) => ({
        name: album.name,
        artists: album.artists.map((a) => a.name).join(", "),
        image: album.images[0]?.url ?? "",
        uri: album.uri,
      })),
    );
    setStatus(`Loading liked albums… ${albums.length}/${page.total}`);
    url = page.next;
  }
  return albums;
}

function pick<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function render(albums: Album[]) {
  $("albums").replaceChildren(
    ...pick(albums, 5).map((album) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = album.uri; // opens the Spotify app; external_urls.spotify for web player
      a.title = "Play in Spotify";
      const img = document.createElement("img");
      img.src = album.image;
      img.alt = "";
      const name = document.createElement("strong");
      name.textContent = album.name;
      const artists = document.createElement("span");
      artists.textContent = album.artists;
      a.append(img, name, artists);
      li.append(a);
      return li;
    }),
  );
}

async function main() {
  $("login").onclick = login;
  const token = await getToken();
  if (!token) {
    $("login").hidden = false;
    return;
  }
  let albums = loadCache() ?? saveCache(await fetchAllAlbums(token));

  const show = () => {
    setStatus(albums.length ? `${albums.length} liked albums. Pick one:` : "No liked albums.", albums.length > 0);
    render(albums);
  };

  $("reroll").hidden = false;
  $("who").hidden = false;
  $("logout").onclick = () => {
    localStorage.clear(); // refresh token + album cache
    sessionStorage.clear();
    location.reload();
  };
  // display_name is public profile data, so no extra scope needed. Cosmetic: on failure the name
  // just stays empty.
  fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json())
    .then((me) => ($("user").textContent = `Logged in as ${me.display_name || me.id}`))
    .catch(() => {});
  $("reroll").onclick = () => render(albums);
  $("refresh").onclick = () => {
    setStatus("Refreshing…");
    fetchAllAlbums(token)
      .then((fresh) => {
        albums = saveCache(fresh);
        show();
      })
      .catch((e) => setStatus(String(e)));
  };
  show();
}

main().catch((e) => setStatus(String(e)));
