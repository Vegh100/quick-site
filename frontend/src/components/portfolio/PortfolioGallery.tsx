import { useState } from "react";
import {
  usePortfolioImages,
  useUploadPortfolioImage,
  useDeletePortfolioImage,
} from "../../hooks/useApi";
import { Image as ImageIcon, Plus, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { PortfolioImageItem } from "../../lib/api-services";

// ============================================================================
// PUBLIC GALLERY (for provider profile page)
// ============================================================================

export function PortfolioGallery({
  providerId,
  serviceId,
}: {
  providerId: string;
  serviceId?: string;
}) {
  const { data: imageData, isLoading } = usePortfolioImages(
    providerId,
    serviceId,
  );
  const images: PortfolioImageItem[] = imageData?.data ?? [];
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img) => (
          <button
            key={img.id}
            onClick={() => setLightboxImage(img.imageUrl)}
            className="group relative aspect-square rounded-xl overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/50 transition-all"
          >
            <img
              src={img.imageUrl}
              alt={img.caption || "Portfólió kép"}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-xs text-white truncate">{img.caption}</p>
              </div>
            )}
            {img.service && (
              <span className="absolute top-2 left-2 text-[10px] font-medium bg-white/90 text-foreground rounded-full px-2 py-0.5">
                {img.service.name}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Portfólió kép"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ============================================================================
// PROVIDER PORTFOLIO MANAGER (for settings)
// ============================================================================

export function PortfolioManager({ providerId }: { providerId: string }) {
  const { data: imageData, isLoading } = usePortfolioImages(providerId);
  const uploadImage = useUploadPortfolioImage();
  const deleteImage = useDeletePortfolioImage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const images: PortfolioImageItem[] = imageData?.data ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setNewFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleAdd = () => {
    if (!newFile) return;
    uploadImage.mutate(
      { file: newFile, caption: newCaption.trim() || undefined },
      {
        onSuccess: () => {
          setNewFile(null);
          setPreview(null);
          setNewCaption("");
          setShowAddForm(false);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Biztosan törölni akarod ezt a képet?")) return;
    deleteImage.mutate(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          Portfólió ({images.length})
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Kép hozzáadása
        </Button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
          {preview && (
            <div className="relative w-full h-36 rounded-md overflow-hidden border">
              <img
                src={preview}
                alt="Előnézet"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <Input type="file" accept="image/*" onChange={handleFileChange} />
          <Input
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="Leírás (opcionális)"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewFile(null);
                setPreview(null);
                setNewCaption("");
              }}
            >
              Mégse
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newFile || uploadImage.isPending}
            >
              {uploadImage.isPending && (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              )}
              Feltöltés
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <ImageIcon className="h-10 w-10 opacity-20 mx-auto mb-2" />
          <p>Még nincsenek portfólió képek</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square rounded-xl overflow-hidden border bg-muted"
            >
              <img
                src={img.imageUrl}
                alt={img.caption || ""}
                className="h-full w-full object-cover"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-[11px] text-white truncate">
                    {img.caption}
                  </p>
                </div>
              )}
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
