import { GoogleGenAI } from "@google/genai";
import { ChatThread, OpenWebUIConfig } from "../types";

export class OpenWebUIClient {
  private geminiClient: GoogleGenAI | null = null;
  private owaConfig: OpenWebUIConfig | null = null;

  constructor() {}

  updateGeminiKey(key: string) {
    if (key) this.geminiClient = new GoogleGenAI({ apiKey: key });
  }

  updateOWAConfig(config: OpenWebUIConfig) {
    // Ensure no trailing slash
    const cleanUrl = config.baseUrl.replace(/\/$/, "");
    this.owaConfig = { ...config, baseUrl: cleanUrl };
  }

  async getChats(): Promise<ChatThread[]> {
    if (!this.owaConfig) return [];

    try {
      const response = await fetch(`${this.owaConfig.baseUrl}/api/v1/chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.owaConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error("Failed to fetch chats");
      
      const data = await response.json();
      // OpenWebUI returns an array of chats. We map them to our simple interface.
      // Depending on version, it might be data or data.chats
      const list = Array.isArray(data) ? data : (data.chats || []);
      
      return list.map((c: any) => ({
        id: c.id,
        title: c.title || c.name || "Untitled Chat"
      })).sort((a: ChatThread, b: ChatThread) => a.title.localeCompare(b.title));

    } catch (e) {
      console.error("Failed to fetch OWA chats:", e);
      return [];
    }
  }

  async postMessage(chatId: string, prompt: string, context?: string): Promise<string> {
    // 1. Try OpenWebUI if configured
    if (this.owaConfig && chatId !== 'general' && chatId !== 'simulation') {
      try {
        const fullPrompt = context ? `[SYSTEM CONTEXT: ${context}]\n\n${prompt}` : prompt;

        const response = await fetch(`${this.owaConfig.baseUrl}/api/v1/chats/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.owaConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
                { role: 'user', content: fullPrompt }
            ],
            // Some OWA versions might trigger generation automatically on message add
            // Others might require a separate completion call.
            // Assuming modern OpenWebUI behavior where adding a user message triggers response stream.
          })
        });

        if (!response.ok) throw new Error(`OWA Error: ${response.statusText}`);
        
        const data = await response.json();
        // Try to find the assistant response in the returned data
        // If the API only returns the inserted message, we might not get the response immediately without streaming.
        // For this architecture, if we don't get a text response, we'll mark it.
        
        if (data && data.content) return data.content;
        // Fallback if data structure differs
        return "Message sent to OpenWebUI. (Check OWA for response)";

      } catch (error) {
        console.error("OpenWebUI Post Failed:", error);
        return `ERROR: Could not connect to OpenWebUI at ${this.owaConfig.baseUrl}.`;
      }
    }

    // 2. Fallback to Gemini Simulation
    if (!this.geminiClient) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return `[SIMULATION MODE]\nNo OpenWebUI Configured & No Gemini Key.\n\nPrompt: "${prompt}"`;
    }

    try {
      const response = await this.geminiClient.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: prompt,
        config: {
          systemInstruction: context || "You are an autonomous AI agent.",
        }
      });
      return response.text || "No response generated.";
    } catch (error) {
      console.error("Agent Error:", error);
      throw new Error("Failed to contact Agent Core.");
    }
  }
}

export const openWebUi = new OpenWebUIClient();