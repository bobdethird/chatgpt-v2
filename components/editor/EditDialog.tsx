import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (prompt: string) => void;
    loading?: boolean;
}

export function EditDialog({ open, onOpenChange, onSubmit, loading }: EditDialogProps) {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = () => {
        if (!prompt.trim()) return;
        onSubmit(prompt);
        setPrompt("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Component</DialogTitle>
                    <DialogDescription>
                        Describe how you want to change this component.
                        The surrounding layout will remain the same.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Change the chart color to red, add a title..."
                        className="h-32"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !prompt.trim()}>
                        {loading ? "Updating..." : "Update Component"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
