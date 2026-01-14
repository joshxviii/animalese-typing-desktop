# Animalese Typing - Desktop
> Animalese Typing is a desktop application that plays animalese sound effects as you type!

#### A desktop version of my [Animalese Typing Web Extension](https://www.youtube.com/watch?v=wdxvKpUY7q8). 😊

---

<br/>

## Features:
- **Animalese Voice While Typing**  
  Animalese when you type letters.

- **Musical Number Keys**  
  Number keys plays musical notes.

- **Special Character Sound Effects**  
  Unique sound effects play when typing special characters.

- **Remappable Keys**  
  Assign any sound effect/note/animalese to any key.

- **Voice Customization**  
  Choose from 8 Animalese voice types. Change the voices pitch and tone to create a unique voice.
  
- **Animalese-Enabled Apps**  
  Limit Animalese Typing to only respond when you're focused on specified apps or windows.

<br/>

#### Download:
> You can download the latest release for **Windows**, **macOS**, or **Linux** from [Releases](https://github.com/joshxviii/animalese-typing-desktop/releases/latest).

![DemoImage](https://github.com/user-attachments/assets/ccea8ea8-359c-4a2d-84d2-f9b3ebf97d29)

## Planned Features:
- **Get the app signed/notarized** - This makes sure the app is recognized as trustworthy for smoother installation
- **Uploading Custom Audio Files**
- **Audio File Editor** - Cut and edit attack/sustain/decay for uploaded audio files
- **Note Sound Overhaul** - Changes on how instrument/singing audio is processed
- **More Sounds** - More sound effects and instrument sounds for the piano tab

> If you want to stay updated on new releases or have any suggestions/feedback, consider joining the [Discord](https://discord.gg/XSXU7AaQjx)!

<br/>

## Running Locally

### Set-up:

```sh
git clone https://github.com/joshxviii/animalese-typing-desktop.git
cd animalese-typing-desktop
npm install
```

### Linux Dependencies:

Before building on Linux, install the required development libraries:

```sh
# Arch Linux 
sudo pacman -S libx11 libxtst libevdev
```

```sh
# Fedora / RHEL
sudo dnf install gcc-c++ libX11-devel libXtst-devel libevdev-devel pkgconf-pkg-config
```

```sh
# Ubuntu / Debian
sudo apt install g++ libx11-dev libxtst-dev libevdev-dev pkg-config
```

**Wayland Support:** The Linux key listener supports both X11 and Wayland. For Wayland, the listener uses evdev which requires permission to read `/dev/input/`. Add your user to the `input` group:

```sh
sudo usermod -aG input $USER
```

Then log out and back in for the changes to take effect.

### Building:

This app uses a child process `animalese-listener` to recieve global key inputs.
These binaries have to be built before packing the rest of the app or running in developer mode.

| ||
|-|-|
|Windows: |`npm run build:win-listner`  |
|macOS:   |`npm run build:mac-listner`  |
|Linux:   |`npm run build:linux-listner`|

The binary output can be found in [/libs/key-listeners](./libs/key-listeners).<br/>
After that you can run `npm run build` to build the final .exe/.dmg/.deb/.AppImage

Alternatively you can just run `build:[your-os]` to build the listener and the app together:

| ||
|-|-|
|Windows: |`npm run build:win`  |
|macOS:   |`npm run build:mac`  |
|Linux:   |`npm run build:linux`|

The final .exe/.dmg/.deb/.AppImage can found in the [/exports](./exports) folder.

### Run in dev mode:
```sh
npm start
```

<br/>

### Credits

Developed by @joshxviii

Contributors: @rokrokss @jiwooh @lorite
