import { ShopResult } from "@/lib/shop/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Info, Star, Truck } from "lucide-react";

interface ProductsGridProps {
    products: ShopResult[];
    onEvidenceClick: (product: ShopResult) => void;
}

export function ProductsGrid({ products, onEvidenceClick }: ProductsGridProps) {
    if (products.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No products found. Try adjusting your filters.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product, idx) => {
                // Use URL as key if ID missing, or index fallback
                const key = product.url || `product-${idx}`;
                return (
                    <Card key={key} className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow">
                        <div className="relative aspect-[4/3] bg-muted w-full overflow-hidden">
                            {product.image_url ? (
                                <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-xs">
                                    No Image
                                </div>
                            )}
                            {product.key_features && product.key_features.length > 0 && (
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    {product.key_features.slice(0, 2).map(tag => (
                                        <Badge key={tag} variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs px-1.5 py-0.5 h-auto">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {product.price.amount !== null && (
                                <Badge className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/80">
                                    {product.price.currency} {product.price.amount}
                                </Badge>
                            )}
                        </div>

                        <CardHeader className="p-4 pb-2 space-y-1">
                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5em]" title={product.title}>
                                {product.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {product.rating_summary.rating && (
                                    <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                                        <Star className="w-3 h-3 fill-current" /> {product.rating_summary.rating}
                                        {product.rating_summary.count && <span className="text-muted-foreground">({product.rating_summary.count})</span>}
                                    </span>
                                )}
                                {product.rating_summary.rating && <span>•</span>}
                                <span className="truncate">{product.merchant || new URL(product.url).hostname}</span>
                            </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-1 flex-1">
                            <div className="flex flex-wrap gap-2 text-xs">
                                {product.shipping_summary && (
                                    <div className="flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                        <Truck className="w-3 h-3" />
                                        <span className="truncate max-w-[120px]">{product.shipping_summary}</span>
                                    </div>
                                )}
                                {product.availability !== 'unknown' && (
                                    <span className={product.availability === 'in_stock' ? "text-green-600" : "text-red-500"}>
                                        {product.availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="p-4 pt-0 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8"
                                onClick={() => onEvidenceClick(product)}
                            >
                                <Info className="w-3 h-3 mr-1.5" />
                                Evidence
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 text-xs h-8"
                                asChild
                            >
                                <a href={product.url} target="_blank" rel="noreferrer">
                                    Visit <ExternalLink className="w-3 h-3 ml-1.5" />
                                </a>
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );
}
