<div align="center">

# SoundCloud Desktop Client

[![SoundCloud](https://img.shields.io/badge/SoundCloud-FF5500?style=for-the-badge&logo=soundcloud&logoColor=white)](https://soundcloud.com)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Author](https://img.shields.io/badge/Author-domxay-ff0055?style=for-the-badge)](https://t.me/codesand)
[![Telegram](https://img.shields.io/badge/Telegram-@codesand-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/codesand)

[English](README.md) | [Русский](README_RU.md)

An authentic, ultra-high-performance desktop client for SoundCloud. Designed with frameless modern aesthetics, 11 custom themes, animated live backgrounds, synchronized karaoke lyrics, real-time waveform comments, and a free audio downloader.

</div>

---

## Downloads & Releases

Download the ready-to-run binaries from the [GitHub Releases page](https://github.com/domxay/soundcloud-client/releases/latest):
- **Windows Setup Installer**: `SoundCloud.Desktop.Setup.1.0.0.exe` (Recommended: desktop shortcut, auto-updates)
- **Windows Portable**: `SoundCloud.Desktop.1.0.0.exe` (Zero installation required, click and play)
- **macOS & Linux**: Multi-platform automated builds via GitHub Actions workflow (`.dmg`, `.AppImage`, `.deb`)

---

## Key Features

- **Frameless Modern Window**: Clean, borderless desktop experience with custom window controls and smooth header dragging.
- **In-App Censorship & Block Bypass (Without System-wide VPN)**:
  - Built-in multi-resolver DNS-over-HTTPS (Cloudflare & Google DoH)
  - Dedicated in-app SOCKS5 / HTTP proxy tunnel for routing SoundCloud traffic independently
  - Instant presets for Zapret, ByeDPI, v2rayN, Xray, Clash, and Tor
- **Authentic SoundCloud Home & Discover**:
  - Spotlight Hero featuring the top trending sound of the day
  - SoundCloud Charts: Top 50 Global hits
  - Curated Mixes & Playlists (Phonk, Cyberpunk, Lo-Fi, Club)
  - Dynamic genre filter (Phonk, Electronic, Hip-Hop, Synthwave, Rock, Lo-Fi)
- **11 Aesthetic Themes**:
  - Tokyo Red (Neon Crimson)
  - Tokyo Blood Moon (Dark Burgundy)
  - Cyberpunk 2077 (Electric Yellow & Slate)
  - SoundCloud Classic (Iconic Orange)
  - Synthwave 80s (Miami Neon Pink & Purple)
  - Matrix Emerald (Hacker Terminal Green)
  - Nordic Frost (Glacial Ice Blue)
  - Sakura Night (Japanese Cherry Blossom)
  - Catppuccin Mocha (Modern Developer Dark)
  - Dracula Vampire (Gothic Purple)
  - OLED Pure Black (Pitch Black Contrast)
- **Live Custom Background Studio**:
  - Set animated GIFs, MP4 / WebM videos, or high-res photos
  - Browse local files directly from PC with native Windows file dialog
  - Apply direct media links / URLs
  - Real-time dimming overlay (10% - 95%) and blur slider (0px - 30px)
- **Synchronized Karaoke Lyrics (LRCLIB)**:
  - Real-time timestamped lyrics auto-scrolling with the music
  - Click any line to seek the audio track directly to that exact moment
- **Interactive Dual-Tone Waveform with Comment Pins**:
  - Authentic upper reflection peak and lower reflection shadow
  - Interactive avatar pins positioned along the timeline at comment timestamps
  - Hover tooltip displaying username, avatar, and comment content
- **Real-time Comments**:
  - Post comments attached to the active playback timestamp
  - Quick-reply reaction chips for instant commenting
  - domxay Author badge and comment seeking
- **Instant Like Synchronization**:
  - Global track cache updates liked states across Home, Stream, Library, Playlists, and Profile
  - Starter pack trending discovery for new accounts with 0 likes
- **Free Audio Downloader**:
  - Native Windows file and folder picker dialogs
  - Assemble high-quality fMP4 / MP3 audio streams directly to your disk
  - Download individual tracks or entire playlists

---

## Tech Stack

- **Runtime**: Electron 44, Node.js
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Custom Variables
- **Audio Engine**: HLS.js, HTML5 Audio, Web Audio API
- **Lyrics Provider**: LRCLIB Open API
- **Icons**: Lucide React

---

## Quick Start

### Prerequisites
- Node.js 18+ installed on your computer.

### Installation

```bash
git clone https://github.com/domxay/soundcloud-client.git
cd soundcloud-client
npm install
```

### Development Mode

```bash
npm run dev
```

### Build & Run Desktop App

```bash
npm run build
npm start
```

---

## Keyboard & Navigation Shortcuts

| Action | Control |
| --- | --- |
| Play / Pause | Space / Player Center Button |
| Next Track | Skip Forward Button / Automatic on track end |
| Previous Track | Skip Back Button |
| Seek Audio | Click anywhere on the dual-tone Waveform |
| Seek to Comment | Click comment timestamp badge or timeline avatar pin |
| Seek to Lyric | Click any line in the Lyrics modal |
| Search | Type in header search bar and press Enter |

---

## Author & Community

- **Creator**: domxay
- **Telegram Channel**: [@codesand](https://t.me/codesand)

---

## Tags

`#soundcloud` `#music-player` `#electron` `#react` `#typescript` `#desktop-app` `#lrclib` `#lyrics` `#tokyo-red` `#cyberpunk` `#downloader` `#audiophile`
