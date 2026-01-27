import { useState } from 'react';
import { Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import JobImageUpload from './JobImageUpload';

const CATEGORY_LABELS = {
    before: { label: 'Före', color: 'bg-amber-100 text-amber-800' },
    during: { label: 'Under', color: 'bg-blue-100 text-blue-800' },
    after: { label: 'Efter', color: 'bg-green-100 text-green-800' },
    part: { label: 'Del', color: 'bg-purple-100 text-purple-800' },
    documentation: { label: 'Dok', color: 'bg-gray-100 text-gray-800' },
};

export default function JobImageGallery({
    jobId,
    images = [],
    onImagesChange,
    onDeleteImage,
    readOnly = false
}) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const handleUploadComplete = (newImage) => {
        if (onImagesChange) {
            onImagesChange([...images, newImage]);
        }
        setShowUploadModal(false);
    };

    const handleDeleteImage = async (imageId, e) => {
        e.stopPropagation();

        if (!window.confirm('Vill du ta bort denna bild?')) return;

        setDeletingId(imageId);

        try {
            if (onDeleteImage) {
                await onDeleteImage(imageId);
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setDeletingId(null);
        }
    };

    const openLightbox = (index) => {
        setSelectedImageIndex(index);
    };

    const closeLightbox = () => {
        setSelectedImageIndex(null);
    };

    const goToPrevious = () => {
        setSelectedImageIndex((prev) =>
            prev === 0 ? images.length - 1 : prev - 1
        );
    };

    const goToNext = () => {
        setSelectedImageIndex((prev) =>
            prev === images.length - 1 ? 0 : prev + 1
        );
    };

    const selectedImage = selectedImageIndex !== null ? images[selectedImageIndex] : null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📷</span>
                    <h3 className="font-semibold text-gray-900">Bilder</h3>
                    {images.length > 0 && (
                        <span className="text-sm text-gray-500">({images.length})</span>
                    )}
                </div>
                {!readOnly && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Lägg till</span>
                    </button>
                )}
            </div>

            {/* Image Grid */}
            <div className="p-4">
                {images.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">📷</div>
                        <p className="text-gray-500 text-sm">Inga bilder ännu</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-gray-100"
                                onClick={() => openLightbox(index)}
                            >
                                <img
                                    src={image.url}
                                    alt={image.caption || `Bild ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Category badge */}
                                {image.category && CATEGORY_LABELS[image.category] && (
                                    <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_LABELS[image.category].color}`}>
                                        {CATEGORY_LABELS[image.category].label}
                                    </div>
                                )}

                                {/* Hover overlay with delete button */}
                                {!readOnly && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={(e) => handleDeleteImage(image.id, e)}
                                            disabled={deletingId === image.id}
                                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors disabled:opacity-50"
                                        >
                                            {deletingId === image.id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add button in grid */}
                        {!readOnly && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-8 h-8 text-gray-400" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <JobImageUpload
                    jobId={jobId}
                    onUploadComplete={handleUploadComplete}
                    onClose={() => setShowUploadModal(false)}
                />
            )}

            {/* Lightbox */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black z-50 flex items-center justify-center"
                    onClick={closeLightbox}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Navigation buttons */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                                className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                            >
                                <ChevronLeft className="w-10 h-10" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
                            >
                                <ChevronRight className="w-10 h-10" />
                            </button>
                        </>
                    )}

                    {/* Image */}
                    <img
                        src={selectedImage.url}
                        alt={selectedImage.caption || 'Bild'}
                        className="max-w-full max-h-full object-contain p-4"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Image info */}
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
                            {selectedImage.category && CATEGORY_LABELS[selectedImage.category] && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_LABELS[selectedImage.category].color}`}>
                                    {CATEGORY_LABELS[selectedImage.category].label}
                                </span>
                            )}
                            <span>{selectedImageIndex + 1} / {images.length}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
