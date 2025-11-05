import { Plugin, Platform } from 'obsidian';
import { ChatView } from './ChatView';
import { ClaudeChatSettingTab } from './settings';
import { ClaudeChatSettings, DEFAULT_SETTINGS, VIEW_TYPE_CHAT } from './types';
import { VaultService } from './vault/VaultService';
import { CheckpointService } from './checkpoint/CheckpointService';
import { initializeAsyncLocalStoragePolyfill } from './polyfills/async-hooks';

// CRITICAL: Initialize AsyncLocalStorage polyfill BEFORE any LangChain imports
// This must happen at module load time, before the plugin class is instantiated
initializeAsyncLocalStoragePolyfill();

export default class ClaudeChatPlugin extends Plugin {
	settings: ClaudeChatSettings;
	private chatView: ChatView | null = null;
	public vaultService: VaultService | null = null;
	public checkpointService: CheckpointService | null = null;

	async onload() {
		console.log('[Plugin] Starting onload...');
		console.log('[Plugin] Platform.isMobile:', Platform.isMobile);

		try {
			console.log('[Plugin] Loading settings...');
			await this.loadSettings();
			console.log('[Plugin] Settings loaded successfully');

			// Configure Langsmith if enabled (only on desktop platforms)
			console.log('[Plugin] Configuring Langsmith...');
			if (!Platform.isMobile && this.settings.langsmithEnabled && this.settings.langsmithApiKey) {
				if (typeof process !== 'undefined' && process.env) {
					process.env.LANGSMITH_TRACING = "true";
					process.env.LANGSMITH_API_KEY = this.settings.langsmithApiKey;
					process.env.LANGSMITH_PROJECT = this.settings.langsmithProject || "obsidian-agent";
					process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
					console.log('[Plugin] Langsmith tracing enabled for project:', this.settings.langsmithProject);
				}
			} else {
				if (typeof process !== 'undefined' && process.env) {
					process.env.LANGSMITH_TRACING = "false";
				}
				if (Platform.isMobile && this.settings.langsmithEnabled) {
					console.log('[Plugin] Langsmith tracing not available on mobile');
				}
			}
			console.log('[Plugin] Langsmith configuration complete');

			// Initialize VaultService
			console.log('[Plugin] Initializing VaultService...');
			this.vaultService = new VaultService(this.app);
			console.log('[Plugin] VaultService initialized');

			// Initialize CheckpointService for conversation persistence
			console.log('[Plugin] Initializing CheckpointService...');
			this.checkpointService = new CheckpointService(this.app, "obsidian-agent");
			console.log('[Plugin] CheckpointService initialized');

			// Run automatic cleanup if enabled
			if (this.settings.enableAutoCleanup) {
				console.log('[Plugin] Running auto cleanup...');
				this.runAutoCleanup();
			}

			// Register the chat view
			console.log('[Plugin] Registering chat view...');
			this.registerView(
				VIEW_TYPE_CHAT,
				(leaf) => {
					console.log('[Plugin] Creating ChatView instance...');
					this.chatView = new ChatView(leaf, this);
					return this.chatView;
				}
			);
			console.log('[Plugin] Chat view registered');

			// Add ribbon icon to open chat
			console.log('[Plugin] Adding ribbon icon...');
			this.addRibbonIcon('message-circle', 'Open Obsidian Agent', () => {
				this.activateView();
			});

			// Add command to open chat
			console.log('[Plugin] Adding command...');
			this.addCommand({
				id: 'open-obsidian-agent',
				name: 'Open Obsidian Agent',
				callback: () => {
					this.activateView();
				}
			});

			// Add settings tab
			console.log('[Plugin] Adding settings tab...');
			this.addSettingTab(new ClaudeChatSettingTab(this.app, this));

			console.log('[Plugin] onload completed successfully!');
		} catch (error) {
			console.error('[Plugin] FATAL ERROR during onload:', error);
			console.error('[Plugin] Error name:', error instanceof Error ? error.name : 'unknown');
			console.error('[Plugin] Error message:', error instanceof Error ? error.message : String(error));
			console.error('[Plugin] Error stack:', error instanceof Error ? error.stack : 'no stack trace');

			// Re-throw to let Obsidian know the plugin failed to load
			throw error;
		}
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

		// Reconfigure Langsmith when settings change (only on desktop platforms)
		if (!Platform.isMobile && this.settings.langsmithEnabled && this.settings.langsmithApiKey) {
			if (typeof process !== 'undefined' && process.env) {
				process.env.LANGSMITH_TRACING = "true";
				process.env.LANGSMITH_API_KEY = this.settings.langsmithApiKey;
				process.env.LANGSMITH_PROJECT = this.settings.langsmithProject || "obsidian-agent";
				process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
				console.log('[Plugin] Langsmith tracing enabled for project:', this.settings.langsmithProject);
			}
		} else {
			if (typeof process !== 'undefined' && process.env) {
				process.env.LANGSMITH_TRACING = "false";
			}
			if (Platform.isMobile && this.settings.langsmithEnabled) {
				console.log('[Plugin] Langsmith tracing not available on mobile');
			} else if (!Platform.isMobile) {
				console.log('[Plugin] Langsmith tracing disabled');
			}
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
