# Obsidian Assistant

Obsidian Assistant archives markdown notes into monthly folders (format: `YYYY-MM`) based on a configurable frontmatter timestamp.

## Features

- Archive command: `Archive notes by created time`.
- Multi-source scanning:
  - Add multiple source folders.
  - Configure each source folder to scan current folder only or include subfolders.
- Configurable target root:
  - Archived notes are moved to `<targetRoot>/<YYYY-MM>/`.
  - Month/year folder naming uses UTC components for timezone-stable classification.
- Configurable timestamp key:
  - Default frontmatter key is `createdTime`.
  - Supported parsing includes `YYYY-MM-DD`, `YYYY-MM-DD HH:mm:ss`, and ISO-like datetime strings.
- Archive preview modal:
  - Shows archive candidates and destination path.
  - Explains why a note is not archivable (missing/invalid frontmatter).
  - `Select All` / `Deselect All`.
  - Per-note `Ignore` action.
- Auto-selection by age:
  - Auto-select notes older than X days before running archive.
- Ignore list management:
  - Add/remove ignored markdown files from settings.
  - Bulk edit ignored files (one path per line).
- Conflict-safe file move:
  - If target file exists, plugin renames with numeric suffix (`name (1).md`, etc.).

## Installation

### 1) Install from release assets (recommended)

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Create plugin directory: `<Vault>/.obsidian/plugins/obsidian-assistant`.
3. Copy the three files into that directory.
4. Restart Obsidian and enable **Obsidian Assistant** in Community Plugins.

### 2) Install local development build

```bash
npm install
npm run install:local
```

Before running `install:local`, set your vault path:

```powershell
$env:OBSIDIAN_VAULT="D:\YourVault"
npm run install:local
```

This command builds the plugin and copies artifacts to:
`<Vault>/.obsidian/plugins/obsidian-assistant`.

## Development and Deployment

### Local development

```bash
npm install
npm run dev
```

- `npm run dev`: watch mode build for `main.js`.
- Reload plugin in Obsidian after changes.

### Build commands

```bash
npm run build
npm run build:local
```

- `npm run build`: TypeScript check (`tsc -noEmit`) + production bundle.
- `npm run build:local`: build and copy release-required files to `.build/obsidian-assistant`.

Local build output:

- `.build/obsidian-assistant/main.js`
- `.build/obsidian-assistant/manifest.json`
- `.build/obsidian-assistant/styles.css`

### Release deployment

1. Update `manifest.json` version.
2. Update `versions.json` with the same version and minimum app version.
3. Create and push tag `vX.Y.Z`.
4. GitHub Actions publishes release assets (`main.js`, `manifest.json`, `styles.css`, `versions.json`, and zip package).

## Project Structure

- `main.ts`: plugin entrypoint, command registration, and module wiring.
- `settings.ts`: settings model, default values, migration logic, and settings tab UI.
- `core/scanner.ts`: source folder scanning with per-folder recursion and ignore filtering.
- `core/time-resolver.ts`: frontmatter datetime extraction, parsing, and validation with error reasons.
- `core/archiver.ts`: destination planning and safe file move execution.
- `ui/archive-modal.ts`: archive preview modal and batch archive action.
- `scripts/build-local.mjs`: creates `.build/obsidian-assistant` artifacts.
- `scripts/install-local.mjs`: installs local build into target vault plugin directory.
- `manifest.json`: Obsidian plugin metadata.
- `versions.json`: plugin version compatibility map.
- `main.js`, `styles.css`: runtime artifacts consumed by Obsidian.
