import { App, TFile, TFolder } from "obsidian";
import { SearchOptions, PaginatedResults, FileSearchResult, ContentSearchResult } from "../types";
import { Cache } from "../utils/Cache";

/**
 * VaultService - Read-only operations for Obsidian vault
 *
 * Provides methods to read files, search content, and query vault metadata
 * All operations are read-only for V1.0
 */
export class VaultService {
	private app: App;
	private readonly DEFAULT_LIMIT = 50;
	private readonly MAX_LIMIT = 1000;

	// Caches for frequently accessed data
	private fileContentCache: Cache<string>;
	private fileSearchCache: Cache<PaginatedResults<FileSearchResult>>;
	private contentSearchCache: Cache<PaginatedResults<ContentSearchResult>>;
	private metadataCache: Cache<Record<string, unknown>>;

	constructor(app: App) {
		this.app = app;

		// Initialize caches with different TTLs based on data volatility
		this.fileContentCache = new Cache<string>(60000); // 1 minute
		this.fileSearchCache = new Cache<PaginatedResults<FileSearchResult>>(30000); // 30 seconds
		this.contentSearchCache = new Cache<PaginatedResults<ContentSearchResult>>(30000); // 30 seconds
		this.metadataCache = new Cache<Record<string, unknown>>(60000); // 1 minute

		// Prune expired entries every 5 minutes
		setInterval(() => {
			this.fileContentCache.prune();
			this.fileSearchCache.prune();
			this.contentSearchCache.prune();
			this.metadataCache.prune();
		}, 300000);
	}

	/**
	 * Clear all caches
	 */
	clearCaches(): void {
		this.fileContentCache.clear();
		this.fileSearchCache.clear();
		this.contentSearchCache.clear();
		this.metadataCache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): {
		fileContent: ReturnType<Cache<string>['stats']>;
		fileSearch: ReturnType<Cache<PaginatedResults<FileSearchResult>>['stats']>;
		contentSearch: ReturnType<Cache<PaginatedResults<ContentSearchResult>>['stats']>;
		metadata: ReturnType<Cache<Record<string, unknown>>['stats']>;
	} {
		return {
			fileContent: this.fileContentCache.stats(),
			fileSearch: this.fileSearchCache.stats(),
			contentSearch: this.contentSearchCache.stats(),
			metadata: this.metadataCache.stats(),
		};
	}

	/**
	 * Read the contents of a file by path
	 * @param path - Path to the file (e.g., "folder/note.md")
	 * @returns File contents as string
	 */
	async readFile(path: string): Promise<string> {
		// Check cache first
		const cached = this.fileContentCache.get(path);
		if (cached !== null) {
			return cached;
		}

		const file = this.app.vault.getAbstractFileByPath(path);

		if (!file) {
			throw new Error(`File not found: ${path}`);
		}

		if (!(file instanceof TFile)) {
			throw new Error(`Path is not a file: ${path}`);
		}

		const content = await this.app.vault.read(file);

		// Cache the content
		this.fileContentCache.set(path, content);

		return content;
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
	 * Search for files by filename with pagination support
	 * @param query - Search query for filename
	 * @param options - Pagination and sorting options
	 * @returns Paginated search results
	 */
	searchByFilenamePaginated(query: string, options: SearchOptions = {}): PaginatedResults<FileSearchResult> {
		// Generate cache key from query and options
		const cacheKey = `filename:${query}:${JSON.stringify(options)}`;

		// Check cache first
		const cached = this.fileSearchCache.get(cacheKey);
		if (cached !== null) {
			return cached;
		}

		const lowerQuery = query.toLowerCase();
		const files = this.app.vault.getMarkdownFiles();

		// Filter matching files
		const filtered = files.filter(f =>
			f.basename.toLowerCase().includes(lowerQuery) ||
			f.path.toLowerCase().includes(lowerQuery)
		);

		// Sort files
		const sorted = this.sortFiles(filtered, options);

		// Paginate
		const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
		const offset = options.offset || 0;
		const paginated = sorted.slice(offset, offset + limit);

		const result = {
			results: paginated.map(f => ({
				path: f.path,
				basename: f.basename
			})),
			total: filtered.length,
			hasMore: offset + limit < filtered.length,
			offset,
			limit
		};

		// Cache the result
		this.fileSearchCache.set(cacheKey, result);

		return result;
	}

	/**
	 * Sort files based on options
	 */
	private sortFiles(files: TFile[], options: SearchOptions): TFile[] {
		const { sortBy = 'name', sortOrder = 'asc' } = options;
		const multiplier = sortOrder === 'asc' ? 1 : -1;

		return files.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return multiplier * a.basename.localeCompare(b.basename);
				case 'modified':
					return multiplier * (a.stat.mtime - b.stat.mtime);
				case 'created':
					return multiplier * (a.stat.ctime - b.stat.ctime);
				default:
					return 0;
			}
		});
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
	 * Search for files by content with pagination support
	 * @param query - Search query for content
	 * @param options - Pagination and sorting options
	 * @returns Paginated content search results
	 */
	async searchByContentPaginated(query: string, options: SearchOptions = {}): Promise<PaginatedResults<ContentSearchResult>> {
		// Generate cache key from query and options
		const cacheKey = `content:${query}:${JSON.stringify(options)}`;

		// Check cache first
		const cached = this.contentSearchCache.get(cacheKey);
		if (cached !== null) {
			return cached;
		}

		const lowerQuery = query.toLowerCase();
		const allResults: ContentSearchResult[] = [];

		const files = this.app.vault.getMarkdownFiles();

		// Search through files (limit total files scanned for performance)
		const maxFilesToScan = 500;
		const filesToScan = files.slice(0, maxFilesToScan);

		for (const file of filesToScan) {
			try {
				// Use cached file content if available
				const content = await this.readFile(file.path);
				const lines = content.split('\n');
				const matchingLines = lines.filter(line =>
					line.toLowerCase().includes(lowerQuery)
				);

				if (matchingLines.length > 0) {
					allResults.push({
						path: file.path,
						matches: matchingLines.slice(0, 5) // Limit to 5 matches per file
					});
				}
			} catch (error) {
				console.error(`Error reading file ${file.path}:`, error);
			}
		}

		// Paginate results
		const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
		const offset = options.offset || 0;
		const paginated = allResults.slice(offset, offset + limit);

		const result = {
			results: paginated,
			total: allResults.length,
			hasMore: offset + limit < allResults.length,
			offset,
			limit
		};

		// Cache the result
		this.contentSearchCache.set(cacheKey, result);

		return result;
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
		frontmatter: Record<string, unknown> | null;
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
