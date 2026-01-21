# Trim Sheet Architect

**Trim Sheet Architect** is a robust, web-based tool designed to streamline the planning and creation of 2D Trim Sheet layouts for game development. It allows Environment Artists and Technical Artists to rapidly prototype, visualize, and validate trim sheet usage before committing to modeling or texturing.

![Trim Sheet Architect Layout](https://github.com/btitkin/TrimSheetArchitect/blob/main/assets/TrimSheetArchitectLogo.png?raw=true)

---

## 🎯 Purpose
Creating efficient trim sheets often involves calculating pixel heights, ensuring power-of-two compatibility, and communicating layouts to teams. Trim Sheet Architect solves this by providing:
- **Visual Feedback**: visual representation of your texture layout.
- **Math-Free Planning**: Automatic calculation of pixel heights and coverage based on canvas resolution.
- **Validation**: Real-time feedback if your strips don't add up to the total canvas height.

## ✨ Key Features

### 📐 Flexible Layout Modes
Design for any use case with versatile topology presets:
- **Single Zone**: Standard top-down trim sheet.
- **Quad (4x)**: Divide the sheet into 4 quadrants for mixing varied material types.
- **Split Horizontal/Vertical**: Dedicated zones for distinct biom/structure types.
- **Six Pack & Grid 9**: Complex layouts for atlasing multiple smaller props or decals.

### 🛠️ Powerful Strip Management
- **Smart Presets**: Built-in templates for "Mixed Production", "Sci-Fi Panels", "Stone Walls", and "Ultimate Stacks".
- **Dynamic Editing**: Drag-and-drop strips, resize heights in real-time, and assign fill types (Solid, Checker, Gradient, Noise).
- **Multi-Select Editing**: Select multiple zones and "project" a single strip layout across them or edit them simultaneously.

### 🎨 Logic & Visualization
- **Texel Density Guides**: Displays visual guides for common texel densities (e.g., 512px/m for Third Person, 1024px/m for First Person).
- **Auto-Reservations**: Automatically fill remaining space with "Reserve" strips to ensure perfect pixel alignment.
- **Color Distribution**: Tools to randomize or distribute localized colors for easy ID mapping.

### 💾 Export & Integration
- **Export to PNG**: Generate a color-coded layout guide to use as an underlay in Painter, Photoshop, or Blender.
- **Export to JSON**: Save your layouts and share them with your team.
- **JSON Import**: Reload previous configurations instantly.

---

## 🚀 How to Use

### Live Web Version
Access the latest version directly via your browser (GitPages link):
[**Open Trim Sheet Architect**](https://btitkin.github.io/TrimSheetArchitect/)

### Local Installation
To run the tool offline or modify the source code:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/btitkin/TrimSheetArchitect.git
   cd TrimSheetArchitect
   ```

2. **Using the Launcher (Windows)**
   - Simply double-click `Launcher.bat`.
   - This script will automatically install dependencies and launch the application in your default browser.

3. **Manual Setup (Node.js)**
   ```bash
   npm install
   npm run dev
   ```

---

## 👨‍💻 For Technical Artists
This tool is built with **React**, **TypeScript**, and **Vite**, using **Tailwind CSS** for styling.

- **Configurable**: Resolution agnostic (up to 4096px).
- **Structure**: The core logic revolves around `TrimZone` and `TrimStrip` data structures found in `types.ts`, allowing for easy extension of new layout modes or export formats.
- **Performance**: Optimized for handling complex layouts with immediate visual updates.

## 📄 License
This project is open-source. Feel free to use it for your personal or commercial projects.

---
*Created by [Bartosz Titkin](https://github.com/btitkin)*
