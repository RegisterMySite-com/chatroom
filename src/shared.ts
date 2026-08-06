export type User = {
	id: string;
	name: string;
	avatar: string;
};

export type ChatMessage = {
	id: string;
	content: string;
	user: string; // display name
	avatar?: string;
	role: "user" | "assistant";
	timestamp?: number;
};

export type Message =
| {
	type: "add";
	id: string;
	content: string;
	user: string;
	avatar?: string;
	role: "user" | "assistant";
	timestamp?: number;
}
| {
	type: "update";
	id: string;
	content: string;
	user: string;
	avatar?: string;
	role: "user" | "assistant";
	timestamp?: number;
}
| {
	type: "all";
	messages: ChatMessage[];
}
| {
	type: "users";
	users: User[];
}
| {
	type: "user-joined";
	user: User;
}
| {
	type: "user-left";
	userId: string;
}
| {
	type: "identify";
	name: string;
	avatar: string;
}
| {
	type: "profile-update";
	name: string;
	avatar: string;
};

export const names = [
	"Alice",
"Bob",
"Charlie",
"David",
"Eve",
"Frank",
"Grace",
"Heidi",
"Ivan",
"Judy",
"Kevin",
"Linda",
"Mallory",
"Nancy",
"Oscar",
"Peggy",
"Quentin",
"Randy",
"Steve",
"Trent",
"Ursula",
"Victor",
"Walter",
"Xavier",
"Yvonne",
"Zoe",
];

// Curated modern avatar seeds for DiceBear (avataaars style)
export const avatarSeeds = [
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

export function getAvatarUrl(seed: string): string {
	return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
