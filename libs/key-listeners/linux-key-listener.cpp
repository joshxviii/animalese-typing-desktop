#include <iostream>
#include <cstdlib>
#include <cstring>
#include <string>
#include <csignal>
#include <vector>
#include <dirent.h>
#include <fcntl.h>
#include <unistd.h>
#include <poll.h>
#include <linux/input.h>
#include <libevdev/libevdev.h>
#include <X11/Xlib.h>
#include <X11/extensions/record.h>

//#region Evdev to X11 Keycode Mapping
// evdev keycodes are offset by 8 from X11 keycodes
inline int evdevToX11Keycode(int evdevCode) {
    return evdevCode + 8;
}
//#endregion

//#region X11 Backend
Display *dpy = nullptr;
XRecordContext context = 0;
volatile bool running = true;

void x11Callback(XPointer, XRecordInterceptData *data) {
    if (!running) {
        if (data) XRecordFreeData(data);
        return;
    }
    
    if (!data || data->category != XRecordFromServer) {
        if (data) XRecordFreeData(data);
        return;
    }

    unsigned char *d = reinterpret_cast<unsigned char*>(data->data);
    int type = d[0];
    if (type != KeyPress && type != KeyRelease) {
        XRecordFreeData(data);
        return;
    }

    int keycode = d[1];
    unsigned int state = (d[28]) | (d[29] << 8) | (d[30] << 16) | (d[31] << 24);
    bool shift = (state & ShiftMask) != 0;
    bool ctrl = (state & ControlMask) != 0;
    bool alt = (state & Mod1Mask) != 0;

    const char* t = (type == KeyPress) ? "keydown" : "keyup";
    std::cout << "{\"type\":\"" << t << "\",\"keycode\":" << keycode
              << ",\"shift\":" << (shift ? "true" : "false")
              << ",\"ctrl\":" << (ctrl ? "true" : "false")
              << ",\"alt\":" << (alt ? "true" : "false")
              << "}" << std::endl;

    XRecordFreeData(data);
}

bool runX11Backend() {
    dpy = XOpenDisplay(nullptr);
    if (!dpy) return false;

    int major, minor;
    if (!XRecordQueryVersion(dpy, &major, &minor)) { 
        XCloseDisplay(dpy); 
        return false; 
    }

    XRecordRange *range = XRecordAllocRange();
    range->device_events.first = KeyPress;
    range->device_events.last = KeyRelease;

    XRecordClientSpec clients = XRecordAllClients;
    context = XRecordCreateContext(dpy, 0, &clients, 1, &range, 1);
    XFree(range);
    if (!context) { 
        XCloseDisplay(dpy); 
        return false; 
    }

    XRecordEnableContext(dpy, context, x11Callback, nullptr);

    XRecordDisableContext(dpy, context);
    XRecordFreeContext(dpy, context);
    XCloseDisplay(dpy);
    return true;
}
//#endregion

//#region Evdev Backend (Wayland/Universal)
struct KeyboardDevice {
    int fd;
    struct libevdev *dev;
    std::string path;
    std::string name;
};

std::vector<KeyboardDevice> keyboards;

// Check if device is a real keyboard
bool isKeyboard(struct libevdev *dev) {
    if (!libevdev_has_event_type(dev, EV_KEY)) return false;
    
    // Must have letter keys (check top row Q-P)
    int letterCount = 0;
    for (int k = KEY_Q; k <= KEY_P; k++) {
        if (libevdev_has_event_code(dev, EV_KEY, k)) letterCount++;
    }
    if (letterCount < 8) return false;
    
    // Must have basic keys
    if (!libevdev_has_event_code(dev, EV_KEY, KEY_SPACE)) return false;
    if (!libevdev_has_event_code(dev, EV_KEY, KEY_ENTER)) return false;
        
    // Exclude non-keyboards by name
    const char* name = libevdev_get_name(dev);
    if (name) {
        std::string nameStr(name);
        for (char &c : nameStr) c = tolower(c);
        if (nameStr.find("power") != std::string::npos ||
            nameStr.find("button") != std::string::npos ||
            nameStr.find("video") != std::string::npos ||
            nameStr.find("mouse") != std::string::npos ||
            nameStr.find("touchpad") != std::string::npos ||
            nameStr.find("webcam") != std::string::npos ||
            nameStr.find("consumer") != std::string::npos) {
            return false;
        }
    }
    
    return true;
}

// Find all keyboard devices in /dev/input/
std::vector<KeyboardDevice> findAllKeyboards() {
    std::vector<KeyboardDevice> result;
    DIR *dir = opendir("/dev/input");
    if (!dir) return result;

    struct dirent *entry;
    while ((entry = readdir(dir)) != nullptr) {
        if (strncmp(entry->d_name, "event", 5) != 0) continue;

        std::string path = std::string("/dev/input/") + entry->d_name;
        int fd = open(path.c_str(), O_RDONLY | O_NONBLOCK);
        if (fd < 0) continue;

        struct libevdev *dev = nullptr;
        if (libevdev_new_from_fd(fd, &dev) < 0) {
            close(fd);
            continue;
        }

        if (isKeyboard(dev)) {
            const char* devName = libevdev_get_name(dev);
            std::string name = devName ? devName : "Unknown";
            std::cerr << "Found keyboard: " << path << " (" << name << ")" << std::endl;
            result.push_back({fd, dev, path, name});
        } else {
            libevdev_free(dev);
            close(fd);
        }
    }

    closedir(dir);
    return result;
}

bool runEvdevBackend() {
    keyboards = findAllKeyboards();
    
    if (keyboards.empty()) {
        std::cerr << "No keyboard devices found. Make sure you have permission to read /dev/input/" << std::endl;
        return false;
    }

    std::cerr << "Listening on " << keyboards.size() << " keyboard(s)" << std::endl;

    // Setup poll for all keyboards
    std::vector<struct pollfd> fds(keyboards.size());
    for (size_t i = 0; i < keyboards.size(); i++) {
        fds[i].fd = keyboards[i].fd;
        fds[i].events = POLLIN;
    }

    // Track modifier state (global across all keyboards)
    bool shift = false, ctrl = false, alt = false;

    while (running) {
        int ret = poll(fds.data(), fds.size(), 100); // 100ms timeout
        if (ret < 0) {
            if (errno == EINTR) continue;
            break;
        }
        if (ret == 0) continue; // timeout

        for (size_t i = 0; i < keyboards.size(); i++) {
            if (!(fds[i].revents & POLLIN)) continue;

            struct input_event ev;
            int rc;
            while ((rc = libevdev_next_event(keyboards[i].dev, 
                    LIBEVDEV_READ_FLAG_NORMAL, &ev)) == LIBEVDEV_READ_STATUS_SUCCESS) {
                
                if (ev.type != EV_KEY) continue;

                // Update modifier state
                if (ev.code == KEY_LEFTSHIFT || ev.code == KEY_RIGHTSHIFT) {
                    shift = (ev.value != 0);
                }
                if (ev.code == KEY_LEFTCTRL || ev.code == KEY_RIGHTCTRL) {
                    ctrl = (ev.value != 0);
                }
                if (ev.code == KEY_LEFTALT || ev.code == KEY_RIGHTALT) {
                    alt = (ev.value != 0);
                }

                // ev.value: 0 = release, 1 = press, 2 = repeat
                if (ev.value == 0 || ev.value == 1) {
                    const char* t = (ev.value == 1) ? "keydown" : "keyup";
                    int x11Keycode = evdevToX11Keycode(ev.code);
                    
                    std::cout << "{\"type\":\"" << t << "\",\"keycode\":" << x11Keycode
                              << ",\"shift\":" << (shift ? "true" : "false")
                              << ",\"ctrl\":" << (ctrl ? "true" : "false")
                              << ",\"alt\":" << (alt ? "true" : "false")
                              << "}" << std::endl;
                }
            }
            
            if (rc == LIBEVDEV_READ_STATUS_SYNC) {
                while (libevdev_next_event(keyboards[i].dev, 
                        LIBEVDEV_READ_FLAG_SYNC, &ev) == LIBEVDEV_READ_STATUS_SYNC) {}
            }
        }
    }

    // Cleanup all keyboards
    for (auto &kb : keyboards) {
        libevdev_free(kb.dev);
        close(kb.fd);
    }
    keyboards.clear();
    
    return true;
}
//#endregion

//#region Signal Handling
void signalHandler(int) {
    running = false;
    if (context && dpy) {
        XRecordDisableContext(dpy, context);
    }
    // Cleanup keyboards on signal
    for (auto &kb : keyboards) {
        if (kb.dev) libevdev_grab(kb.dev, LIBEVDEV_UNGRAB);
    }
}
//#endregion

//#region Backend Detection
bool isWaylandSession() {
    const char* waylandDisplay = std::getenv("WAYLAND_DISPLAY");
    const char* xdgSessionType = std::getenv("XDG_SESSION_TYPE");
    
    // Check if WAYLAND_DISPLAY is set
    if (waylandDisplay && strlen(waylandDisplay) > 0) {
        return true;
    }
    
    // Check XDG_SESSION_TYPE
    if (xdgSessionType && strcmp(xdgSessionType, "wayland") == 0) {
        return true;
    }
    
    return false;
}

bool canUseX11() {
    Display *testDpy = XOpenDisplay(nullptr);
    if (testDpy) {
        int major, minor;
        bool hasRecord = XRecordQueryVersion(testDpy, &major, &minor);
        XCloseDisplay(testDpy);
        return hasRecord;
    }
    return false;
}
//#endregion

int main(int argc, char* argv[]) {
    signal(SIGINT, signalHandler);
    signal(SIGTERM, signalHandler);

    bool forceX11 = false;
    bool forceEvdev = false;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--x11") == 0) forceX11 = true;
        if (strcmp(argv[i], "--evdev") == 0 || strcmp(argv[i], "--wayland") == 0) forceEvdev = true;
    }

    // Determine which backend to use
    bool useEvdev = false;
    
    if (forceX11) {
        useEvdev = false;
    } else if (forceEvdev) {
        useEvdev = true;
    } else {
        // Auto-detect: prefer X11 on X11 sessions, evdev on Wayland
        if (isWaylandSession()) {
            useEvdev = true;
        } else if (canUseX11()) {
            useEvdev = false;
        } else {
            // Fallback to evdev if X11 is not available
            useEvdev = true;
        }
    }

    bool success = false;
    
    if (useEvdev) {
        success = runEvdevBackend();
        if (!success && !forceEvdev && canUseX11()) {
            success = runX11Backend();
        }
    } else {
        success = runX11Backend();
        if (!success && !forceX11) {
            success = runEvdevBackend();
        }
    }

    return success ? 0 : 1;
}