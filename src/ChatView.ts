import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice } from 'obsidian';
import { VIEW_TYPE_CHAT, Message } from './types';
import { ChatService } from './ChatService';
import ClaudeChatPlugin from './main';

export class ChatView extends ItemView {
	private messages: Message[] = [];
	private chatService: ChatService;
	private plugin: ClaudeChatPlugin;
	private messagesContainer: HTMLElement | null = null;
	private inputEl: HTMLTextAreaElement | null = null;
	private sendButton: HTMLButtonElement | null = null;
	private isLoading: boolean = false;

	constructor(leaf: WorkspaceLeaf, plugin: ClaudeChatPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.chatService = new ChatService(plugin.settings.apiKey);
	}

	getViewType(): string {
		return VIEW_TYPE_CHAT;
	}

	getDisplayText(): string {
		return 'Claude Chat';
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
		header.createEl('h4', { text: 'Claude Chat' });

		// Create messages container
		this.messagesContainer = container.createDiv({ cls: 'claude-chat-messages' });

		// Create input container
		const inputContainer = container.createDiv({ cls: 'claude-chat-input-container' });

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

		// Display welcome message
		this.displayWelcomeMessage();
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}

	updateApiKey(apiKey: string): void {
		this.chatService.updateApiKey(apiKey);
	}

	private displayWelcomeMessage(): void {
		if (this.messagesContainer) {
			const welcomeDiv = this.messagesContainer.createDiv({ cls: 'claude-chat-welcome' });
			welcomeDiv.createEl('p', {
				text: 'Welcome to Claude Chat! Start a conversation below.',
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
			// Get response from Claude
			const response = await this.chatService.sendMessage(this.messages);

			// Add assistant message
			const assistantMessage: Message = {
				role: 'assistant',
				content: response,
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
