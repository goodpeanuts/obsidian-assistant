import { App, TFile, normalizePath } from 'obsidian';
import { ArchiveSettings } from '../settings';
import { TimeResolver } from './time-resolver';

/**
 * Calculates where a file should go.
 */
export class ArchivePlanner {
    constructor(
        private settings: ArchiveSettings,
        private timeResolver: TimeResolver
    ) { }

    getDestinationPath(file: TFile): string | null {
        const date = this.timeResolver.resolveCreatedTime(file);
        if (!date) return null;

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const yearShort = year.toString().slice(-2);
        const monthPad = month.toString().padStart(2, '0');

        const folderName = `${yearShort}-${monthPad}`;
        const targetFolder = `${this.settings.targetRoot}/${folderName}`;

        return normalizePath(`${targetFolder}/${file.name}`);
    }
}

/**
 * Executes the move operation.
 */
export class ArchiveExecutor {
    constructor(private app: App) { }

    async moveFile(file: TFile, destinationPath: string) {
        await this.ensureFolderExists(destinationPath);
        const finalPath = await this.getUniquePath(destinationPath);
        await this.app.fileManager.renameFile(file, finalPath);
    }

    private async ensureFolderExists(filePath: string) {
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (folderPath && !await this.app.vault.adapter.exists(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }
    }

    private async getUniquePath(preferredPath: string): Promise<string> {
        if (!await this.app.vault.adapter.exists(preferredPath)) {
            return preferredPath;
        }

        // Handle conflict
        const extIndex = preferredPath.lastIndexOf('.');
        const basePath = extIndex > 0 ? preferredPath.substring(0, extIndex) : preferredPath;
        const ext = extIndex > 0 ? preferredPath.substring(extIndex) : '';

        let counter = 1;
        while (true) {
            const candidate = `${basePath} (${counter})${ext}`;
            if (!await this.app.vault.adapter.exists(candidate)) {
                return candidate;
            }
            counter++;
        }
    }
}
