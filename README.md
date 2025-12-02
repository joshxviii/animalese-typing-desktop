# Animalese Typing - Desktop

### A desktop version of my [Animalese Typing Web Extension](https://www.youtube.com/watch?v=wdxvKpUY7q8). 😊

---

> Animalese Typing is a desktop application that plays animalese sound effects as you type!

<br/>

### ✨ Features:
- ⌨️ **Animalese Voice While Typing**  
  Animalese when you type letters.

- 🎹 **Musical Number Keys**  
  Number keys plays musical notes.

- 🔊 **Special Character Sound Effects**  
  Unique sound effects play when typing special characters.

- 🔁 **Remappable Keys**  
  Assign any sound effect/note/animalese to any key.

- 🐶 **Voice Customization**  
  Choose from 8 Animalese voice types. Change the voices pitch and tone to create a unique voice.
  
- 🖥️ **Animalese-Enabled Apps**  
  Limit Animalese Typing to only respond when you're focused on specified apps or windows.

<br/>

### 💿 Download:
> You can download the latest release for **Windows**, **macOS**, or **Linux** from [Releases](https://github.com/joshxviii/animalese-typing-desktop/releases/latest).

![DemoImage](https://github.com/user-attachments/assets/ccea8ea8-359c-4a2d-84d2-f9b3ebf97d29)

<br/>

### 🐧 Building on Linux

**Prerequisites:**
```sh
sudo apt update
sudo apt install git nodejs npm build-essential libxtst-dev libpng++-dev
```

**Build:**
```sh
git clone https://github.com/joshxviii/animalese-typing-desktop.git
cd animalese-typing-desktop
npm install
npm run build  # Creates AppImage/deb in exports/ directory
```

**Run in dev mode:**
```sh
npm start
```

**Run the AppImage:**
```sh
chmod +x AnimaleseTypingSetup.AppImage
./AnimaleseTypingSetup.AppImage --no-sandbox
```

> **Note:** The `--no-sandbox` flag is required due to Electron's sandboxing requirements on Linux.

<br/>

### 📌 Planned Features:
- **Get the app code signed/notarized** - This makes sure the app is recognized as trustworthy for smoother installation
- **Uploading Custom Audio Files**
- **Audio File Editor** - Cut and edit attack/sustain/decay for uploaded audio files
- **Note Sound Overhaul** - Changes on how instrument/singing audio is processed
- **More Sounds** - More sound effects and instrument sounds for the piano tab
- **UI themes/improvements**

> If you want to stay updated on new versions/updates or have some suggestions/feedback, consider joining the [Discord](https://discord.gg/XSXU7AaQjx)!

### Credits

Developed by @joshxviii

Contributors: @rokrokss @jiwooh @lorite
