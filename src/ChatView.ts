import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice } from 'obsidian';
import { VIEW_TYPE_CHAT, Message } from './types';
import ClaudeChatPlugin from './main';
import { ObsidianAgent } from './agent/AgentGraph';
import { HumanMessage } from "@langchain/core/messages";
import { createVaultTools } from './vault/VaultTools';

export class ChatView extends ItemView {
	private messages: Message[] = [];
	private agent: ObsidianAgent | null = null;
	private plugin: ClaudeChatPlugin;
	private messagesContainer: HTMLElement | null = null;
	private inputEl: HTMLTextAreaElement | null = null;
	private sendButton: HTMLButtonElement | null = null;
	private isLoading: boolean = false;
	private threadId: string | null = null; // Current thread ID
	private isThreadListView: boolean = false; // Toggle between thread list and chat view
	private threadListContainer: HTMLElement | null = null;
	private chatContainer: HTMLElement | null = null;
	private backButton: HTMLButtonElement | null = null;
	private newChatButton: HTMLButtonElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ClaudeChatPlugin) {
		super(leaf);
		this.plugin = plugin;
		if (plugin.settings.apiKey && plugin.vaultService && plugin.checkpointService) {
			const vaultTools = createVaultTools(plugin.vaultService);
			this.agent = new ObsidianAgent(
				plugin.settings.apiKey,
				vaultTools,
				plugin.checkpointService,
				plugin.settings.langsmithEnabled
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
		const titleEl = header.createEl('h4', { text: 'Obsidian Agent' });

		// Add New Chat button to header
		this.newChatButton = header.createEl('button', {
			text: '+ New Chat',
			cls: 'claude-new-chat-button'
		});
		this.newChatButton.addEventListener('click', () => this.handleNewChat());

		// Create thread list container (initially hidden)
		this.threadListContainer = container.createDiv({ cls: 'claude-thread-list' });
		this.threadListContainer.style.display = 'none';

		// Create chat container
		this.chatContainer = container.createDiv({ cls: 'claude-chat-container' });

		// Create messages container inside chat container
		this.messagesContainer = this.chatContainer.createDiv({ cls: 'claude-chat-messages' });

		// Load existing conversation history
		await this.loadConversationHistory();

		// Show back button when in chat view (if there are threads)
		if (this.plugin.checkpointService) {
			const threads = this.plugin.checkpointService.listThreads();
			if (threads.length > 0 && this.backButton) {
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
				this.handleSendMessage();
			}
		});

		// Create button container
		const buttonContainer = inputContainer.createDiv({ cls: 'claude-chat-buttons' });

		// Create send button
		this.sendButton = buttonContainer.createEl('button', {
			text: 'Send',
			cls: 'mod-cta'
		});
		this.sendButton.addEventListener('click', () => this.handleSendMessage());

		// Create clear button
		const clearButton = buttonContainer.createEl('button', {
			text: 'Clear',
		});
		clearButton.addEventListener('click', () => this.handleClear());

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
				this.plugin.checkpointService,
				this.plugin.settings.langsmithEnabled
			);
		}
	}

	private async loadConversationHistory(): Promise<void> {
		if (!this.agent || !this.plugin.checkpointService) {
			console.log('[ChatView] No agent or checkpoint service, showing welcome');
			this.displayWelcomeMessage();
			return;
		}

		// If no thread ID, try to load the most recent thread, or create a new one
		if (!this.threadId) {
			const threads = this.plugin.checkpointService.listThreads();
			if (threads.length > 0) {
				// Load most recent thread
				this.threadId = threads[0].threadId;
				console.log('[ChatView] Loading most recent thread:', this.threadId);
			} else {
				// Create a new thread
				this.threadId = await this.plugin.checkpointService.createThread();
				console.log('[ChatView] Created new thread:', this.threadId);
				this.displayWelcomeMessage();
				return;
			}
		}

		console.log('[ChatView] Loading conversation history for thread:', this.threadId);

		try {
			// Get the latest checkpoint for this thread
			const config = {
				configurable: { thread_id: this.threadId }
			};

			console.log('[ChatView] Fetching checkpoint with config:', config);
			const checkpoint = await this.plugin.checkpointService.getTuple(config);
			console.log('[ChatView] Checkpoint result:', checkpoint);

			if (checkpoint) {
				console.log('[ChatView] Checkpoint structure:', {
					hasCheckpoint: !!checkpoint.checkpoint,
					hasChannelValues: !!checkpoint.checkpoint?.channel_values,
					channelValues: checkpoint.checkpoint?.channel_values,
					keys: checkpoint.checkpoint?.channel_values ? Object.keys(checkpoint.checkpoint.channel_values) : [],
					messagesType: typeof checkpoint.checkpoint?.channel_values?.messages,
					messagesIsArray: Array.isArray(checkpoint.checkpoint?.channel_values?.messages),
					messagesValue: checkpoint.checkpoint?.channel_values?.messages
				});
			}

			if (checkpoint && checkpoint.checkpoint.channel_values?.messages) {
				const messages = checkpoint.checkpoint.channel_values.messages;
				console.log('[ChatView] Messages found:', {
					type: typeof messages,
					isArray: Array.isArray(messages),
					value: messages,
					length: Array.isArray(messages) ? messages.length : 'not an array'
				});

				// Check if messages is an array (not empty object)
				if (Array.isArray(messages) && messages.length > 0) {
					console.log(`[ChatView] Found ${messages.length} messages in checkpoint`);

					// Clear existing messages in UI
					this.messages = [];

					// Display each message
					for (const msg of messages) {
					// Convert LangChain message to our Message format
					const role = msg._getType() === 'human' ? 'user' : 'assistant';
					const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

					const message: Message = {
						role: role as 'user' | 'assistant',
						content: content,
						timestamp: Date.now() // We don't have original timestamp, use current
					};

					this.messages.push(message);
					await this.displayMessage(message);
				}

					console.log(`[ChatView] Loaded ${messages.length} messages from checkpoint`);
				} else {
					// Messages is empty or not an array
					console.log('[ChatView] No messages found in checkpoint, showing welcome');
					this.displayWelcomeMessage();
				}
			} else {
				// No checkpoint found, show welcome message
				console.log('[ChatView] No checkpoint or messages found, showing welcome');
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
		if (!this.inputEl || !this.messagesContainer) return;

		const content = this.inputEl.value.trim();
		if (!content) return;

		if (!this.plugin.settings.apiKey || this.plugin.settings.apiKey.trim() === '') {
			new Notice('Please configure your Anthropic API key in settings');
			return;
		}

		if (this.isLoading) return;

		// Clear input
		this.inputEl.value = '';

		// Add user message
		const userMessage: Message = {
			role: 'user',
			content: content,
			timestamp: Date.now()
		};
		this.messages.push(userMessage);
		await this.displayMessage(userMessage);

		// Set loading state
		this.setLoading(true);

		try {
			if (!this.agent) {
				throw new Error('Agent not initialized');
			}

			// Convert to LangChain message format
			const langChainMessages = [new HumanMessage(content)];

			// Call agent with thread ID for persistence and Langsmith metadata
			const config = {
				configurable: { thread_id: this.threadId },
				// Add Langsmith-specific metadata and tags
				metadata: {
					thread_id: this.threadId,
					vault_name: this.app.vault.getName(),
					user_message_length: content.length,
					timestamp: new Date().toISOString()
				},
				tags: ["obsidian", "vault-interaction", "user-query"]
			};

			const result = await this.agent.invoke({
				messages: langChainMessages
			}, config);

			// Extract assistant response from result
			const lastMessage = result.messages[result.messages.length - 1];
			const responseContent = typeof lastMessage.content === 'string'
				? lastMessage.content
				: JSON.stringify(lastMessage.content);

			// Add assistant message
			const assistantMessage: Message = {
				role: 'assistant',
				content: responseContent,
				timestamp: Date.now()
			};
			this.messages.push(assistantMessage);
			await this.displayMessage(assistantMessage);

		} catch (error) {
			console.error('Error sending message:', error);
			let errorMessage = 'An error occurred while sending the message.';

			if (error instanceof Error) {
				errorMessage = error.message;
			}

			new Notice(errorMessage);

			// Display error in chat
			const errorDiv = this.messagesContainer.createDiv({ cls: 'claude-chat-error' });
			errorDiv.createEl('p', { text: `Error: ${errorMessage}` });
			this.scrollToBottom();
		} finally {
			this.setLoading(false);
		}
	}

	private async handleNewChat(): Promise<void> {
		if (!this.messagesContainer || !this.plugin.checkpointService) return;

		// Confirm if there are unsaved messages in current thread
		if (this.messages.length > 0) {
			const confirmed = confirm('Start a new conversation? Your current conversation will be saved.');
			if (!confirmed) return;
		}

		// Create a new thread
		const newThreadId = await this.plugin.checkpointService.createThread();
		this.threadId = newThreadId;

		// Clear UI and show welcome
		this.messages = [];
		this.messagesContainer.empty();
		this.displayWelcomeMessage();

		// Switch to chat view if in thread list
		if (this.isThreadListView) {
			this.showChatView();
		}

		console.log(`[ChatView] Started new chat with thread ID: ${newThreadId}`);
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
		if (!this.threadListContainer || !this.plugin.checkpointService) return;

		this.threadListContainer.empty();

		const threads = this.plugin.checkpointService.listThreads();

		if (threads.length === 0) {
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

		for (const thread of threads) {
			const threadItem = listDiv.createDiv({ cls: 'claude-thread-item' });

			// Add active indicator if this is the current thread
			if (thread.threadId === this.threadId) {
				threadItem.addClass('claude-thread-item-active');
			}

			const threadInfo = threadItem.createDiv({ cls: 'claude-thread-info' });

			// Thread title
			threadInfo.createEl('div', {
				text: thread.title,
				cls: 'claude-thread-title'
			});

			// Thread metadata
			const metaDiv = threadInfo.createDiv({ cls: 'claude-thread-meta' });
			const date = new Date(thread.updatedAt);
			metaDiv.createEl('span', {
				text: `${thread.messageCount} messages • ${date.toLocaleDateString()}`,
				cls: 'claude-thread-meta-text'
			});

			// Click handler to load thread
			threadItem.addEventListener('click', () => this.loadThread(thread.threadId));
		}
	}

	private async loadThread(threadId: string): Promise<void> {
		if (!this.messagesContainer) return;

		this.threadId = threadId;
		this.messages = [];
		this.messagesContainer.empty();

		// Load conversation history for this thread
		await this.loadConversationHistory();

		// Switch to chat view
		this.showChatView();

		console.log(`[ChatView] Loaded thread: ${threadId}`);
	}

	private handleClear(): void {
		if (!this.messagesContainer) return;

		// Confirm with user
		if (this.messages.length > 0) {
			const confirmed = confirm('Are you sure you want to clear the conversation?');
			if (!confirmed) return;
		}

		// Clear messages
		this.messages = [];
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
