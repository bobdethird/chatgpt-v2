
import { useState, useEffect, useCallback } from "react";
import { type UIMessage } from "ai";

export type ChatSession = {
    id: string;
    title: string;
    messages: UIMessage[];
    updatedAt: number;
};

const STORAGE_KEY = "chatgpt-v2-chats";

export function useLocalChat() {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setChats(parsed);
            } catch (e) {
                console.error("Failed to parse chats", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever chats change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        }
    }, [chats, isLoaded]);

    const createChat = useCallback(() => {
        const newId = crypto.randomUUID();
        const newChat: ChatSession = {
            id: newId,
            title: "New Chat",
            messages: [],
            updatedAt: Date.now(),
        };
        setChats((prev) => [newChat, ...prev]);
        setCurrentChatId(newId);
        return newId;
    }, []);

    const selectChat = useCallback((id: string) => {
        setCurrentChatId(id);
    }, []);

    const deleteChat = useCallback((id: string) => {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (currentChatId === id) {
            setCurrentChatId(null);
        }
    }, [currentChatId]);

    const saveMessages = useCallback(
        (chatId: string, messages: UIMessage[]) => {
            setChats((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        // Generate a title if it's "New Chat" and we have a user message
                        let title = chat.title;
                        if (chat.title === "New Chat" && messages.length > 0) {
                            const firstUserMsg = messages.find((m) => m.role === "user");
                            if (firstUserMsg) {
                                // Cast to any to access content safely if type definition is strict
                                const content = (firstUserMsg as any).content;
                                let title = "";

                                if (typeof content === 'string') {
                                    title = content;
                                } else if (Array.isArray((firstUserMsg as any).parts)) {
                                    const parts = (firstUserMsg as any).parts;
                                    const textPart = parts.find((p: any) => p.type === 'text');
                                    if (textPart) {
                                        title = textPart.text;
                                    }
                                }

                                if (title) {
                                    // Truncate cleanly
                                    //@ts-ignore
                                    title = title.slice(0, 40);
                                }

                                if (title) {
                                    // Updating the title only if we found valid text
                                    return {
                                        ...chat,
                                        messages,
                                        title,
                                        updatedAt: Date.now(),
                                    };
                                }
                            }
                        }
                        return {
                            ...chat,
                            messages,
                            updatedAt: Date.now(),
                        };
                    }
                    return chat;
                })
            );
        },
        []
    );

    return {
        chats,
        currentChatId,
        setCurrentChatId,
        createChat,
        selectChat,
        deleteChat,
        saveMessages,
        isLoaded,
        currentChat: chats.find((c) => c.id === currentChatId) || null,
    };
}
