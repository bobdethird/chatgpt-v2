"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ShopResponse, ShopResult } from "@/lib/shop/types";
import { ProductsGrid } from "./ProductsGrid";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShoppingCanvasProps {
    initialQuery?: string;
}

export function ShoppingCanvas({ initialQuery = "" }: ShoppingCanvasProps) {
    const [query, setQuery] = useState(initialQuery);
    const [budget, setBudget] = useState<string>(""); // Simple budget input
    const [data, setData] = useState<ShopResponse | null>(null);
    const [loading, setLoading] = useState(true); // Initial load
    const [updating, setUpdating] = useState(false); // Subsequent updates
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [selectedProduct, setSelectedProduct] = useState<ShopResult | null>(null);
    const [evidenceOpen, setEvidenceOpen] = useState(false);

    // Client-side Filter/Sort State
    const [sortBy, setSortBy] = useState<'relevant' | 'price_asc'>('relevant');
    const [showInStockOnly, setShowInStockOnly] = useState(false);

    // Derived data
    const displayedProducts = (data?.results || [])
        .filter(p => !showInStockOnly || p.availability === 'in_stock')
        .sort((a, b) => {
            if (sortBy === 'price_asc') {
                return (a.price.amount || 0) - (b.price.amount || 0);
            }
            return 0; // maintain original rank
        });

    const fetchData = useCallback(async (isInitial = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (isInitial) {
            setLoading(true);
        } else {
            setUpdating(true);
        }
        setError(null);

        try {
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            if (budget) params.set("budget", budget);
            params.set("limit", "10");

            const res = await fetch(`/api/shop?${params.toString()}`, {
                signal: controller.signal,
            });

            if (!res.ok) {
                throw new Error("Failed to fetch products");
            }

            const json: ShopResponse = await res.json();
            setData(json);
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setError(err.message || "An error occurred");
            }
        } finally {
            if (isInitial) setLoading(false);
            setUpdating(false);
        }
    }, [query, budget]);

    // Initial load
    useEffect(() => {
        if (initialQuery) {
            fetchData(true);
        } else {
            setLoading(false);
        }
    }, []); // Run once on mount

    const handleEvidenceClick = (product: ShopResult) => {
        setSelectedProduct(product);
        setEvidenceOpen(true);
    };


    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header with Title and Controls (No Search Bar) */}
            <div className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-semibold">Results for &quot;{query}&quot;</h2>
                    <div className="text-xs text-muted-foreground flex gap-2">
                        {data?.results.length ? <span>{data.results.length} items</span> : <span>Searching...</span>}
                        {data?.meta?.latency_ms !== undefined && !updating && !loading && (
                            <span>• {data.meta.latency_ms}ms</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Indicator */}
                    {updating && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 px-2 py-0.5 h-6">
                            <RefreshCcw className="w-3 h-3 mr-1 animate-spin" />
                            Updating
                        </Badge>
                    )}

                    {/* Filter / Sort Controls */}
                    <div className="flex bg-muted/50 p-1 rounded-md">
                        <Button
                            variant={sortBy === 'price_asc' ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2 hover:bg-background shadow-none"
                            onClick={() => setSortBy(prev => prev === 'relevant' ? 'price_asc' : 'relevant')}
                        >
                            {sortBy === 'price_asc' ? "Price: Low to High" : "Sort: Relevant"}
                        </Button>
                        <div className="w-px bg-border mx-1 h-4 self-center" />
                        <Button
                            variant={showInStockOnly ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 text-xs px-2 hover:bg-background shadow-none"
                            onClick={() => setShowInStockOnly(prev => !prev)}
                        >
                            <span className={showInStockOnly ? "text-foreground font-medium" : "text-muted-foreground"}>
                                In Stock Only
                            </span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 relative min-h-[400px]">
                {error && (
                    <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm mb-4 border border-red-200">
                        Error: {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground text-sm">Searching strictly for the best products...</p>
                    </div>
                ) : (
                    <div className={cn("transition-opacity duration-200", updating ? "opacity-60 pointer-events-none" : "opacity-100")}>
                        {displayedProducts.length > 0 ? (
                            <ProductsGrid products={displayedProducts} onEvidenceClick={handleEvidenceClick} />
                        ) : (
                            <div className="text-center text-muted-foreground mt-20">
                                {data ? "No products match criteria." : "Start a search to find products."}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EvidenceDrawer
                product={selectedProduct}
                open={evidenceOpen}
                onOpenChange={setEvidenceOpen}
            />
        </div>
    );
}
