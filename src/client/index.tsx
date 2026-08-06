import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
	useNavigate,
} from "react-router";
import { nanoid } from "nanoid";

import {
	names,
	avatarSeeds,
	getAvatarUrl,
	type ChatMessage,
	type Message,
	type User,
} from "../shared";

/* ============================================================
 *   Icons (inline SVGs – zero deps)
 *   ============================================================ */
const Icons = {
	Copy: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
		<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	),
	Users: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	),
	Send: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="m22 2-7 20-4-9-9-4Z" />
		<path d="M22 2 11 13" />
		</svg>
	),
	Sun: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2" />
		<path d="M12 20v2" />
		<path d="m4.93 4.93 1.41 1.41" />
		<path d="m17.66 17.66 1.41 1.41" />
		<path d="M2 12h2" />
		<path d="M20 12h2" />
		<path d="m6.34 17.66-1.41 1.41" />
		<path d="m19.07 4.93-1.41 1.41" />
		</svg>
	),
	Moon: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
		</svg>
	),
	LogOut: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
		<polyline points="16 17 21 12 16 7" />
		<line x1="21" x2="9" y1="12" y2="12" />
		</svg>
	),
	User: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
		<circle cx="12" cy="7" r="4" />
		</svg>
	),
	Edit: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
		<path d="m15 5 4 4" />
		</svg>
	),
	Link: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
		<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	),
	ChevronDown: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		width="14"
		height="14"
		>
		<path d="m6 9 6 6 6-6" />
		</svg>
	),
	X: () => (
		<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		>
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
		</svg>
	),
};

/* ============================================================
 *   Helpers
 *   ============================================================ */
function formatTimestamp(ts?: number) {
	if (!ts) return "";
	const d = new Date(ts);
	const now = new Date();

	const time = d.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});

	// Always include a permanent date + time stamp
	const isToday =
	d.getFullYear() === now.getFullYear() &&
	d.getMonth() === now.getMonth() &&
	d.getDate() === now.getDate();

	if (isToday) {
		// Today → "Today · 2:34 PM"
		return `Today · ${time}`;
	}

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const isYesterday =
	d.getFullYear() === yesterday.getFullYear() &&
	d.getMonth() === yesterday.getMonth() &&
	d.getDate() === yesterday.getDate();

	if (isYesterday) {
		// Yesterday → "Yesterday · 2:34 PM"
		return `Yesterday · ${time}`;
	}

	// Same year → "Aug 5 · 2:34 PM"
	if (d.getFullYear() === now.getFullYear()) {
		const date = d.toLocaleDateString([], {
			month: "short",
			day: "numeric",
		});
		return `${date} · ${time}`;
	}

	// Different year → "Aug 5, 2025 · 2:34 PM"
	const date = d.toLocaleDateString([], {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	return `${date} · ${time}`;
}

function useTheme() {
	const [theme, setTheme] = useState<"dark" | "light">(() => {
		if (typeof window === "undefined") return "dark";
		const stored = localStorage.getItem("chat-theme") as "dark" | "light" | null;
		return stored || "dark";
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("chat-theme", theme);
	}, [theme]);

	const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
	return { theme, toggle };
}

function useToast() {
	const [toast, setToast] = useState<string | null>(null);
	const show = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 2200);
	}, []);
	return { toast, show };
}

/* ============================================================
 *   Join / Profile Modal
 *   ============================================================ */
function ProfileModal({
	initialName,
	initialAvatar,
	onSubmit,
	title = "Welcome to LiveChat",
	subtitle = "Pick a display name and avatar to join the room.",
	submitLabel = "Join Chat",
}: {
	initialName: string;
	initialAvatar: string;
	onSubmit: (name: string, avatar: string) => void;
	title?: string;
	subtitle?: string;
	submitLabel?: string;
}) {
	const [name, setName] = useState(initialName);
	const [avatar, setAvatar] = useState(initialAvatar);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onSubmit(trimmed, avatar);
	};

	return (
		<div className="modal-overlay">
		<div className="modal">
		<h2>{title}</h2>
		<p className="subtitle">{subtitle}</p>
		<form onSubmit={handleSubmit}>
		<div className="form-group">
		<label htmlFor="display-name">Display Name</label>
		<input
		id="display-name"
		type="text"
		value={name}
		onChange={(e) => setName(e.target.value)}
		placeholder="Enter your name…"
		maxLength={24}
		autoFocus
		autoComplete="off"
		/>
		</div>
		<div className="form-group">
		<label>Avatar</label>
		<div className="avatar-grid">
		{avatarSeeds.map((seed) => {
			const url = getAvatarUrl(seed);
			return (
				<button
				key={seed}
				type="button"
				className={`avatar-option ${avatar === url ? "selected" : ""}`}
				onClick={() => setAvatar(url)}
				title={seed}
				>
				<img src={url} alt={seed} />
				</button>
			);
		})}
		</div>
		</div>
		<div className="modal-actions">
		<button
		type="submit"
		className="btn btn-primary"
		disabled={!name.trim()}
		>
		{submitLabel}
		</button>
		</div>
		</form>
		</div>
		</div>
	);
}

/* ============================================================
 *   Navbar
 *   ============================================================ */
function Navbar({
	room,
	user,
	usersCount,
	theme,
	onToggleTheme,
	onChangeProfile,
	onCopyRoom,
	onLeave,
	onToggleSidebar,
}: {
	room: string;
	user: User | null;
	usersCount: number;
	theme: "dark" | "light";
	onToggleTheme: () => void;
	onChangeProfile: () => void;
	onCopyRoom: () => void;
	onLeave: () => void;
	onToggleSidebar: () => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<header className="navbar">
		<div className="navbar-left">
		<div className="logo">💬</div>
		<span className="logo-text">LiveChat</span>
		</div>

		<div className="navbar-center">
		<button className="room-badge" onClick={onCopyRoom} title="Copy room ID">
		<span className="room-id">{room}</span>
		<Icons.Copy />
		</button>
		</div>

		<div className="navbar-right">
		<button
		className="sidebar-toggle"
		onClick={onToggleSidebar}
		title="Online users"
		aria-label="Toggle online users"
		>
		<Icons.Users />
		</button>

		<div className="profile-menu" ref={ref} style={{ position: "relative" }}>
		<button
		className="profile-btn"
		onClick={() => setOpen((o) => !o)}
		aria-expanded={open}
		>
		{user ? (
			<>
			<div className="avatar-wrap">
			<img className="avatar" src={user.avatar} alt={user.name} />
			<span className="online-dot" />
			</div>
			<span className="profile-name">{user.name}</span>
			<Icons.ChevronDown />
			</>
		) : (
			<span className="profile-name">Connecting…</span>
		)}
		</button>

		{open && user && (
			<div className="dropdown">
			<div className="dropdown-header">
			<div className="name">{user.name}</div>
			<div className="sub">You</div>
			</div>
			<button
			className="dropdown-item"
			onClick={() => {
				setOpen(false);
				onChangeProfile();
			}}
			>
			<Icons.Edit />
			Change name & avatar
			</button>
			<button
			className="dropdown-item"
			onClick={() => {
				setOpen(false);
				onCopyRoom();
			}}
			>
			<Icons.Link />
			Copy room link
			</button>
			<button
			className="dropdown-item"
			onClick={() => {
				setOpen(false);
				onToggleTheme();
			}}
			>
			{theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
			{theme === "dark" ? "Light mode" : "Dark mode"}
			</button>
			<div className="dropdown-divider" />
			<button
			className="dropdown-item danger"
			onClick={() => {
				setOpen(false);
				onLeave();
			}}
			>
			<Icons.LogOut />
			Leave room
			</button>
			</div>
		)}
		</div>
		</div>
		</header>
	);
}

/* ============================================================
 *   Online Users Sidebar
 *   ============================================================ */
function VisitorsPanel({
	users,
	selfId,
	open,
	onClose,
}: {
	users: User[];
	selfId: string | null;
	open: boolean;
	onClose: () => void;
}) {
	return (
		<>
		<div
		className={`sidebar-overlay ${open ? "open" : ""}`}
		onClick={onClose}
		/>
		<aside className={`sidebar ${open ? "open" : ""}`}>
		<div className="sidebar-header">
		<div className="sidebar-title">
		Online now
		<span className="online-count">{users.length}</span>
		</div>
		<button
		className="sidebar-toggle"
		onClick={onClose}
		aria-label="Close"
		style={{ display: "grid" }}
		>
		<Icons.X />
		</button>
		</div>
		<div className="sidebar-list">
		{users.length === 0 && (
			<div
			style={{
				padding: "24px 12px",
				textAlign: "center",
				color: "var(--text-muted)",
								fontSize: 13,
			}}
			>
			No one else is here yet.
			<br />
			Share the room link!
			</div>
		)}
		{users.map((u) => (
			<div key={u.id} className="user-item">
			<div className="avatar-wrap">
			<img className="avatar" src={u.avatar} alt={u.name} />
			<span className="online-dot" />
			</div>
			<span className="name">
			{u.name}
			{u.id === selfId && <span className="you-badge">you</span>}
			</span>
			</div>
		))}
		</div>
		</aside>
		</>
	);
}

/* ============================================================
 *   Message List
 *   ============================================================ */
function MessageList({
	messages,
	selfName,
}: {
	messages: ChatMessage[];
	selfName: string;
}) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (messages.length === 0) {
		return (
			<div className="messages">
			<div className="empty-state">
			<div className="icon">✨</div>
			<h3>No messages yet</h3>
			<p>
			Say hello! Messages are stored in a Durable Object and synced in
			real-time to everyone in this room.
			</p>
			</div>
			</div>
		);
	}

	return (
		<div className="messages">
		{messages.map((m) => {
			const isSelf = m.user === selfName;
			return (
				<div
				key={m.id}
				className={`message-row ${isSelf ? "self" : ""}`}
				>
				{!isSelf && m.avatar && (
					<img className="message-avatar" src={m.avatar} alt={m.user} />
				)}
				{!isSelf && !m.avatar && (
					<div
					className="message-avatar"
					style={{
						background: "var(--bg-tertiary)",
										  display: "grid",
										  placeItems: "center",
										  fontSize: 12,
										  fontWeight: 600,
										  color: "var(--text-muted)",
					}}
					>
					{m.user.slice(0, 1).toUpperCase()}
					</div>
				)}
				<div className="message-body">
				<div className="message-meta">
				<span className="message-author">{m.user}</span>
				<span className="message-time" title={m.timestamp ? new Date(m.timestamp).toLocaleString() : undefined}>
				{formatTimestamp(m.timestamp)}
				</span>
				</div>
				<div className="bubble">{m.content}</div>
				</div>
				{isSelf && m.avatar && (
					<img className="message-avatar" src={m.avatar} alt={m.user} />
				)}
				</div>
			);
		})}
		<div ref={bottomRef} />
		</div>
	);
}

/* ============================================================
 *   Input Bar
 *   ============================================================ */
function InputBar({
	onSend,
	disabled,
	placeholder,
}: {
	onSend: (text: string) => void;
	disabled?: boolean;
	placeholder?: string;
}) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = value.trim();
		if (!text || disabled) return;
		onSend(text);
		setValue("");
		inputRef.current?.focus();
	};

	return (
		<div className="input-bar">
		<form className="input-form" onSubmit={submit}>
		<input
		ref={inputRef}
		type="text"
		value={value}
		onChange={(e) => setValue(e.target.value)}
		placeholder={placeholder || "Type a message…"}
		autoComplete="off"
		disabled={disabled}
		/>
		<button
		type="submit"
		className="send-btn"
		disabled={disabled || !value.trim()}
		aria-label="Send"
		>
		<Icons.Send />
		</button>
		</form>
		</div>
	);
}

/* ============================================================
 *   Footer
 *   ============================================================ */
function Footer() {
	return (
		<footer className="footer">
		<span>Powered by Cloudflare Durable Objects</span>
		<span className="footer-sep">·</span>
		<a href="https://registermysite.com/privacy" onClick={(e) => e.preventDefault()}>
		Privacy
		</a>
		<span className="footer-sep">·</span>
		<a href="https://registermysite.com/terms" onClick={(e) => e.preventDefault()}>
		Terms
		</a>
		<span className="footer-sep">·</span>
		<a href="https://github.com/registermysite-com" onClick={(e) => e.preventDefault()}>
		GitHub
		</a>
		</footer>
	);
}

/* ============================================================
 *   Main App (per room)
 *   ============================================================ */
function App() {
	const { room } = useParams() as { room: string };
	const navigate = useNavigate();
	const { theme, toggle: toggleTheme } = useTheme();
	const { toast, show: showToast } = useToast();

	// Local identity (persisted lightly)
	const [identity, setIdentity] = useState<{
		name: string;
		avatar: string;
	} | null>(() => {
		try {
			const raw = localStorage.getItem("chat-identity");
			if (raw) return JSON.parse(raw);
		} catch {}
		return null;
	});

	const [showJoin, setShowJoin] = useState(!identity);
	const [showProfileEdit, setShowProfileEdit] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [selfId, setSelfId] = useState<string | null>(null);
	const [connected, setConnected] = useState(false);

	const defaultName = useMemo(
		() => names[Math.floor(Math.random() * names.length)],
								[],
	);
	const defaultAvatar = useMemo(
		() => getAvatarUrl(avatarSeeds[Math.floor(Math.random() * avatarSeeds.length)]),
								  [],
	);

	const socket = usePartySocket({
		party: "chat",
		room,
		onOpen() {
			setConnected(true);
			setSelfId(socket.id ?? null);
			// Re-identify on reconnect
			if (identity) {
				socket.send(
					JSON.stringify({
						type: "identify",
						name: identity.name,
						avatar: identity.avatar,
					} satisfies Message),
				);
			}
		},
		onClose() {
			setConnected(false);
		},
		onMessage(evt) {
			const message = JSON.parse(evt.data as string) as Message;

			if (message.type === "add") {
				setMessages((prev) => {
					const idx = prev.findIndex((m) => m.id === message.id);
					const chatMsg: ChatMessage = {
						id: message.id,
						content: message.content,
						user: message.user,
						avatar: message.avatar,
						role: message.role,
						timestamp: message.timestamp,
					};
					if (idx === -1) return [...prev, chatMsg];
					const next = [...prev];
					next[idx] = chatMsg;
					return next;
				});
			} else if (message.type === "update") {
				setMessages((prev) =>
				prev.map((m) =>
				m.id === message.id
				? {
					id: message.id,
					content: message.content,
					user: message.user,
					avatar: message.avatar,
					role: message.role,
					timestamp: message.timestamp,
				}
				: m,
				),
				);
			} else if (message.type === "all") {
				setMessages(message.messages);
			} else if (message.type === "users") {
				setUsers(message.users);
			} else if (message.type === "user-joined") {
				setUsers((prev) => {
					if (prev.some((u) => u.id === message.user.id)) return prev;
					return [...prev, message.user];
				});
			} else if (message.type === "user-left") {
				setUsers((prev) => prev.filter((u) => u.id !== message.userId));
			}
		},
	});

	// Identify when identity is set and socket is ready
	useEffect(() => {
		if (identity && connected && socket.readyState === WebSocket.OPEN) {
			socket.send(
				JSON.stringify({
					type: "identify",
					name: identity.name,
					avatar: identity.avatar,
				} satisfies Message),
			);
		}
	}, [identity, connected]);

	const handleJoin = (name: string, avatar: string) => {
		const id = { name, avatar };
		setIdentity(id);
		localStorage.setItem("chat-identity", JSON.stringify(id));
		setShowJoin(false);
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(
				JSON.stringify({
					type: "identify",
					name,
					avatar,
				} satisfies Message),
			);
		}
	};

	const handleProfileUpdate = (name: string, avatar: string) => {
		const id = { name, avatar };
		setIdentity(id);
		localStorage.setItem("chat-identity", JSON.stringify(id));
		setShowProfileEdit(false);
		socket.send(
			JSON.stringify({
				type: "profile-update",
				name,
				avatar,
			} satisfies Message),
		);
		showToast("Profile updated");
	};

	const handleSend = (content: string) => {
		if (!identity) return;
		const chatMessage: ChatMessage = {
			id: nanoid(8),
			content,
			user: identity.name,
			avatar: identity.avatar,
			role: "user",
			timestamp: Date.now(),
		};
		// Optimistic
		setMessages((prev) => [...prev, chatMessage]);
		socket.send(
			JSON.stringify({
				type: "add",
				...chatMessage,
			} satisfies Message),
		);
	};

	const copyRoomLink = () => {
		const url = window.location.href;
		navigator.clipboard.writeText(url).then(() => {
			showToast("Room link copied!");
		});
	};

	const leaveRoom = () => {
		localStorage.removeItem("chat-identity");
		navigate("/");
	};

	const currentUser: User | null = identity
	? {
		id: selfId || "self",
		name: identity.name,
		avatar: identity.avatar,
	}
	: null;

	return (
		<div className="app">
		{showJoin && (
			<ProfileModal
			initialName={defaultName}
			initialAvatar={defaultAvatar}
			onSubmit={handleJoin}
			/>
		)}
		{showProfileEdit && identity && (
			<ProfileModal
			initialName={identity.name}
			initialAvatar={identity.avatar}
			onSubmit={handleProfileUpdate}
			title="Edit profile"
			subtitle="Update your display name or avatar."
			submitLabel="Save changes"
			/>
		)}

		<Navbar
		room={room}
		user={currentUser}
		usersCount={users.length}
		theme={theme}
		onToggleTheme={toggleTheme}
		onChangeProfile={() => setShowProfileEdit(true)}
		onCopyRoom={copyRoomLink}
		onLeave={leaveRoom}
		onToggleSidebar={() => setSidebarOpen((o) => !o)}
		/>

		<div className="app-body">
		<div className="chat-main">
		<div
		className="connection-status"
		style={{ padding: "6px 16px 0", fontSize: 11 }}
		>
		<span
		className={`status-dot ${connected ? "connected" : "connecting"}`}
		/>
		{connected ? "Connected" : "Connecting…"}
		</div>

		<MessageList
		messages={messages}
		selfName={identity?.name || ""}
		/>

		<InputBar
		onSend={handleSend}
		disabled={!identity || !connected}
		placeholder={
			identity
			? `Message as ${identity.name}…`
			: "Join the room to chat…"
		}
		/>
		</div>

		<VisitorsPanel
		users={users}
		selfId={selfId}
		open={sidebarOpen}
		onClose={() => setSidebarOpen(false)}
		/>
		</div>

		<Footer />

		{toast && <div className="toast">{toast}</div>}
		</div>
	);
}

/* ============================================================
 *   Entry
 *   ============================================================ */
createRoot(document.getElementById("root")!).render(
	<BrowserRouter>
	<Routes>
	<Route path="/" element={<Navigate to={`/${nanoid(10)}`} replace />} />
	<Route path="/:room" element={<App />} />
	<Route path="*" element={<Navigate to="/" replace />} />
	</Routes>
	</BrowserRouter>,
);
