import { App, TFile, TFolder, TAbstractFile, CachedMetadata } from "obsidian";

/**
 * VaultService - Read-only operations for Obsidian vault
 *
 * Provides methods to read files, search content, and query vault metadata
 * All operations are read-only for V1.0
 */
export class VaultService {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Read the contents of a file by path
	 * @param path - Path to the file (e.g., "folder/note.md")
	 * @returns File contents as string
	 */
	async readFile(path: string): Promise<string> {
		const file = this.app.vault.getAbstractFileByPath(path);

		if (!file) {
			throw new Error(`File not found: ${path}`);
		}

		if (!(file instanceof TFile)) {
			throw new Error(`Path is not a file: ${path}`);
		}

		return await this.app.vault.read(file);
	}

	/**
	 * List all files in the vault or a specific folder
	 * @param folder - Optional folder path to list (defaults to root)
	 * @returns Array of file paths
	 */
	listFiles(folder?: string): string[] {
		const allFiles = this.app.vault.getMarkdownFiles();

		if (!folder) {
			return allFiles.map(f => f.path);
		}

		// Filter files in the specified folder
		const folderPath = folder.endsWith('/') ? folder : folder + '/';
		return allFiles
			.filter(f => f.path.startsWith(folderPath))
			.map(f => f.path);
	}

	/**
	 * Search for files by filename (partial match, case-insensitive)
	 * @param query - Search query for filename
	 * @returns Array of matching file paths
	 */
	searchByFilename(query: string): string[] {
		const lowerQuery = query.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter(f => f.basename.toLowerCase().includes(lowerQuery))
			.map(f => f.path);
	}

	/**
	 * Search for files by content (full-text search)
	 * @param query - Search query for content
	 * @returns Array of objects with file path and matching lines
	 */
	async searchByContent(query: string): Promise<Array<{path: string; matches: string[]}>> {
		const lowerQuery = query.toLowerCase();
		const results: Array<{path: string; matches: string[]}> = [];

		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const lines = content.split('\n');
				const matchingLines = lines.filter(line =>
					line.toLowerCase().includes(lowerQuery)
				);

				if (matchingLines.length > 0) {
					results.push({
						path: file.path,
						matches: matchingLines.slice(0, 5) // Limit to 5 matches per file
					});
				}
			} catch (error) {
				console.error(`Error reading file ${file.path}:`, error);
			}
		}

		return results;
	}

	/**
	 * Search for files by tag (frontmatter or inline tags)
	 * @param tag - Tag to search for (with or without #)
	 * @returns Array of file paths containing the tag
	 */
	searchByTag(tag: string): string[] {
		// Normalize tag (remove # if present)
		const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;

		const results: string[] = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);

			if (!cache) continue;

			// Check frontmatter tags
			const frontmatterTags = cache.frontmatter?.tags || [];
			const hasFrontmatterTag = Array.isArray(frontmatterTags)
				? frontmatterTags.some((t: string) => t === normalizedTag)
				: frontmatterTags === normalizedTag;

			// Check inline tags
			const inlineTags = cache.tags?.map(t => t.tag.slice(1)) || [];
			const hasInlineTag = inlineTags.includes(normalizedTag);

			if (hasFrontmatterTag || hasInlineTag) {
				results.push(file.path);
			}
		}

		return results;
	}

	/**
	 * Get file metadata (frontmatter and stats)
	 * @param path - Path to the file
	 * @returns Object with metadata
	 */
	async getFileMetadata(path: string): Promise<{
		frontmatter: Record<string, any> | null;
		stats: { created: number; modified: number; size: number };
		tags: string[];
	}> {
		const file = this.app.vault.getAbstractFileByPath(path);

		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${path}`);
		}

		const cache = this.app.metadataCache.getFileCache(file);

		// Get frontmatter
		const frontmatter = cache?.frontmatter || null;

		// Get tags (both frontmatter and inline)
		const tags: string[] = [];
		if (cache) {
			// Frontmatter tags
			if (cache.frontmatter?.tags) {
				const fmTags = cache.frontmatter.tags;
				if (Array.isArray(fmTags)) {
					tags.push(...fmTags);
				} else {
					tags.push(fmTags);
				}
			}
			// Inline tags
			if (cache.tags) {
				tags.push(...cache.tags.map(t => t.tag));
			}
		}

		return {
			frontmatter,
			stats: {
				created: file.stat.ctime,
				modified: file.stat.mtime,
				size: file.stat.size
			},
			tags: [...new Set(tags)] // Remove duplicates
		};
	}

	/**
	 * Get backlinks for a file (files that link to this file)
	 * @param path - Path to the file
	 * @returns Array of file paths that link to this file
	 */
	getBacklinks(path: string): string[] {
		const file = this.app.vault.getAbstractFileByPath(path);

		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${path}`);
		}

		// Use resolvedLinks to find backlinks
		const backlinks: string[] = [];
		const resolvedLinks = this.app.metadataCache.resolvedLinks;

		// Iterate through all files and their links to find files that link to our target
		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			if (links[path]) {
				backlinks.push(sourcePath);
			}
		}

		return backlinks;
	}

	/**
	 * Get outgoing links from a file (links this file makes to other files)
	 * @param path - Path to the file
	 * @returns Array of linked file paths
	 */
	getOutgoingLinks(path: string): string[] {
		const file = this.app.vault.getAbstractFileByPath(path);

		if (!file || !(file instanceof TFile)) {
			throw new Error(`File not found: ${path}`);
		}

		const cache = this.app.metadataCache.getFileCache(file);

		if (!cache || !cache.links) {
			return [];
		}

		// Resolve link paths
		const links: string[] = [];
		for (const link of cache.links) {
			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link.link, path);
			if (linkedFile) {
				links.push(linkedFile.path);
			}
		}

		return links;
	}

	/**
	 * Get vault statistics
	 * @returns Object with vault stats
	 */
	getVaultStats(): {
		totalFiles: number;
		totalFolders: number;
		totalSize: number;
	} {
		const files = this.app.vault.getMarkdownFiles();
		const allFiles = this.app.vault.getAllLoadedFiles();
		const folders = allFiles.filter(f => f instanceof TFolder);

		const totalSize = files.reduce((sum, file) => sum + file.stat.size, 0);

		return {
			totalFiles: files.length,
			totalFolders: folders.length,
			totalSize
		};
	}
}
