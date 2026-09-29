// Spotify app client ID (public, not a secret). Create at https://developer.spotify.com/dashboard
// and add this page's URL (e.g. https://<project>.pages.dev/ and http://127.0.0.1:8788/) as a redirect URI.
const CLIENT_ID = "ad62d4a193134bd983d392c0c291ea92";
const REDIRECT_URI = location.origin + location.pathname;
const SCOPES = "user-library-read";

interface Album {
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  external_urls: { spotify: string };
  uri: string;
}

const $ = (id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};
const setStatus = (msg: string) => ($("status").textContent = msg);

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

// ponytail: token lives in sessionStorage, no refresh — expires after 1h, just log in again.
async function getToken(): Promise<string | null> {
  const code = new URLSearchParams(location.search).get("code");
  if (code) {
    history.replaceState(null, "", REDIRECT_URI);
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: sessionStorage.getItem("verifier") ?? "",
      }),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
    const { access_token, expires_in } = await res.json();
    sessionStorage.setItem("token", access_token);
    sessionStorage.setItem("expires", String(Date.now() + expires_in * 1000));
  }
  const token = sessionStorage.getItem("token");
  return token && Date.now() < Number(sessionStorage.getItem("expires")) ? token : null;
}

async function fetchAllAlbums(token: string): Promise<Album[]> {
  const albums: Album[] = [];
  let url: string | null = "https://api.spotify.com/v1/me/albums?limit=50";
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Spotify API ${res.status}: ${await res.text()}`);
    const page: { items: { album: Album }[]; next: string | null; total: number } = await res.json();
    albums.push(...page.items.map((i) => i.album));
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
      img.src = album.images[0]?.url ?? "";
      img.alt = "";
      const name = document.createElement("strong");
      name.textContent = album.name;
      const artists = document.createElement("span");
      artists.textContent = album.artists.map((x) => x.name).join(", ");
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
  const albums = await fetchAllAlbums(token);
  setStatus(`${albums.length} liked albums. Pick one:`);
  if (!albums.length) return;
  $("reroll").hidden = false;
  $("reroll").onclick = () => render(albums);
  render(albums);
}

main().catch((e) => setStatus(String(e)));
