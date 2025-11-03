export interface Message {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
}

export interface ClaudeChatSettings {
	apiKey: string;
	langsmithApiKey: string;
	langsmithProject: string;
	langsmithEnabled: boolean;
	// Data retention settings
	retentionDays: number;
	maxHistorySize: number;
	enableAutoCleanup: boolean;
}

export const DEFAULT_SETTINGS: ClaudeChatSettings = {
	apiKey: '',
	langsmithApiKey: '',
	langsmithProject: 'obsidian-agent',
	langsmithEnabled: false,
	retentionDays: 30,
	maxHistorySize: 100,
	enableAutoCleanup: true
};

export const VIEW_TYPE_CHAT = 'claude-chat-view';
