"use client";

import AddAssetForm from "@/components/AddAssetForm";

export default function AddAssetPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Add Asset</h1>
        <p className="text-text-muted mt-1">
          Search for a Pokemon card or sealed product and add it to your collection
        </p>
      </div>
      <AddAssetForm />
    </div>
  );
}
