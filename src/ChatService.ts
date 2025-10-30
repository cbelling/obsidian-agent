import Anthropic from '@anthropic-ai/sdk';
import { Message } from './types';

export class ChatService {
	private client: Anthropic | null = null;

	constructor(private apiKey: string) {
		if (apiKey) {
			this.client = new Anthropic({
				apiKey: apiKey,
				dangerouslyAllowBrowser: true,
			});
		}
	}

	updateApiKey(apiKey: string): void {
		this.apiKey = apiKey;
		if (apiKey) {
			this.client = new Anthropic({
				apiKey: apiKey,
				dangerouslyAllowBrowser: true,
			});
		} else {
			this.client = null;
		}
	}

	async sendMessage(messages: Message[]): Promise<string> {
		if (!this.client) {
			throw new Error('API key not configured. Please set your Anthropic API key in settings.');
		}

		if (!messages || messages.length === 0) {
			throw new Error('No messages to send');
		}

		try {
			const formattedMessages = this.formatMessages(messages);

			const response = await this.client.messages.create({
				model: 'claude-sonnet-4-5',
				max_tokens: 4096,
				messages: formattedMessages,
			});

			// Extract text content from the response
			if (response.content && response.content.length > 0) {
				const textContent = response.content.find(
					(block) => block.type === 'text'
				);
				if (textContent && textContent.type === 'text') {
					return textContent.text;
				}
			}

			throw new Error('No text content in response');
		} catch (error) {
			if (error instanceof Anthropic.APIError) {
				throw new Error(`API Error: ${error.message}`);
			}
			throw error;
		}
	}

	private formatMessages(messages: Message[]): Array<{
		role: 'user' | 'assistant';
		content: string;
	}> {
		return messages.map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));
	}
}
