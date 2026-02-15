import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface InlineEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (prompt: string) => Promise<void>;
    loading?: boolean;
    targetRef?: React.RefObject<HTMLElement | null>;
}

export function InlineEditor({
    open,
    onOpenChange,
    onSubmit,
    loading,
    targetRef,
}: InlineEditorProps) {
    const [prompt, setPrompt] = useState("");
    const [position, setPosition] = useState({ top: 0, right: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim() || loading) return;
        await onSubmit(prompt);
        setPrompt("");
        onOpenChange(false);
    }, [prompt, loading, onSubmit, onOpenChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === "Escape") {
            onOpenChange(false);
        }
    };

    // Calculate position based on target component
    useEffect(() => {
        if (open && targetRef?.current) {
            const rect = targetRef.current.getBoundingClientRect();
            // Position at top-right of the component
            setPosition({
                top: rect.top + window.scrollY,
                right: window.innerWidth - rect.right + window.scrollX,
            });
        }
    }, [open, targetRef]);

    // Auto-focus input when opening
    useEffect(() => {
        if (open && inputRef.current) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                onOpenChange(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <div
            ref={containerRef}
            className="fixed z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
                top: `${position.top}px`,
                right: `${position.right}px`,
                maxWidth: "400px",
                minWidth: "320px",
            }}
        >
            <div className="flex items-center gap-2 bg-background border border-border rounded-3xl shadow-lg px-4 py-2.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your changes..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                {loading ? (
                    <div className="text-xs text-muted-foreground">Updating...</div>
                ) : (
                    <button
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 px-4">
                Press Enter to submit • Esc to cancel
            </p>
        </div>
    );
}
