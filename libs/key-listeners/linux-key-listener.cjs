#!/usr/bin/env node

/**
 * Linux key listener using xinput for system-wide keyboard monitoring
 * Outputs JSON events in the same format as the Windows and macOS listeners
 */

const { spawn, execSync } = require('child_process');

let shiftPressed = false;
let ctrlPressed = false;
let altPressed = false;

// Find keyboard device IDs
let keyboardIds = [];
try {
    const devices = execSync('xinput list', { encoding: 'utf8' });
    const lines = devices.split('\n');
    
    for (const line of lines) {
        // Look for keyboard devices (skip "Virtual core keyboard")
        if (line.includes('keyboard') && !line.includes('Virtual core keyboard')) {
            const idMatch = line.match(/id=(\d+)/);
            if (idMatch) {
                keyboardIds.push(idMatch[1]);
            }
        }
    }
    
    // If no specific keyboards found, try to find any slave keyboard
    if (keyboardIds.length === 0) {
        for (const line of lines) {
            if (line.includes('slave') && line.includes('keyboard')) {
                const idMatch = line.match(/id=(\d+)/);
                if (idMatch) {
                    keyboardIds.push(idMatch[1]);
                }
            }
        }
    }
} catch (error) {
    console.error('Error finding keyboard devices:', error.message);
    process.exit(1);
}

if (keyboardIds.length === 0) {
    console.error('No keyboard devices found');
    process.exit(1);
}

console.error(`Monitoring keyboard devices: ${keyboardIds.join(', ')}`);

// Monitor all keyboard devices
keyboardIds.forEach(deviceId => {
    const xinput = spawn('xinput', ['test', deviceId]);
    
    xinput.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Parse xinput test output: "key press   38" or "key release 38"
            const pressMatch = line.match(/key press\s+(\d+)/);
            const releaseMatch = line.match(/key release\s+(\d+)/);
            
            if (!pressMatch && !releaseMatch) continue;
            
            const isPress = !!pressMatch;
            const keycode = parseInt(isPress ? pressMatch[1] : releaseMatch[1]);
            
            // Update modifier states based on keycode
            if (keycode === 50 || keycode === 62) { // Shift_L or Shift_R
                shiftPressed = isPress;
            } else if (keycode === 37 || keycode === 105) { // Control_L or Control_R
                ctrlPressed = isPress;
            } else if (keycode === 64 || keycode === 108) { // Alt_L or Alt_R
                altPressed = isPress;
            }
            
            // Output JSON event
            const event = {
                type: isPress ? 'keydown' : 'keyup',
                keycode: keycode,
                shift: shiftPressed,
                ctrl: ctrlPressed,
                alt: altPressed
            };
            
            console.log(JSON.stringify(event));
        }
    });
    
    xinput.stderr.on('data', (data) => {
        console.error(`xinput error: ${data.toString()}`);
    });
    
    xinput.on('close', (code) => {
        console.error(`xinput process for device ${deviceId} exited with code ${code}`);
    });
});

// Handle signals
process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('SIGINT', () => {
    process.exit(0);
});
