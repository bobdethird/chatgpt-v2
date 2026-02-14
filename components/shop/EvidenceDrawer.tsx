import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { ShopResult } from "@/lib/shop/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface EvidenceDrawerProps {
    product: ShopResult | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EvidenceDrawer({ product, open, onOpenChange }: EvidenceDrawerProps) {
    if (!product) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle className="text-xl font-bold line-clamp-2">
                        {product.title}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-2">
                        {product.price.amount !== null && (
                            <Badge variant="outline">{product.price.currency} {product.price.amount}</Badge>
                        )}
                        <span className="text-muted-foreground">•</span>
                        <span>{product.merchant || new URL(product.url).hostname}</span>
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Key Highlights</h3>
                            <div className="flex flex-wrap gap-2">
                                {product.key_features?.map(tag => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                                {product.shipping_summary && <Badge variant="secondary">{product.shipping_summary}</Badge>}
                                {product.rating_summary.rating && (
                                    <Badge variant="secondary">Rating: {product.rating_summary.rating}/5 {product.rating_summary.count ? `(${product.rating_summary.count})` : ''}</Badge>
                                )}
                                <Badge variant={product.availability === 'in_stock' ? "default" : "destructive"}>
                                    {product.availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Source Evidence</h3>
                            {product.evidence.length > 0 ? (
                                <div className="space-y-4">
                                    {product.evidence.map((ev, idx) => (
                                        <div key={idx} className="bg-muted p-4 rounded-lg text-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase">{ev.type}</Badge>
                                            </div>
                                            {ev.snippet ? (
                                                <p className="italic text-muted-foreground">
                                                    "{ev.snippet}"
                                                </p>
                                            ) : (
                                                <p className="italic text-muted-foreground text-xs">No text snippet available</p>
                                            )}
                                            <div className="mt-4 flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{ev.source}</span>
                                                <a
                                                    href={ev.source}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    View Source
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No evidence snippets available.</p>
                            )}
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Price</span>
                                    <span className="font-medium">
                                        {product.price.amount !== null ? `${product.price.currency} ${product.price.amount}` : "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Rating</span>
                                    <span className="font-medium">
                                        {product.rating_summary.rating ? `${product.rating_summary.rating} / 5.0` : "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Shipping</span>
                                    <span className="font-medium">{product.shipping_summary || "See site"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Merchant</span>
                                    <span className="font-medium">{product.merchant || "Unknown"}</span>
                                </div>
                            </div>
                        </div>

                        {product.image_url && (
                            <div>
                                <img src={product.image_url} alt="Product" className="w-full rounded-lg border my-4" />
                            </div>
                        )}

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
