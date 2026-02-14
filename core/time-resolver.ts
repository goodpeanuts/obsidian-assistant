import { TFile, FrontMatterCache } from 'obsidian';
import { ArchiveSettings } from '../settings';

export class TimeResolver {
    constructor(private settings: ArchiveSettings, private app: any) { }

    resolveCreatedTime(file: TFile): Date | null {
        // Priority 1: Frontmatter
        const frontmatterDate = this.getFromFrontmatter(file);
        if (frontmatterDate) return frontmatterDate;

        // Priority 2: Filename (e.g., 2023-10-25 Note.md or 202310251230.md)
        // Basic regex for YYYY-MM-DD
        const filenameDate = this.getFromFilename(file.name);
        if (filenameDate) return filenameDate;

        // Priority 3: File Stats (ctime)
        return new Date(file.stat.ctime);
    }

    private getFromFrontmatter(file: TFile): Date | null {
        const metadata = this.app.metadataCache.getFileCache(file);
        const frontmatter = metadata?.frontmatter;
        if (!frontmatter) return null;

        const key = this.settings.frontmatterKey;
        const val = frontmatter[key];

        if (val) {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return null;
    }

    private getFromFilename(filename: string): Date | null {
        // Matches YYYY-MM-DD at start or inside
        const match = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return null;
    }
}
