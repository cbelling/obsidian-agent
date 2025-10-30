import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { VaultService } from "./VaultService";

/**
 * Create vault tools for the LangGraph agent
 * These tools expose read-only vault operations to the agent
 */
export function createVaultTools(vaultService: VaultService) {
	/**
	 * Tool: Search vault by filename
	 */
	const searchVaultByName = tool(
		async (input: { query: string }) => {
			try {
				const results = vaultService.searchByFilename(input.query);

				if (results.length === 0) {
					return `No files found matching "${input.query}"`;
				}

				return `Found ${results.length} file(s) matching "${input.query}":\n${results.slice(0, 20).join('\n')}${results.length > 20 ? `\n...and ${results.length - 20} more` : ''}`;
			} catch (error) {
				return `Error searching files: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "search_vault_by_name",
			description: "Search for files in the vault by filename. Use this when the user asks about specific notes or files by name. Returns a list of file paths that match the query (case-insensitive, partial match).",
			schema: z.object({
				query: z.string().describe("The search query for filenames (e.g., 'meeting', 'daily note', 'project')"),
			}),
		}
	);

	/**
	 * Tool: Search vault by content
	 */
	const searchVaultByContent = tool(
		async (input: { query: string }) => {
			try {
				const results = await vaultService.searchByContent(input.query);

				if (results.length === 0) {
					return `No files found containing "${input.query}"`;
				}

				let response = `Found "${input.query}" in ${results.length} file(s):\n\n`;

				for (const result of results.slice(0, 10)) {
					response += `**${result.path}**:\n`;
					for (const match of result.matches) {
						response += `  - ${match.trim()}\n`;
					}
					response += '\n';
				}

				if (results.length > 10) {
					response += `...and ${results.length - 10} more files`;
				}

				return response;
			} catch (error) {
				return `Error searching content: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "search_vault_by_content",
			description: "Search for text content within vault files. Use this when the user asks about specific topics, concepts, or text they remember from their notes. Returns matching lines from files that contain the query.",
			schema: z.object({
				query: z.string().describe("The text to search for within file contents (e.g., 'machine learning', 'todo', 'important')"),
			}),
		}
	);

	/**
	 * Tool: Search vault by tag
	 */
	const searchVaultByTag = tool(
		async (input: { tag: string }) => {
			try {
				const results = vaultService.searchByTag(input.tag);

				if (results.length === 0) {
					return `No files found with tag "${input.tag}"`;
				}

				return `Found ${results.length} file(s) with tag "${input.tag}":\n${results.slice(0, 20).join('\n')}${results.length > 20 ? `\n...and ${results.length - 20} more` : ''}`;
			} catch (error) {
				return `Error searching tags: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "search_vault_by_tag",
			description: "Search for files by tag. Use this when the user asks about notes with specific tags. Searches both frontmatter tags and inline #tags. Tag can be provided with or without the # symbol.",
			schema: z.object({
				tag: z.string().describe("The tag to search for (e.g., 'project', 'important', 'todo'). Can include or omit the # symbol."),
			}),
		}
	);

	/**
	 * Tool: Read vault file
	 */
	const readVaultFile = tool(
		async (input: { path: string }) => {
			try {
				const content = await vaultService.readFile(input.path);

				// Limit content length for agent context
				const maxLength = 4000;
				if (content.length > maxLength) {
					return `Content of "${input.path}" (truncated to ${maxLength} characters):\n\n${content.slice(0, maxLength)}...\n\n[File is ${content.length} characters total. Use more specific searches to find relevant sections.]`;
				}

				return `Content of "${input.path}":\n\n${content}`;
			} catch (error) {
				return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "read_vault_file",
			description: "Read the complete contents of a file from the vault. Use this after finding a file (via search) to read its actual content. Requires the exact file path.",
			schema: z.object({
				path: z.string().describe("The exact path to the file (e.g., 'folder/note.md' or 'Daily Notes/2024-01-01.md')"),
			}),
		}
	);

	/**
	 * Tool: List vault files
	 */
	const listVaultFiles = tool(
		async (input: { folder?: string }) => {
			try {
				const files = vaultService.listFiles(input.folder);

				if (files.length === 0) {
					return input.folder
						? `No files found in folder "${input.folder}"`
						: 'No files found in vault';
				}

				const folderMsg = input.folder ? ` in folder "${input.folder}"` : ' in vault';
				return `Found ${files.length} file(s)${folderMsg}:\n${files.slice(0, 50).join('\n')}${files.length > 50 ? `\n...and ${files.length - 50} more` : ''}`;
			} catch (error) {
				return `Error listing files: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "list_vault_files",
			description: "List all markdown files in the vault or a specific folder. Use this to get an overview of the vault structure or to see what files exist in a particular location.",
			schema: z.object({
				folder: z.string().optional().describe("Optional folder path to list files from (e.g., 'Daily Notes', 'Projects/Work'). Omit to list all files."),
			}),
		}
	);

	/**
	 * Tool: Get file metadata
	 */
	const getFileMetadata = tool(
		async (input: { path: string }) => {
			try {
				const metadata = await vaultService.getFileMetadata(input.path);

				let response = `Metadata for "${input.path}":\n\n`;

				// Frontmatter
				if (metadata.frontmatter && Object.keys(metadata.frontmatter).length > 0) {
					response += '**Frontmatter:**\n';
					for (const [key, value] of Object.entries(metadata.frontmatter)) {
						response += `  - ${key}: ${JSON.stringify(value)}\n`;
					}
					response += '\n';
				}

				// Tags
				if (metadata.tags.length > 0) {
					response += `**Tags:** ${metadata.tags.join(', ')}\n\n`;
				}

				// Stats
				response += '**Stats:**\n';
				response += `  - Created: ${new Date(metadata.stats.created).toLocaleString()}\n`;
				response += `  - Modified: ${new Date(metadata.stats.modified).toLocaleString()}\n`;
				response += `  - Size: ${metadata.stats.size} bytes\n`;

				return response;
			} catch (error) {
				return `Error getting metadata: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "get_file_metadata",
			description: "Get metadata for a file including frontmatter properties, tags, creation date, modification date, and file size. Use this to understand the properties and context of a note.",
			schema: z.object({
				path: z.string().describe("The exact path to the file"),
			}),
		}
	);

	/**
	 * Tool: Get file backlinks
	 */
	const getFileBacklinks = tool(
		async (input: { path: string }) => {
			try {
				const backlinks = vaultService.getBacklinks(input.path);

				if (backlinks.length === 0) {
					return `No backlinks found for "${input.path}"`;
				}

				return `Files that link to "${input.path}" (${backlinks.length}):\n${backlinks.join('\n')}`;
			} catch (error) {
				return `Error getting backlinks: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "get_file_backlinks",
			description: "Get all files that link to a specific file (backlinks). Use this to find connections and see which notes reference a particular note.",
			schema: z.object({
				path: z.string().describe("The exact path to the file"),
			}),
		}
	);

	/**
	 * Tool: Get outgoing links
	 */
	const getOutgoingLinks = tool(
		async (input: { path: string }) => {
			try {
				const links = vaultService.getOutgoingLinks(input.path);

				if (links.length === 0) {
					return `No outgoing links found in "${input.path}"`;
				}

				return `Files linked from "${input.path}" (${links.length}):\n${links.join('\n')}`;
			} catch (error) {
				return `Error getting outgoing links: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		{
			name: "get_outgoing_links",
			description: "Get all files that a specific file links to (outgoing links). Use this to see what other notes a particular note references.",
			schema: z.object({
				path: z.string().describe("The exact path to the file"),
			}),
		}
	);

	return [
		searchVaultByName,
		searchVaultByContent,
		searchVaultByTag,
		readVaultFile,
		listVaultFiles,
		getFileMetadata,
		getFileBacklinks,
		getOutgoingLinks,
	];
}
