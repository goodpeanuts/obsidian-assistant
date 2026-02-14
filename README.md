# Obsidian Assistant

Archive notes into `YY-MM` folders based on note creation time.

## Repository layout

- `main.ts`: plugin entrypoint.
- `core/`: scan, time resolve, and archive planning/execution.
- `ui/`: archive selection modal.
- `manifest.json`: plugin metadata.
- `versions.json`: plugin version -> minimum Obsidian version mapping.
- `main.js` and `styles.css`: release artifacts required by Obsidian.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts esbuild watch mode and rebuilds `main.js`.

Build once:

```bash
npm run build
```

Build local test artifacts (all files needed by Obsidian):

```bash
npm run build:local
```

Output directory:

- `.build/obsidian-assistant/main.js`
- `.build/obsidian-assistant/manifest.json`
- `.build/obsidian-assistant/styles.css`

## Install manually (from release files)

1. Create folder: `<Vault>/.obsidian/plugins/obsidian-assistant`
2. Copy `main.js`, `manifest.json`, `styles.css` into that folder.
3. Restart Obsidian and enable **Obsidian Assistant** in Community Plugins.

Or install directly with one command:

```bash
$env:OBSIDIAN_VAULT="D:\YourVault"; npm run install:local
```

## Release process

1. Update `manifest.json` version.
2. Add the same version to `versions.json`.
3. Create and push a tag: `vX.Y.Z`.
4. GitHub Actions publishes release assets:
   - `main.js`
   - `manifest.json`
   - `styles.css`
   - `versions.json`
   - `obsidian-assistant-X.Y.Z.zip`
