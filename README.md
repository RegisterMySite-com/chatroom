# Durable Chat App

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RegisterMySite/chatroom)

![Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/da00d330-9a3b-40a2-e6df-b08813fb7200/public)

# LiveChat UI Redesign — Integration Guide

This redesign turns the official Cloudflare `durable-chat-template` into a modern, polished real-time chat app with:

- Glassmorphic top navbar (logo, copyable room ID, profile dropdown)
- Online users sidebar (desktop) / drawer (mobile)
- Beautiful message bubbles with avatars + timestamps
- Join modal for name + curated avatar picker
- Dark mode by default + light mode toggle
- Profile editing, room link copy, leave room
- Smooth animations and fully responsive layout

## Files to replace / add

Copy these files into your project root (matching the official template structure):

```
public/
  index.html          ← replace
  styles.css          ← replace (you can delete css/normalize.css + css/skeleton.css)

src/
  shared.ts           ← replace (extended types + avatars)
  server/
    index.ts          ← replace (presence + enriched messages)
  client/
    index.tsx         ← replace (full new UI)
```

## What changed on the server

- Extended `ChatMessage` with optional `avatar` and `timestamp`
- New message types: `users`, `user-joined`, `user-left`, `identify`, `profile-update`
- Connection state stores `{ name, avatar }`
- `onConnect` sends history + current online users
- `onClose` broadcasts leave events
- Messages are enriched with the sender’s avatar before storage/broadcast
- SQL schema now includes `avatar` and `timestamp` columns (with safe migration)

**Existing chat history continues to work.** Old messages without avatars simply fall back to a letter avatar.

## Client features

| Feature | Details |
|---------|---------|
| **Join flow** | Modal appears on first visit. Name + 16 DiceBear avatars. Identity saved in `localStorage`. |
| **Navbar** | Logo · Room ID badge (click to copy) · Profile menu (edit / copy link / theme / leave) |
| **Sidebar** | “Online now” list with avatars + green dots. Collapsible on mobile. |
| **Messages** | Distinct self vs others bubbles, avatar, name, timestamp, auto-scroll, empty state. |
| **Theme** | Dark default. Toggle persists in `localStorage` (`chat-theme`). |
| **Footer** | Minimal “Powered by Cloudflare Durable Objects” + placeholder links. |

## Running

```bash
npm install          # if needed
npm run dev          # wrangler dev
```

The build command in `wrangler.json` already points at `src/client/index.tsx` — no change required.

## Optional polish you can add later

- Typing indicators (extend presence with a `typing` flag)
- Message reactions
- Markdown / link previews
- Sound on new message
- Emoji picker (the input bar is ready for it)

Enjoy your production-ready LiveChat! 🚀

