'use strict';

const platforms = {
  win32: 0,
  darwin: 1,
  linux: 2,
};

const keyDefinitions = [
  // Numbers
  { keycodes: [49, 18, 10], key: '1', sound: '%.60', ctrlSound:'%.61', shiftSound: '&.gwah' },
  { keycodes: [50, 19, 11], key: '2', sound: '%.62', ctrlSound:'%.63', shiftSound: 'sfx.at' },
  { keycodes: [51, 20, 12], key: '3', sound: '%.64', ctrlSound:'%.65', shiftSound: 'sfx.pound' },
  { keycodes: [52, 21, 13], key: '4', sound: '%.65', ctrlSound:'%.66', shiftSound: 'sfx.dollar' },
  { keycodes: [53, 23, 14], key: '5', sound: '%.67', ctrlSound:'%.68', shiftSound: 'sfx.percent' },
  { keycodes: [54, 22, 15], key: '6', sound: '%.69', ctrlSound:'%.70', shiftSound: 'sfx.caret' },
  { keycodes: [55, 26, 16], key: '7', sound: '%.71', ctrlSound:'%.72', shiftSound: 'sfx.ampersand' },
  { keycodes: [56, 28, 17], key: '8', sound: '%.72', ctrlSound:'%.73', shiftSound: 'sfx.asterisk' },
  { keycodes: [57, 25, 18], key: '9', sound: '%.74', ctrlSound:'%.75', shiftSound: 'sfx.parenthesis_open' },
  { keycodes: [48, 29, 19], key: '0', sound: '%.76', ctrlSound:'%.77', shiftSound: 'sfx.parenthesis_closed' },
  // Letters
  { keycodes: [65, 0, 38], key: 'a', sound: '&.a', ctrlSound: 'sfx.parenthesis_open' },
  { keycodes: [66, 11, 56], key: 'b', sound: '&.b' },
  { keycodes: [67, 8, 54], key: 'c', sound: '&.c', ctrlSound: 'sfx.slash_forward' },
  { keycodes: [68, 2, 40], key: 'd', sound: '&.d' },
  { keycodes: [69, 14, 26], key: 'e', sound: '&.e' },
  { keycodes: [70, 3, 41], key: 'f', sound: '&.f' },
  { keycodes: [71, 5, 42], key: 'g', sound: '&.g' },
  { keycodes: [72, 4, 43], key: 'h', sound: '&.h' },
  { keycodes: [73, 34, 31], key: 'i', sound: '&.i' },
  { keycodes: [74, 38, 44], key: 'j', sound: '&.j' },
  { keycodes: [75, 40, 45], key: 'k', sound: '&.k' },
  { keycodes: [76, 37, 46], key: 'l', sound: '&.l' },
  { keycodes: [77, 46, 58], key: 'm', sound: '&.m' },
  { keycodes: [78, 45, 57], key: 'n', sound: '&.n' },
  { keycodes: [79, 31, 32], key: 'o', sound: '&.o' },
  { keycodes: [80, 35, 33], key: 'p', sound: '&.p' },
  { keycodes: [81, 12, 24], key: 'q', sound: '&.q' },
  { keycodes: [82, 15, 27], key: 'r', sound: '&.r' },
  { keycodes: [83, 1, 39], key: 's', sound: '&.s', ctrlSound: 'sfx.asterisk' },
  { keycodes: [84, 17, 28], key: 't', sound: '&.t' },
  { keycodes: [85, 32, 30], key: 'u', sound: '&.u' },
  { keycodes: [86, 9, 55], key: 'v', sound: '&.v', ctrlSound: 'sfx.pound' },
  { keycodes: [87, 13, 25], key: 'w', sound: '&.w' },
  { keycodes: [88, 7, 53], key: 'x', sound: '&.x', ctrlSound: 'sfx.at' },
  { keycodes: [89, 16, 29], key: 'y', sound: '&.y', ctrlSound: 'sfx.ampersand' },
  { keycodes: [90, 6, 52], key: 'z', sound: '&.z', ctrlSound: 'sfx.ampersand' },
  // Function Keys
  { keycodes: [112, 122, 67], key: 'F1'},
  { keycodes: [113, 120, 68], key: 'F2'},
  { keycodes: [114, 99, 69], key: 'F3'},
  { keycodes: [115, 118, 70], key: 'F4'},
  { keycodes: [116, 96, 71], key: 'F5'},
  { keycodes: [117, 97, 72], key: 'F6'},
  { keycodes: [118, 98, 73], key: 'F7'},
  { keycodes: [119, 100, 74], key: 'F8'},
  { keycodes: [120, 101, 75], key: 'F9'},
  { keycodes: [121, 109, 76], key: 'F10'},
  { keycodes: [122, 103, 95], key: 'F11'},
  { keycodes: [123, 111, 96], key: 'F12'},
  { keycodes: [124, 105, null], key: 'F13'},
  { keycodes: [125, 107, null], key: 'F14'},
  { keycodes: [126, 113, null], key: 'F15'},
  // Special Keys and Characters
  { keycodes: [27, 53, 9], key: 'Esc', sound: 'sfx.enter' },
  { keycodes: [9, 48, 23], key: 'Tab', sound: 'sfx.tab' },
  { keycodes: [20, 57, 66], key: 'Caps Lock'},
  { keycodes: [192, 50, 49], key: '`', sound: '%.55', ctrlSound:'%.56', shiftSound: 'sfx.tilde' },
  { keycodes: [189, 27, 20], key: '-', sound: '%.77', ctrlSound:'%.78', shiftSound: 'sfx.default' },
  { keycodes: [187, 24, 21], key: '=', sound: '%.79', ctrlSound:'%.80', shiftSound: 'sfx.default' },
  { keycodes: [219, 33, 34], key: '[', sound: 'sfx.bracket_open', shiftSound: 'sfx.brace_open' },
  { keycodes: [221, 30, 35], key: ']', sound: 'sfx.bracket_closed', shiftSound: 'sfx.brace_closed' },
  { keycodes: [220, 42, 51], key: '\\', sound: 'sfx.slash_back', shiftSound: 'sfx.default' },
  { keycodes: [191, 44, 61], key: '/', sound: 'sfx.slash_forward', shiftSound: '&.deska' },
  { keycodes: [186, 41, 47], key: ';', sound: 'sfx.default', shiftSound: 'sfx.default' },
  { keycodes: [222, 39, 48], key: '\'', sound: 'sfx.default', shiftSound: 'sfx.default' },
  { keycodes: [188, 43, 59], key: ',', sound: 'sfx.default', shiftSound: 'sfx.default' },
  { keycodes: [190, 47, 60], key: '.', sound: 'sfx.default', shiftSound: 'sfx.default' },
  { keycodes: [13, 36, 36], key: 'Enter', sound: 'sfx.enter' },
  { keycodes: [8, 51, 22], key: 'Backspace', sound: 'sfx.backspace' },
  { keycodes: [32, 49, 65], key: 'Space'},
  // Navigation Keys
  { keycodes: [45, null, 118], key: 'Insert'},
  { keycodes: [46, 51, 119], key: 'Delete', sound: 'sfx.at' },
  { keycodes: [36, 115, 110], key: 'Home'},
  { keycodes: [35, 119, 115], key: 'End'},
  { keycodes: [33, 116, 112], key: 'PageUp'},
  { keycodes: [34, 121, 117], key: 'PageDown'},
  { keycodes: [38, 126, 111], key: 'Up', sound: 'sfx.arrow_up' },
  { keycodes: [37, 123, 113], key: 'Left', sound: 'sfx.arrow_left' },
  { keycodes: [39, 124, 114], key: 'Right', sound: 'sfx.arrow_right' },
  { keycodes: [40, 125, 116], key: 'Down', sound: 'sfx.arrow_down' },
  // Modifier Keys
  { keycodes: [160, 56, 50], key: 'Shift'}, // Left Shift
  { keycodes: [161, 60, 62], key: 'Shift'}, // Right Shift
  { keycodes: [162, 59, 37], key: 'Ctrl'}, // Left Ctrl
  { keycodes: [163, 62, 105], key: 'Ctrl'}, // Right Ctrl
  { keycodes: [164, 58, 64], key: 'Alt'}, // Left Alt
  { keycodes: [165, 61, 108], key: 'Alt'}, // Right Alt
  { keycodes: [91, 55, 133], key: 'Meta'}, // Left Meta (Win/Cmd)
  { keycodes: [92, 54, 134], key: 'Meta'}, // Right Meta (Win/Cmd)
  { keycodes: [93, null, 135], key: 'Menu'},
  // Numpad Keys
  { keycodes: [144, 71, 77], key: 'Num Lock'},
  { keycodes: [111, 75, 106], key: 'Num /', sound: 'sfx.slash_forward' },
  { keycodes: [106, 67, 63], key: 'Num *', sound: 'sfx.asterisk' },
  { keycodes: [109, 78, 82], key: 'Num -'},
  { keycodes: [107, 69, 86], key: 'Num +'},
  { keycodes: [13, 76, 104], key: 'Num Enter', sound: 'sfx.enter' },
  { keycodes: [110, 65, 91], key: 'Num .', sound: 'sfx.default' },
  { keycodes: [96, 82, 90], key: 'Num 0', sound: '&.0' },
  { keycodes: [97, 83, 87], key: 'Num 1', sound: '&.1' },
  { keycodes: [98, 84, 88], key: 'Num 2', sound: '&.2' },
  { keycodes: [99, 85, 89], key: 'Num 3', sound: '&.3' },
  { keycodes: [100, 86, 83], key: 'Num 4', sound: '&.4' },
  { keycodes: [101, 87, 84], key: 'Num 5', sound: '&.5' },
  { keycodes: [102, 88, 85], key: 'Num 6', sound: '&.6' },
  { keycodes: [103, 89, 79], key: 'Num 7', sound: '&.7' },
  { keycodes: [104, 91, 80], key: 'Num 8', sound: '&.8' },
  { keycodes: [105, 92, 81], key: 'Num 9', sound: '&.9' },
  // Media Keys
  { keycodes: [173, null, 121], key: 'Vol Mute' },
  { keycodes: [174, null, 122], key: 'Vol Down' },
  { keycodes: [175, null, 123], key: 'Vol Up' },
  { keycodes: [176, null, 171], key: 'Next'},
  { keycodes: [177, null, 173], key: 'Prev'},
  { keycodes: [179, null, 172], key: 'Play' },
  // Other
  { keycodes: [145, null, 78], key: 'Scroll Lock'},
  { keycodes: [19, null, 127], key: 'Pause'},
  { keycodes: [44, null, 107], key: 'Print Screen'},
];

function buildKeyMap(platform) {
  const platformIdx = platforms[platform];
  if (platformIdx === undefined) throw new Error(`Unsupported platform: ${platform}`);

  const map = {};
  for (const def of keyDefinitions) {
    const code = def.keycodes[platformIdx];
    if (code == null) continue;

    map[code] = {
      key: def.key,
      sound: def.sound ?? '',
      shiftSound: def.shiftSound ?? def.sound ?? '',
      ctrlSound: def.ctrlSound ?? '',
      altSound: def.altSound ?? '',
    };
  }
  return map;
}

module.exports = {
  win32: buildKeyMap('win32'),
  darwin: buildKeyMap('darwin'),
  linux: buildKeyMap('linux'),
};