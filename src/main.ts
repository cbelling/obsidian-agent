import { Plugin } from 'obsidian';
import { ChatView } from './ChatView';
import { ClaudeChatSettingTab } from './settings';
import { ClaudeChatSettings, DEFAULT_SETTINGS, VIEW_TYPE_CHAT } from './types';
import { VaultService } from './vault/VaultService';
import { CheckpointService } from './checkpoint/CheckpointService';

export default class ClaudeChatPlugin extends Plugin {
	settings: ClaudeChatSettings;
	private chatView: ChatView | null = null;
	public vaultService: VaultService | null = null;
	public checkpointService: CheckpointService | null = null;

	async onload() {
		await this.loadSettings();

		// Configure Langsmith if enabled
		if (this.settings.langsmithEnabled && this.settings.langsmithApiKey) {
			process.env.LANGSMITH_TRACING = "true";
			process.env.LANGSMITH_API_KEY = this.settings.langsmithApiKey;
			process.env.LANGSMITH_PROJECT = this.settings.langsmithProject || "obsidian-agent";
			process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
			console.log('[Plugin] Langsmith tracing enabled for project:', this.settings.langsmithProject);
		} else {
			process.env.LANGSMITH_TRACING = "false";
		}

		// Initialize VaultService
		this.vaultService = new VaultService(this.app);

		// Initialize CheckpointService for conversation persistence
		this.checkpointService = new CheckpointService(this.app, "obsidian-agent");

		// Run automatic cleanup if enabled
		if (this.settings.enableAutoCleanup) {
			this.runAutoCleanup();
		}

		// Register the chat view
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => {
				this.chatView = new ChatView(leaf, this);
				return this.chatView;
			}
		);

		// Add ribbon icon to open chat
		this.addRibbonIcon('message-circle', 'Open Obsidian Agent', () => {
			this.activateView();
		});

		// Add command to open chat
		this.addCommand({
			id: 'open-obsidian-agent',
			name: 'Open Obsidian Agent',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new ClaudeChatSettingTab(this.app, this));

	}

	async onunload() {
		// Detach all leaves of our view type
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHAT);
	}

	async activateView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];

		if (!leaf) {
			// Create new leaf in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_CHAT,
					active: true,
				});
				leaf = rightLeaf;
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Reconfigure Langsmith when settings change
		if (this.settings.langsmithEnabled && this.settings.langsmithApiKey) {
			process.env.LANGSMITH_TRACING = "true";
			process.env.LANGSMITH_API_KEY = this.settings.langsmithApiKey;
			process.env.LANGSMITH_PROJECT = this.settings.langsmithProject || "obsidian-agent";
			process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
			console.log('[Plugin] Langsmith tracing enabled for project:', this.settings.langsmithProject);
		} else {
			process.env.LANGSMITH_TRACING = "false";
			console.log('[Plugin] Langsmith tracing disabled');
		}

		// Update API key in chat view if it exists
		if (this.chatView) {
			this.chatView.updateApiKey(this.settings.apiKey);
		}
	}

	/**
	 * Run automatic cleanup of old conversations
	 */
	private async runAutoCleanup() {
		if (!this.checkpointService) {
			return;
		}

		try {
			console.log('[Plugin] Running automatic cleanup...');

			// Get storage stats before cleanup
			const statsBefore = await this.checkpointService.getStorageStats();
			console.log('[Plugin] Storage stats before cleanup:', statsBefore);

			// Prune old checkpoints
			const deletedCount = await this.checkpointService.pruneOldCheckpoints(
				this.settings.retentionDays
			);

			// Get storage stats after cleanup
			const statsAfter = await this.checkpointService.getStorageStats();
			console.log('[Plugin] Storage stats after cleanup:', statsAfter);

			if (deletedCount > 0) {
				console.log(`[Plugin] Automatic cleanup completed: deleted ${deletedCount} old conversations`);
			} else {
				console.log('[Plugin] No old conversations to clean up');
			}
		} catch (error) {
			console.error('[Plugin] Error during automatic cleanup:', error);
		}
	}
}
