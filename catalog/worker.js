/**
 * RegisterMySite html-deploy catalog entry.
 *
 * Fetched by html-deploy as:
 *   https://raw.githubusercontent.com/RegisterMySite-com/chatroom/main/catalog/worker.js
 *
 * This is a single-file Worker (export default { fetch }) so the orchestrator
 * can deploy it without npm, Durable Objects, or the React/esbuild pipeline
 * used by the main repo (src/server + src/client).
 *
 * Bindings expected from the live-chat catalog program:
 *   CHAT_KV      KV namespace — message history
 *   ROOM_TITLE   string env   — default room title (optional)
 */

const MAX_MESSAGES = 200;
const MAX_NAME = 32;
const MAX_CONTENT = 2000;
const DEFAULT_ROOM = "lobby";

const AVATAR_SEEDS = [
  "Avery",
  "Jordan",
  "Riley",
  "Quinn",
  "Sage",
  "Morgan",
  "Casey",
  "Alex",
  "Jamie",
  "Taylor",
  "Cameron",
  "Reese",
  "Finley",
  "Hayden",
  "Parker",
  "Blake",
];

function avatarUrl(seed) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    seed || "Avery"
  )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function roomKey(room) {
  return `room:${room}:messages`;
}

function sanitizeRoom(raw) {
  const s = String(raw || DEFAULT_ROOM)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || DEFAULT_ROOM;
}

function id() {
  return crypto.randomUUID();
}

/** Best-effort live sockets in this isolate. History still lives in KV. */
const rooms = new Map();

function roomState(name) {
  let s = rooms.get(name);
  if (!s) {
    s = { sockets: new Set() };
    rooms.set(name, s);
  }
  return s;
}

function send(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    /* closed */
  }
}

function broadcast(room, payload, except) {
  const data = JSON.stringify(payload);
  for (const ws of roomState(room).sockets) {
    if (ws === except) continue;
    try {
      ws.send(data);
    } catch {
      roomState(room).sockets.delete(ws);
    }
  }
}

function onlineUsers(room) {
  const users = [];
  for (const ws of roomState(room).sockets) {
    if (ws._user?.name) users.push(ws._user);
  }
  return users;
}

async function loadMessages(env, room) {
  if (!env.CHAT_KV) return [];
  try {
    const raw = await env.CHAT_KV.get(roomKey(room));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMessages(env, room, messages) {
  if (!env.CHAT_KV) return;
  const trimmed = messages.slice(-MAX_MESSAGES);
  await env.CHAT_KV.put(roomKey(room), JSON.stringify(trimmed));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    if (url.pathname === "/health") {
      return json({
        ok: true,
        kv: Boolean(env.CHAT_KV),
        title: env.ROOM_TITLE || "Chat",
      });
    }

    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      return handleWs(request, env, url);
    }

    if (url.pathname === "/api/messages" && request.method === "GET") {
      const room = sanitizeRoom(url.searchParams.get("room"));
      return json({ room, messages: await loadMessages(env, room) });
    }

    if (url.pathname === "/api/messages" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid json" }, 400);
      }
      const room = sanitizeRoom(body.room || url.searchParams.get("room"));
      const content = String(body.content || "").trim().slice(0, MAX_CONTENT);
      const name = String(body.user || "Guest").trim().slice(0, MAX_NAME) || "Guest";
      const avatar = String(body.avatar || avatarUrl(name));
      if (!content) return json({ error: "empty" }, 400);
      const msg = {
        id: id(),
        type: "add",
        content,
        user: name,
        avatar,
        role: "user",
        timestamp: Date.now(),
      };
      const messages = await loadMessages(env, room);
      messages.push(msg);
      await saveMessages(env, room, messages);
      broadcast(room, msg);
      return json(msg, 201);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const title = env.ROOM_TITLE || "Chat";
      const room = sanitizeRoom(url.searchParams.get("room"));
      return new Response(renderPage(title, room), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleWs(request, env, url) {
  const room = sanitizeRoom(url.searchParams.get("room"));
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();

  const state = roomState(room);
  state.sockets.add(server);
  server._user = null;

  const history = await loadMessages(env, room);
  send(server, { type: "all", messages: history });
  send(server, { type: "users", users: onlineUsers(room) });

  server.addEventListener("message", async (event) => {
    let parsed;
    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (parsed.type === "identify" || parsed.type === "profile-update") {
      const name = String(parsed.name || "Guest").trim().slice(0, MAX_NAME) || "Guest";
      const seed = String(parsed.avatarSeed || parsed.seed || name);
      const avatar = String(parsed.avatar || avatarUrl(seed));
      const wasNew = !server._user?.name;
      server._user = { id: server._user?.id || id(), name, avatar };
      if (parsed.type === "identify" && wasNew) {
        broadcast(room, { type: "user-joined", user: server._user });
      }
      broadcast(room, { type: "users", users: onlineUsers(room) });
      return;
    }

    if (parsed.type === "add" || parsed.type === "update") {
      const name =
        String(parsed.user || server._user?.name || "Guest")
          .trim()
          .slice(0, MAX_NAME) || "Guest";
      const content = String(parsed.content || "").trim().slice(0, MAX_CONTENT);
      if (!content) return;
      const msg = {
        id: String(parsed.id || id()),
        type: "add",
        content,
        user: name,
        avatar: parsed.avatar || server._user?.avatar || avatarUrl(name),
        role: "user",
        timestamp: Number(parsed.timestamp) || Date.now(),
      };
      const messages = await loadMessages(env, room);
      const idx = messages.findIndex((m) => m.id === msg.id);
      if (idx >= 0) messages[idx] = msg;
      else messages.push(msg);
      await saveMessages(env, room, messages);
      broadcast(room, msg);
    }
  });

  const leave = () => {
    state.sockets.delete(server);
    if (server._user?.name) {
      broadcast(room, { type: "user-left", userId: server._user.id });
      broadcast(room, { type: "users", users: onlineUsers(room) });
    }
  };
  server.addEventListener("close", leave);
  server.addEventListener("error", leave);

  return new Response(null, { status: 101, webSocket: client });
}

function renderPage(title, room) {
  const seeds = JSON.stringify(AVATAR_SEEDS);
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(title)} — LiveChat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0c0c0e; --panel: #141417; --elev: #1c1c21; --hover: #2a2a32;
      --text: #f4f4f5; --muted: #a1a1aa; --dim: #71717a;
      --line: rgba(255,255,255,.08); --accent: #6366f1; --accent-2: #818cf8;
      --ok: #22c55e; --self: linear-gradient(135deg,#6366f1,#4f46e5);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); }
    body { display: flex; flex-direction: column; overflow: hidden; }
    .nav { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
      background: rgba(20,20,23,.8); backdrop-filter: blur(16px); border-bottom: 1px solid var(--line); }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 650; }
    .logo { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center;
      background: linear-gradient(135deg,#6366f1,#a855f7); box-shadow: 0 0 24px rgba(99,102,241,.35); }
    .badge { font: 12px ui-monospace, monospace; color: var(--muted); background: var(--elev);
      border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; cursor: pointer; }
    .status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; }
    .dot.on { background: var(--ok); box-shadow: 0 0 6px rgba(34,197,94,.5); }
    .body { flex: 1; display: flex; min-height: 0; }
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .msgs { flex: 1; overflow-y: auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 6px; }
    .empty { margin: auto; text-align: center; color: var(--muted); }
    .empty h3 { color: var(--text); margin: 8px 0 4px; }
    .row { display: flex; gap: 10px; max-width: 100%; animation: in .2s ease; }
    .row.self { flex-direction: row-reverse; }
    .row img { width: 32px; height: 32px; border-radius: 50%; margin-top: 16px; }
    .col { display: flex; flex-direction: column; max-width: min(70%, 520px); }
    .row.self .col { align-items: flex-end; }
    .meta { display: flex; gap: 8px; font-size: 12px; color: var(--muted); padding: 0 4px 3px; }
    .row.self .meta { flex-direction: row-reverse; }
    .bubble { padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.45; word-break: break-word; }
    .row:not(.self) .bubble { background: var(--elev); border: 1px solid var(--line); border-top-left-radius: 4px; }
    .row.self .bubble { background: var(--self); color: #fff; border-top-right-radius: 4px; }
    .input { padding: 12px 16px 16px; background: var(--panel); border-top: 1px solid var(--line); }
    form { display: flex; gap: 10px; background: #18181c; border: 1px solid var(--line); border-radius: 20px; padding: 6px 6px 6px 16px; }
    form:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    input[type=text] { flex: 1; background: transparent; border: 0; outline: 0; color: var(--text); font: 14px Inter, sans-serif; min-width: 0; }
    button.send { width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--accent); color: #fff; cursor: pointer; }
    button.send:disabled { opacity: .4; cursor: not-allowed; }
    .side { width: 260px; background: var(--panel); border-left: 1px solid var(--line); display: flex; flex-direction: column; }
    .side h2 { font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: var(--dim); padding: 16px; border-bottom: 1px solid var(--line); }
    .user { display: flex; align-items: center; gap: 10px; padding: 8px 14px; }
    .user img { width: 28px; height: 28px; border-radius: 50%; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 20; padding: 20px; }
    .modal { background: #222228; border: 1px solid rgba(255,255,255,.12); border-radius: 20px; width: min(420px,100%); padding: 28px; }
    .modal h2 { font-size: 20px; margin-bottom: 6px; }
    .modal p { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
    label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
    .modal input { width: 100%; padding: 11px 14px; background: #18181c; border: 1px solid var(--line); border-radius: 12px; color: var(--text); font: 14px Inter, sans-serif; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 18px; }
    .grid button { aspect-ratio: 1; border-radius: 12px; border: 2px solid transparent; background: var(--elev); overflow: hidden; cursor: pointer; padding: 0; }
    .grid button.sel { border-color: var(--accent); }
    .grid img { width: 100%; height: 100%; object-fit: cover; }
    .join { width: 100%; padding: 12px; border: 0; border-radius: 12px; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
    .foot { height: 36px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--dim); border-top: 1px solid var(--line); background: var(--panel); }
    @keyframes in { from { opacity: 0; transform: translateY(6px); } }
    @media (max-width: 800px) { .side { display: none; } }
  </style>
</head>
<body>
  <header class="nav">
    <div class="brand"><div class="logo">💬</div><span id="title">${escapeHtml(title)}</span></div>
    <button class="badge" id="roomBtn" title="Copy room link">${escapeHtml(room)}</button>
    <div class="status"><span class="dot" id="dot"></span><span id="st">connecting</span></div>
  </header>
  <div class="body">
    <section class="main">
      <div class="msgs" id="msgs"><div class="empty" id="empty"><div style="font-size:28px">💬</div><h3>No messages yet</h3><p>Say hello to start the room.</p></div></div>
      <div class="input"><form id="form"><input id="text" type="text" maxlength="2000" placeholder="Message…" autocomplete="off" disabled /><button class="send" id="send" disabled>➤</button></form></div>
    </section>
    <aside class="side">
      <h2>Online · <span id="count">0</span></h2>
      <div id="users"></div>
    </aside>
  </div>
  <footer class="foot">Powered by RegisterMySite · KV-backed LiveChat</footer>
  <div class="overlay" id="join">
    <div class="modal">
      <h2>Join ${escapeHtml(title)}</h2>
      <p>Pick a name and avatar. Identity stays in this browser.</p>
      <label>Display name</label>
      <input id="name" type="text" maxlength="32" placeholder="Your name" />
      <label>Avatar</label>
      <div class="grid" id="grid"></div>
      <button class="join" id="go">Join room</button>
    </div>
  </div>
  <script>
    const ROOM = ${JSON.stringify(room)};
    const SEEDS = ${seeds};
    const avatar = (s) => "https://api.dicebear.com/9.x/avataaars/svg?seed=" + encodeURIComponent(s) + "&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
    const $ = (id) => document.getElementById(id);
    let me = null, seed = SEEDS[Math.floor(Math.random()*SEEDS.length)], ws, selfName = "";

    SEEDS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<img alt="" src="' + avatar(s) + '">';
      if (s === seed) b.classList.add("sel");
      b.onclick = () => { seed = s; document.querySelectorAll("#grid button").forEach(x => x.classList.toggle("sel", x === b)); };
      $("grid").appendChild(b);
    });

    const saved = localStorage.getItem("rms-chat-id");
    if (saved) {
      try { me = JSON.parse(saved); $("name").value = me.name; seed = me.seed || seed; } catch {}
    }

    $("go").onclick = () => {
      const name = ($("name").value || "").trim().slice(0,32);
      if (!name) { $("name").focus(); return; }
      me = { name, seed, avatar: avatar(seed) };
      localStorage.setItem("rms-chat-id", JSON.stringify(me));
      selfName = name;
      $("join").style.display = "none";
      $("text").disabled = false; $("send").disabled = false; $("text").focus();
      identify();
    };

    $("roomBtn").onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); $("roomBtn").textContent = "copied"; setTimeout(() => $("roomBtn").textContent = ROOM, 1200); } catch {}
    };

    function setStatus(ok, label) {
      $("dot").classList.toggle("on", ok);
      $("st").textContent = label;
    }

    function identify() {
      if (ws && ws.readyState === 1 && me) ws.send(JSON.stringify({ type: "identify", name: me.name, avatar: me.avatar, avatarSeed: me.seed }));
    }

    function connect() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(proto + "://" + location.host + "/ws?room=" + encodeURIComponent(ROOM));
      ws.onopen = () => { setStatus(true, "connected"); identify(); };
      ws.onclose = () => { setStatus(false, "reconnecting"); setTimeout(connect, 1500); };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.type === "all") { $("msgs").innerHTML = ""; m.messages.forEach(renderMsg); if (!m.messages.length) showEmpty(); }
        else if (m.type === "add" || m.type === "update") renderMsg(m);
        else if (m.type === "users") renderUsers(m.users || []);
      };
    }
    connect();

    function showEmpty() {
      if (![...$("msgs").children].some(el => el.classList.contains("row"))) {
        $("msgs").innerHTML = '<div class="empty" id="empty"><div style="font-size:28px">💬</div><h3>No messages yet</h3><p>Say hello to start the room.</p></div>';
      }
    }
    function renderMsg(m) {
      const empty = $("empty"); if (empty) empty.remove();
      if (document.querySelector('[data-id="' + CSS.escape(m.id || "") + '"]')) return;
      const self = m.user === selfName;
      const row = document.createElement("div");
      row.className = "row" + (self ? " self" : "");
      row.dataset.id = m.id || "";
      const t = new Date(m.timestamp || Date.now());
      const hh = String(t.getHours()).padStart(2,"0") + ":" + String(t.getMinutes()).padStart(2,"0");
      row.innerHTML = '<img alt="" src="' + (m.avatar || avatar(m.user||"Guest")) + '"><div class="col"><div class="meta"><strong style="color:var(--text)">' +
        escapeHtml(m.user||"Guest") + '</strong><span>' + hh + '</span></div><div class="bubble"></div></div>';
      row.querySelector(".bubble").textContent = m.content || "";
      $("msgs").appendChild(row);
      $("msgs").scrollTop = $("msgs").scrollHeight;
    }
    function renderUsers(users) {
      $("count").textContent = users.length;
      $("users").innerHTML = users.map(u =>
        '<div class="user"><img alt="" src="' + (u.avatar||avatar(u.name)) + '"><span>' + escapeHtml(u.name||"") +
        (u.name===selfName ? ' <span style="color:var(--accent);font-size:11px">you</span>' : "") + "</span></div>"
      ).join("");
    }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c])); }

    $("form").onsubmit = (e) => {
      e.preventDefault();
      const content = $("text").value.trim();
      if (!content || !me || !ws || ws.readyState !== 1) return;
      ws.send(JSON.stringify({ type: "add", id: crypto.randomUUID(), content, user: me.name, avatar: me.avatar, role: "user", timestamp: Date.now() }));
      $("text").value = "";
    };
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[c])
  );
}
