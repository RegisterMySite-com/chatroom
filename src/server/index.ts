import {
	type Connection,
	Server,
	type WSMessage,
	routePartykitRequest,
} from "partyserver";

import type { ChatMessage, Message, User } from "../shared";

type ConnectionState = {
	name?: string;
	avatar?: string;
};

export class Chat extends Server<Env> {
	static options = { hibernate: true };

	messages = [] as ChatMessage[];

	broadcastMessage(message: Message, exclude?: string[]) {
		this.broadcast(JSON.stringify(message), exclude);
	}

	getOnlineUsers(): User[] {
		const users: User[] = [];
		for (const conn of this.getConnections()) {
			const state = conn.state as ConnectionState | null;
			if (state?.name && state?.avatar) {
				users.push({
					id: conn.id,
					name: state.name,
					avatar: state.avatar,
				});
			}
		}
		return users;
	}

	broadcastUsers(exclude?: string[]) {
		this.broadcastMessage(
			{
				type: "users",
				users: this.getOnlineUsers(),
			},
			exclude,
		);
	}

	onStart() {
		// create the messages table if it doesn't exist
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS messages (
				id TEXT PRIMARY KEY,
				user TEXT,
				role TEXT,
				content TEXT,
				avatar TEXT,
				timestamp INTEGER
			)`,
		);

		// migrate if old schema (no avatar/timestamp) — ignore errors
		try {
			this.ctx.storage.sql.exec(
				`ALTER TABLE messages ADD COLUMN avatar TEXT`,
			);
		} catch {
			/* column may already exist */
		}
		try {
			this.ctx.storage.sql.exec(
				`ALTER TABLE messages ADD COLUMN timestamp INTEGER`,
			);
		} catch {
			/* column may already exist */
		}

		// load the messages from the database
		this.messages = this.ctx.storage.sql
		.exec(`SELECT * FROM messages ORDER BY timestamp ASC`)
		.toArray() as ChatMessage[];
	}

	onConnect(connection: Connection) {
		// Send chat history
		connection.send(
			JSON.stringify({
				type: "all",
				messages: this.messages,
			} satisfies Message),
		);

		// Send current users (identified ones)
		connection.send(
			JSON.stringify({
				type: "users",
				users: this.getOnlineUsers(),
			} satisfies Message),
		);
	}

	onClose(connection: Connection) {
		const state = connection.state as ConnectionState | null;
		if (state?.name) {
			this.broadcastMessage({
				type: "user-left",
				userId: connection.id,
			});
			// also send full list for safety
			this.broadcastUsers([connection.id]);
		}
	}

	saveMessage(message: ChatMessage) {
		const existingMessage = this.messages.find((m) => m.id === message.id);
		if (existingMessage) {
			this.messages = this.messages.map((m) =>
			m.id === message.id ? message : m,
			);
		} else {
			this.messages.push(message);
		}

		this.ctx.storage.sql.exec(
			`INSERT INTO messages (id, user, role, content, avatar, timestamp)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT (id) DO UPDATE SET
			content = excluded.content,
			user = excluded.user,
			avatar = excluded.avatar`,
			message.id,
			message.user,
			message.role,
			message.content,
			message.avatar ?? null,
			message.timestamp ?? Date.now(),
		);
	}

	onMessage(connection: Connection, message: WSMessage) {
		const parsed = JSON.parse(message as string) as Message;

		if (parsed.type === "identify" || parsed.type === "profile-update") {
			const prevState = (connection.state as ConnectionState) || {};
			connection.setState({
				name: parsed.name,
				avatar: parsed.avatar,
			});

			const user: User = {
				id: connection.id,
				name: parsed.name,
				avatar: parsed.avatar,
			};

			if (parsed.type === "identify" && !prevState.name) {
				this.broadcastMessage({
					type: "user-joined",
					user,
				});
			}

			this.broadcastUsers();
			return;
		}

		if (parsed.type === "add" || parsed.type === "update") {
			// Enrich with connection's avatar if available
			const state = connection.state as ConnectionState | null;
			const enriched: ChatMessage = {
				id: parsed.id,
				content: parsed.content,
				user: parsed.user,
				avatar: parsed.avatar || state?.avatar,
				role: parsed.role,
				timestamp: parsed.timestamp ?? Date.now(),
			};

			this.saveMessage(enriched);

			// Broadcast the enriched message
			this.broadcast(
				JSON.stringify({
					type: parsed.type,
					...enriched,
				} satisfies Message),
			);
			return;
		}

		// Fallback: just broadcast
		this.broadcast(message);
	}
}

export default {
	async fetch(request, env) {
		return (
			(await routePartykitRequest(request, { ...env })) ||
			env.ASSETS.fetch(request)
		);
	},
} satisfies ExportedHandler<Env>;
