import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice } from 'obsidian';
import { VIEW_TYPE_CHAT, Message } from './types';
import ClaudeChatPlugin from './main';
import { ObsidianAgent } from './agent/AgentGraph';
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { createVaultTools } from './vault/VaultTools';
import { ConversationManager } from './state/ConversationManager';

export class ChatView extends ItemView {
	private agent: ObsidianAgent | null = null;
	private conversationManager: ConversationManager | null = null;
	private plugin: ClaudeChatPlugin;
	private messagesContainer: HTMLElement | null = null;
	private inputEl: HTMLTextAreaElement | null = null;
	private sendButton: HTMLButtonElement | null = null;
	private isLoading: boolean = false;
	private isThreadListView: boolean = false; // Toggle between thread list and chat view
	private threadListContainer: HTMLElement | null = null;
	private chatContainer: HTMLElement | null = null;
	private backButton: HTMLButtonElement | null = null;
	private newChatButton: HTMLButtonElement | null = null;
	private streamingMessageEl: HTMLElement | null = null; // Element for streaming message
	private streamingMessageContent: string = ''; // Accumulated streaming content

	constructor(leaf: WorkspaceLeaf, plugin: ClaudeChatPlugin) {
		super(leaf);
		this.plugin = plugin;

		// Initialize ConversationManager
		if (plugin.conversationManager) {
			this.conversationManager = plugin.conversationManager;
		}

		// Initialize Agent
		if (plugin.settings.apiKey && plugin.vaultService && plugin.checkpointService) {
			const vaultTools = createVaultTools(plugin.vaultService);
			this.agent = new ObsidianAgent(
				plugin.settings.apiKey,
				vaultTools,
				plugin.checkpointService
			);
		}
	}

	getViewType(): string {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText(): string {
		return 'Obsidian Agent';
	}

	getIcon(): string {
		return 'message-circle';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('claude-chat-view');

		// Create header
		const header = container.createDiv({ cls: 'claude-chat-header' });

		// Back arrow button (initially hidden, shown in chat view)
		this.backButton = header.createEl('button', {
			text: '← Chats',
			cls: 'claude-back-button'
		});
		this.backButton.style.display = 'none';
		this.backButton.addEventListener('click', () => this.showThreadList());

		// Title
		header.createEl('h4', { text: 'Obsidian Agent' });

		// Add New Chat button to header
		this.newChatButton = header.createEl('button', {
			text: '+ New Chat',
			cls: 'claude-new-chat-button'
		});
		this.newChatButton.addEventListener('click', () => void this.handleNewChat());

		// Create thread list container (initially hidden)
		this.threadListContainer = container.createDiv({ cls: 'claude-thread-list' });
		this.threadListContainer.style.display = 'none';

		// Create chat container
		this.chatContainer = container.createDiv({ cls: 'claude-chat-container' });

		// Create messages container inside chat container
		this.messagesContainer = this.chatContainer.createDiv({ cls: 'claude-chat-messages' });

		// Load existing conversation history
		await this.loadConversationHistory();

		// Show back button when in chat view (if there are conversations)
		if (this.conversationManager) {
			const conversations = this.conversationManager.listConversations();
			if (conversations.length > 0 && this.backButton) {
				this.backButton.style.display = 'inline-block';
			}
		}

		// Create input container (inside chat container)
		const inputContainer = this.chatContainer.createDiv({ cls: 'claude-chat-input-container' });

		// Create textarea
		this.inputEl = inputContainer.createEl('textarea', {
			cls: 'claude-chat-input',
			attr: {
				placeholder: 'Type a message...',
				rows: '3'
			}
		});

		// Handle Enter key (with Shift+Enter for new lines)
		this.inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void this.handleSendMessage();
			}
		});

		// Create button container
		const buttonContainer = inputContainer.createDiv({ cls: 'claude-chat-buttons' });

		// Create send button
		this.sendButton = buttonContainer.createEl('button', {
			text: 'Send',
			cls: 'mod-cta'
		});
		this.sendButton.addEventListener('click', () => void this.handleSendMessage());

		// Create clear button
		const clearButton = buttonContainer.createEl('button', {
			text: 'Clear',
		});
		clearButton.addEventListener('click', () => void this.handleClear());

		// Note: Welcome message is displayed by loadConversationHistory() if needed
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}

	updateApiKey(apiKey: string): void {
		if (this.plugin.vaultService && this.plugin.checkpointService) {
			const vaultTools = createVaultTools(this.plugin.vaultService);
			this.agent = new ObsidianAgent(
				apiKey,
				vaultTools,
				this.plugin.checkpointService
			);
		}
	}

	private async loadConversationHistory(): Promise<void> {
		if (!this.agent || !this.conversationManager) {
			console.log('[ChatView] No agent or conversation manager, showing welcome');
			this.displayWelcomeMessage();
			return;
		}

		try {
			console.log('[ChatView] Loading conversation history...');

			// Load most recent conversation or create new one
			const conversation = await this.conversationManager.loadMostRecentOrCreate();
			console.log(`[ChatView] Loaded conversation: ${conversation.id} with ${conversation.messageCount} messages`);

			if (conversation.messages.length > 0) {
				// Display each message
				for (const msg of conversation.messages) {
					// Convert LangChain message to our Message format
					const role = msg._getType() === 'human' ? 'user' : 'assistant';
					const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

					const message: Message = {
						role: role,
						content: content,
						timestamp: Date.now() // We don't have original timestamp, use current
					};

					await this.displayMessage(message);
				}

				console.log(`[ChatView] Displayed ${conversation.messages.length} messages`);
			} else {
				// New conversation, show welcome message
				this.displayWelcomeMessage();
			}
		} catch (error) {
			console.error('[ChatView] Error loading conversation history:', error);
			this.displayWelcomeMessage();
		}
	}

	private displayWelcomeMessage(): void {
		if (this.messagesContainer) {
			const welcomeDiv = this.messagesContainer.createDiv({ cls: 'claude-chat-welcome' });
			welcomeDiv.createEl('p', {
				text: 'Welcome to Obsidian Agent! Start a conversation below.',
				cls: 'claude-chat-welcome-text'
			});

			if (!this.plugin.settings.apiKey) {
				const warningDiv = welcomeDiv.createDiv({ cls: 'claude-chat-warning' });
				warningDiv.createEl('p', {
					text: '⚠️ Please configure your Anthropic API key in settings to start chatting.'
				});
			}
		}
	}

	private async handleSendMessage(): Promise<void> {
		if (!this.inputEl || !this.messagesContainer || !this.conversationManager) return;

		const content = this.inputEl.value.trim();
		if (!content) return;

		if (!this.plugin.settings.apiKey || this.plugin.settings.apiKey.trim() === '') {
			new Notice('Please configure your Anthropic API key in settings');
			return;
		}

		if (this.isLoading) return;

		// Clear input
		this.inputEl.value = '';

		// Display user message in UI
		const userMessage: Message = {
			role: 'user',
			content: content,
			timestamp: Date.now()
		};
		await this.displayMessage(userMessage);

		// Set loading state
		this.setLoading(true);

		try {
			if (!this.agent) {
				throw new Error('Agent not initialized');
			}

			// Convert to LangChain message format
			const langChainMessages = [new HumanMessage(content)];

			// Get config from ConversationManager with metadata
			const config = this.conversationManager.getAgentConfig({
				vault_name: this.app.vault.getName(),
				user_message_length: content.length,
				timestamp: new Date().toISOString()
			});

			// Add tags for Langsmith
			config.tags = ["obsidian", "vault-interaction", "user-query"];

			// Create streaming message container
			this.createStreamingMessage();

			// Use streaming invoke
			const responseContent = await this.agent.invokeStream(
				{ messages: langChainMessages },
				config,
				(chunk: string) => {
					this.appendToStreamingMessage(chunk);
				},
				(toolName: string, toolInput: Record<string, unknown>) => {
					console.log(`[ChatView] Tool used: ${toolName}`, toolInput);
				}
			);

			// Finalize streaming message (re-render with markdown)
			await this.finalizeStreamingMessage();

			// Sync conversation state (manually construct result for compatibility)
			this.conversationManager.syncFromAgentResult([
				new HumanMessage(content),
				{ _getType: () => 'ai' as const, content: responseContent } as BaseMessage
			]);

		} catch (error) {
			console.error('Error sending message:', error);
			let errorMessage = 'An error occurred while sending the message.';

			if (error instanceof Error) {
				errorMessage = error.message;
			}

			new Notice(errorMessage);

			// Clean up streaming message if exists
			if (this.streamingMessageEl) {
				this.streamingMessageEl.remove();
				this.streamingMessageEl = null;
			}

			// Display error in chat
			const errorDiv = this.messagesContainer.createDiv({ cls: 'claude-chat-error' });
			errorDiv.createEl('p', { text: `Error: ${errorMessage}` });
			this.scrollToBottom();
		} finally {
			this.setLoading(false);
		}
	}

	/**
	 * Create a placeholder message element for streaming content
	 */
	private createStreamingMessage(): void {
		if (!this.messagesContainer) return;

		const messageDiv = this.messagesContainer.createDiv({
			cls: 'claude-chat-message claude-chat-message-assistant'
		});

		this.streamingMessageEl = messageDiv.createDiv({ cls: 'claude-chat-message-content' });
		this.streamingMessageContent = '';

		// Add timestamp
		const timestamp = new Date();
		const timeDiv = messageDiv.createDiv({ cls: 'claude-chat-message-time' });
		timeDiv.setText(timestamp.toLocaleTimeString());
	}

	/**
	 * Append a text chunk to the streaming message
	 */
	private appendToStreamingMessage(chunk: string): void {
		if (!this.streamingMessageEl) return;

		this.streamingMessageContent += chunk;

		// Update the text content (plain text while streaming)
		this.streamingMessageEl.setText(this.streamingMessageContent);

		// Auto-scroll to bottom
		this.scrollToBottom();
	}

	/**
	 * Finalize the streaming message by re-rendering with markdown
	 */
	private async finalizeStreamingMessage(): Promise<void> {
		if (!this.streamingMessageEl) return;

		// Clear and re-render with markdown
		const content = this.streamingMessageContent;
		this.streamingMessageEl.empty();

		await MarkdownRenderer.render(
			this.app,
			content,
			this.streamingMessageEl,
			'',
			this.plugin
		);

		// Reset streaming state
		this.streamingMessageEl = null;
		this.streamingMessageContent = '';

		this.scrollToBottom();
	}

	private async handleNewChat(): Promise<void> {
		if (!this.messagesContainer || !this.conversationManager) return;

		// Confirm if there are messages in current conversation
		const currentConversation = await this.conversationManager.getCurrentConversation();
		if (currentConversation && currentConversation.messageCount > 0) {
			const confirmed = confirm('Start a new conversation? Your current conversation will be saved.');
			if (!confirmed) return;
		}

		// Create a new conversation
		const conversation = await this.conversationManager.createConversation();

		// Clear UI and show welcome
		this.messagesContainer.empty();
		this.displayWelcomeMessage();

		// Switch to chat view if in thread list
		if (this.isThreadListView) {
			this.showChatView();
		}

		console.log(`[ChatView] Started new chat with conversation ID: ${conversation.id}`);
	}

	private showThreadList(): void {
		if (!this.threadListContainer || !this.chatContainer) return;

		// Switch to thread list view
		this.isThreadListView = true;
		this.chatContainer.style.display = 'none';
		this.threadListContainer.style.display = 'flex';

		// Update header buttons
		if (this.backButton) this.backButton.style.display = 'none';
		if (this.newChatButton) this.newChatButton.style.display = 'inline-block';

		// Render thread list
		this.renderThreadList();
	}

	private showChatView(): void {
		if (!this.threadListContainer || !this.chatContainer) return;

		// Switch to chat view
		this.isThreadListView = false;
		this.chatContainer.style.display = 'flex';
		this.threadListContainer.style.display = 'none';

		// Update header buttons
		if (this.backButton) this.backButton.style.display = 'inline-block';
		if (this.newChatButton) this.newChatButton.style.display = 'inline-block';
	}

	private renderThreadList(): void {
		if (!this.threadListContainer || !this.conversationManager) return;

		this.threadListContainer.empty();

		const conversations = this.conversationManager.listConversations();

		if (conversations.length === 0) {
			const emptyDiv = this.threadListContainer.createDiv({ cls: 'claude-thread-list-empty' });
			emptyDiv.createEl('p', { text: 'No conversations yet' });
			emptyDiv.createEl('p', {
				text: 'Click "+ New Chat" to start your first conversation',
				cls: 'claude-thread-list-empty-hint'
			});
			return;
		}

		// Create scrollable list
		const listDiv = this.threadListContainer.createDiv({ cls: 'claude-thread-list-scroll' });

		const currentThreadId = this.conversationManager.getCurrentThreadId();

		for (const conversation of conversations) {
			const threadItem = listDiv.createDiv({ cls: 'claude-thread-item' });

			// Add active indicator if this is the current conversation
			if (conversation.id === currentThreadId) {
				threadItem.addClass('claude-thread-item-active');
			}

			const threadInfo = threadItem.createDiv({ cls: 'claude-thread-info' });

			// Thread title
			threadInfo.createEl('div', {
				text: conversation.title,
				cls: 'claude-thread-title'
			});

			// Thread metadata
			const metaDiv = threadInfo.createDiv({ cls: 'claude-thread-meta' });
			const date = new Date(conversation.updatedAt);
			metaDiv.createEl('span', {
				text: `${conversation.messageCount} messages • ${date.toLocaleDateString()}`,
				cls: 'claude-thread-meta-text'
			});

			// Click handler to load conversation
			threadItem.addEventListener('click', () => void this.loadThread(conversation.id));
		}
	}

	private async loadThread(threadId: string): Promise<void> {
		if (!this.messagesContainer || !this.conversationManager) return;

		// Clear UI
		this.messagesContainer.empty();

		// Load conversation
		const conversation = await this.conversationManager.loadConversation(threadId);

		if (conversation) {
			// Display messages
			for (const msg of conversation.messages) {
				const role = msg._getType() === 'human' ? 'user' : 'assistant';
				const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

				const message: Message = {
					role: role,
					content: content,
					timestamp: Date.now()
				};

				await this.displayMessage(message);
			}

			console.log(`[ChatView] Loaded conversation: ${threadId} with ${conversation.messages.length} messages`);
		} else {
			console.error(`[ChatView] Failed to load conversation: ${threadId}`);
			this.displayWelcomeMessage();
		}

		// Switch to chat view
		this.showChatView();
	}

	private async handleClear(): Promise<void> {
		if (!this.messagesContainer || !this.conversationManager) return;

		// Check if there are messages in current conversation
		const currentConversation = await this.conversationManager.getCurrentConversation();
		if (currentConversation && currentConversation.messageCount > 0) {
			const confirmed = confirm('Are you sure you want to clear the conversation?');
			if (!confirmed) return;
		}

		// Clear UI
		this.messagesContainer.empty();
		this.displayWelcomeMessage();
	}

	private async displayMessage(message: Message): Promise<void> {
		if (!this.messagesContainer) return;

		const messageDiv = this.messagesContainer.createDiv({
			cls: `claude-chat-message claude-chat-message-${message.role}`
		});

		const contentDiv = messageDiv.createDiv({ cls: 'claude-chat-message-content' });

		// Render markdown content
		await MarkdownRenderer.render(
			this.app,
			message.content,
			contentDiv,
			'',
			this.plugin
		);

		// Add timestamp (optional, hidden by default)
		const timestamp = new Date(message.timestamp);
		const timeDiv = messageDiv.createDiv({ cls: 'claude-chat-message-time' });
		timeDiv.setText(timestamp.toLocaleTimeString());

		this.scrollToBottom();
	}

	private setLoading(loading: boolean): void {
		this.isLoading = loading;

		if (this.sendButton) {
			this.sendButton.disabled = loading;
			this.sendButton.setText(loading ? 'Sending...' : 'Send');
		}

		if (this.inputEl) {
			this.inputEl.disabled = loading;
		}

		if (loading && this.messagesContainer) {
			// Add loading indicator
			const loadingDiv = this.messagesContainer.createDiv({
				cls: 'claude-chat-loading',
				attr: { 'data-loading': 'true' }
			});
			loadingDiv.createEl('span', { text: 'Claude is thinking...' });
		} else {
			// Remove loading indicator
			const loadingDiv = this.messagesContainer?.querySelector('[data-loading="true"]');
			if (loadingDiv) {
				loadingDiv.remove();
			}
		}

		this.scrollToBottom();
	}

	private scrollToBottom(): void {
		if (this.messagesContainer) {
			this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
		}
	}
}
