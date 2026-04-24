"use client";

import Link from "next/link";
import Image from "next/image";
import { Store } from "lucide-react";
import type { Vendor } from "@/types";

interface VendorCardProps {
  vendor: Vendor;
}

export default function VendorCard({ vendor }: VendorCardProps) {
  return (
    <Link href={`/marketplace/vendors/${vendor.id}`}>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-hover hover:bg-surface-hover transition-colors cursor-pointer group">
        {/* Shop image */}
        <div className="relative w-full aspect-[3/2] bg-background overflow-hidden">
          {vendor.shop_image_url ? (
            <Image
              src={vendor.shop_image_url}
              alt={vendor.shop_name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="w-12 h-12 text-text-muted" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-text-primary text-sm leading-tight line-clamp-1">
              {vendor.shop_name}
            </h3>
            <span className="flex-shrink-0 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
              {vendor.item_count ?? 0} {vendor.item_count === 1 ? "item" : "items"}
            </span>
          </div>
          {vendor.description && (
            <p className="mt-1.5 text-xs text-text-muted line-clamp-2">{vendor.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
