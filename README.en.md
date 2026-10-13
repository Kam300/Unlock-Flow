# Unlock Flow

Unlock Flow is a Chrome and Firefox extension that helps you access Google Flow and the Playground game catalog when regional restrictions block entry. It automatically applies the entry method for the selected service: Flow for creating videos or Playground for browsing games.

A Tampermonkey script is also available with the same access logic for both services.

The popup lets you choose a service, enable access help, open or pin a tab, and check for updates. On your first Playground visit, the extension waits for you to complete Google's game profile setup, then continues to the catalog.

Playground catalog access has been verified. Game creation and account limits depend on Google and have not been tested separately.

[Download the extension and updates](https://github.com/Kam300/Unlock-Flow/releases) · [<img src="docs/icons/telegram.svg" width="18" height="18" alt="Telegram"> Author's Telegram channel](https://t.me/TotalC0de) · [Русский](README.md)

## Screenshots

Flow in the light theme and Playground in the dark theme. Status messages are shown as examples.

| Flow · light theme | Playground · dark theme |
|:---:|:---:|
| <img src="docs/screenshots/flow-light-en.png" width="300" alt="Flow interface in the light theme in English"> | <img src="docs/screenshots/playground-dark-en.png" width="300" alt="Playground interface in the dark theme in English"> |

## Choose your download

- Chrome: `Unlock-Flow-v<version>.zip`.
- Firefox: `Unlock-Flow-Firefox-v<version>.zip` (Firefox 142 or newer).
- Tampermonkey: `Unlock-Flow-Tampermonkey-v<version>.user.js` — one script for Flow and Playground.
- Use the extension ZIP for your browser. GitHub's Source code archives contain the project source files.

## Chrome installation and updates

Extract the Chrome ZIP into a permanent folder. Open `chrome://extensions`,
turn on Developer mode, click Load unpacked, and select the folder containing
`manifest.json`. Keep that folder in place.
To update, click ↻ or the version number in the popup, then Download Update.
Extract the new ZIP into the SAME folder, replacing files. Reopen the popup,
click Files replaced — restart, and refresh the service tab.
Do not remove the extension or load a second copy. Older versions without
this restart button can be reloaded using ↻ on their `chrome://extensions` card.

## Firefox installation and updates

Open `about:debugging#/runtime/this-firefox`, click Load Temporary Add-on,
and select the Firefox ZIP without extracting it.
The unsigned add-on is removed when Firefox fully closes. Permanent installation
requires a Firefox-signed build.
Starting with version 1.4.6, the popup's ↻ button and version number check
for updates and download the Firefox ZIP. Load the new ZIP through
about:debugging. If replacement fails, remove the previous temporary add-on
on that page and load the new ZIP again. Version 1.4.5 requires a manual
download from the releases page. The Chrome restart button is not used.

## Install with Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open the [installation script](https://raw.githubusercontent.com/Kam300/Unlock-Flow/main/tampermonkey/unlock-flow.user.js)
   and click Install in Tampermonkey.
3. Open or reload [Flow](https://flow.google.com/)
   or [Playground](https://playground.google/404?login_success=1&pli=1).

In Chrome, allow Tampermonkey to run userscripts: `chrome://extensions` →
Tampermonkey → Details → Allow User Scripts. If that toggle is unavailable,
enable Developer mode. See the [Tampermonkey instructions](https://www.tampermonkey.net/faq.php?locale=en#Q209).

For a local installation, copy the entire `tampermonkey/unlock-flow.user.js` file
into Tampermonkey → Create a new script, then save with Ctrl+S.

**Updates:** Tampermonkey checks automatically. To check manually, use its
dashboard's script update check. Reload the service tab after updating.

Use either the Unlock Flow extension or the userscript. The userscript has no
extension popup; enable or disable it in Tampermonkey, then reload the service tab.
In Firefox, the script stays installed across browser restarts.
On your first Playground visit, finish Google's game profile setup;
the script waits for completion.

For developers: `node pack-userscript.js` builds the script from `hook.js` and
`playground.js` and writes a release asset to `dist/`.
Run `node pack-userscript.js --check` to check that the generated script is current.

## Using the extension


Choose Flow or Playground and click the main button. Enable and open performs
both steps in one click. The switch controls both services; existing tabs are reused.
On first use of Playground, complete Google's game profile setup yourself.
The helper waits for the dialog to close, then continues to the catalog.
Playground catalog access has been verified; game creation and account limits
have not been tested separately and remain subject to Google's availability.
