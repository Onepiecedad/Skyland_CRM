import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import { jobImagesAPI } from '../lib/api';

// Bildkomprimering innan upload
async function compressImage(file, maxWidth = 1920) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => {
                        // Create a new file with the same name
                        const compressedFile = new File([blob], file.name || 'photo.jpg', {
                            type: 'image/jpeg',
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    0.85
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

const CATEGORIES = [
    { id: 'before', label: 'Före', emoji: '📋' },
    { id: 'during', label: 'Under', emoji: '🔧' },
    { id: 'after', label: 'Efter', emoji: '✅' },
    { id: 'part', label: 'Reservdel', emoji: '⚙️' },
    { id: 'documentation', label: 'Övrigt', emoji: '📸' },
];

export default function JobImageUpload({ jobId, onUploadComplete, onClose }) {
    const [selectedCategory, setSelectedCategory] = useState('documentation');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);

    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const handleFileSelect = async (event, source) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setUploadProgress(10);

        try {
            // Komprimera bilden
            setUploadProgress(30);
            const compressedFile = await compressImage(file);

            setUploadProgress(60);

            // Ladda upp till Supabase
            const { data, error: uploadError } = await jobImagesAPI.upload(
                jobId,
                compressedFile,
                selectedCategory
            );

            if (uploadError) {
                throw uploadError;
            }

            setUploadProgress(100);

            // Signalera att uppladdning är klar
            if (onUploadComplete) {
                onUploadComplete(data);
            }

            // Stäng modal efter kort delay för att visa 100%
            setTimeout(() => {
                if (onClose) onClose();
            }, 500);

        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Kunde inte ladda upp bilden');
            setIsUploading(false);
        }
    };

    const triggerCamera = () => {
        cameraInputRef.current?.click();
    };

    const triggerGallery = () => {
        galleryInputRef.current?.click();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Lägg till bild</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        disabled={isUploading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Upload progress */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Laddar upp...</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!isUploading && (
                        <>
                            {/* Camera button - Primary action */}
                            <button
                                onClick={triggerCamera}
                                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-colors"
                            >
                                <Camera className="w-6 h-6" />
                                <span>Ta foto med kameran</span>
                            </button>

                            {/* Gallery button - Secondary action */}
                            <button
                                onClick={triggerGallery}
                                className="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-xl font-medium transition-colors"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span>Välj från bildbibliotek</span>
                            </button>

                            {/* Category selection */}
                            <div className="pt-2">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Kategori
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id
                                                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            <span className="mr-1">{cat.emoji}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Hidden file inputs */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(e, 'camera')}
                    className="hidden"
                />
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'gallery')}
                    className="hidden"
                />

                {/* Safe area padding for mobile */}
                <div className="h-6 sm:hidden" />
            </div>

            <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
