import { useState, ReactNode } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    Popover,
    PopoverTrigger,
} from "@/components/ui/popover";
import { InlineEditor } from "./InlineEditor";
import { Edit, Loader2 } from "lucide-react";

interface ComponentWrapperProps {
    children: ReactNode;
    specKey: string;
    onEdit?: (specKey: string, prompt: string) => Promise<void>;
}

export function ComponentWrapper({ children, specKey, onEdit }: ComponentWrapperProps) {
    console.log("ComponentWrapper mounted for:", specKey);
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleEdit = async (prompt: string) => {
        if (!onEdit) return;
        setLoading(true);
        try {
            await onEdit(specKey, prompt);
            setEditOpen(false);
        } catch (error) {
            console.error("Edit failed:", error);
            // Ideally show toast/alert here
        } finally {
            setLoading(false);
        }
    };

    if (!onEdit) return <>{children}</>;

    return (
        <Popover open={editOpen} onOpenChange={setEditOpen}>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <PopoverTrigger asChild>
                        <div
                            className={loading ? "opacity-50 pointer-events-none transition-opacity relative" : "relative"}
                        >
                            {children}
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] z-50">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                    </PopoverTrigger>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Component...
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <InlineEditor
                open={editOpen}
                onOpenChange={setEditOpen}
                onSubmit={handleEdit}
                loading={loading}
            />
        </Popover>
    );
}
