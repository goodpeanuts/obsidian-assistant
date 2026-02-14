import { App, TFile, TFolder } from 'obsidian';
import { ArchiveSettings } from '../settings';

export class Scanner {
    constructor(private app: App, private settings: ArchiveSettings) { }

    getFilesToArchive(): TFile[] {
        const files: TFile[] = [];
        const sourceFolders = this.settings.sourceFolders;

        for (const folderPath of sourceFolders) {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (folder instanceof TFolder) {
                this.scanFolder(folder, files);
            }
        }

        return files;
    }

    private scanFolder(folder: TFolder, files: TFile[]) {
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                files.push(child);
            } else if (child instanceof TFolder && this.settings.includeSubfolders) {
                this.scanFolder(child, files);
            }
        }
    }
}
