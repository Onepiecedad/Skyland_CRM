import { X, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';

/**
 * Confirmation modal for deleting a message
 * 
 * Props:
 *   isOpen: boolean - whether modal is visible
 *   onClose: () => void - close handler
 *   message: object - the message to delete
 *   onDeleted: () => void - callback after successful deletion
 */
export const DeleteMessageModal = ({ isOpen, onClose, message, onDeleted }) => {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !message) return null;

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('messages')
                .delete()
                .eq('id', message.id);

            if (deleteError) throw deleteError;

            // Success
            onDeleted?.();
            onClose();
        } catch (err) {
            console.error('Error deleting message:', err);
            setError(err.message || 'Kunde inte radera meddelandet');
        } finally {
            setDeleting(false);
        }
    };

    const messageType = message.type === 'email' ? 'mejl' : 'formulär';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">Radera {messageType}</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={deleting}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <p className="text-muted-foreground">
                        Är du säker på att du vill radera detta {messageType}?
                        Detta kan inte ångras.
                    </p>

                    {/* Message preview */}
                    <div className="p-3 bg-muted/50 rounded-lg border text-sm">
                        <div className="font-medium truncate">{message.title || 'Inget ämne'}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Från: {message.from_label}
                        </div>
                        {message.preview && (
                            <div className="text-muted-foreground mt-2 line-clamp-2">
                                {message.preview}
                            </div>
                        )}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={deleting}>
                        Avbryt
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Raderar...
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Radera
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
