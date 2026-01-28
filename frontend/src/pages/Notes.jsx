import { useState, useEffect } from 'react';
import { notesAPI } from '../lib/api';
import { Header } from '../components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StickyNote, User, Wrench, Ship, Pin, Calendar, Clock, Trash2, Search, Plus, Image as ImageIcon } from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { QuickNoteModal } from '../components/QuickNoteModal';
import { formatCustomerName } from '../lib/formatName';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

const PRIORITIES = {
    low: { label: 'Låg', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    high: { label: 'Hög', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    urgent: { label: 'Brådskande', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const Notes_ = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, pinned, reminders

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter === 'pinned') params.pinned_only = true;
            if (filter === 'reminders') params.has_reminder = true;

            const response = await notesAPI.getAll(params);
            if (response.error) throw response.error;
            setNotes(response.data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
            toast.error('Kunde inte hämta anteckningar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [filter]);

    const { pullDistance, isRefreshing, bindProps } = usePullToRefresh(fetchNotes);

    const handleDelete = async (noteId) => {
        try {
            await notesAPI.archive(noteId);
            setNotes(notes.filter(n => n.id !== noteId));
            setSelectedNote(null);
            toast.success('Anteckning arkiverad');
        } catch (error) {
            toast.error('Kunde inte arkivera anteckning');
        }
    };

    const handleTogglePin = async (noteId, currentPinned) => {
        try {
            await notesAPI.update(noteId, { is_pinned: !currentPinned });
            setNotes(notes.map(n =>
                n.id === noteId ? { ...n, is_pinned: !currentPinned } : n
            ));
            toast.success(currentPinned ? 'Anteckning avstängd' : 'Anteckning fäst');
        } catch (error) {
            toast.error('Kunde inte uppdatera anteckning');
        }
    };

    // Filter notes by search query
    const filteredNotes = notes.filter(note => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            note.content?.toLowerCase().includes(query) ||
            note.customer?.name?.toLowerCase().includes(query) ||
            note.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    // Group notes: pinned first, then by date
    const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Idag';
        return format(date, 'd MMM', { locale: sv });
    };

    const hasOverdueReminder = (note) => {
        return note.reminder_date && isPast(parseISO(note.reminder_date));
    };

    return (
        <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-0" {...bindProps}>
            <Header />

            {/* Pull to refresh indicator */}
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

            <main className="flex-1 container max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Header with search and add button */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Sök anteckningar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary text-base"
                        />
                    </div>
                    <Button
                        onClick={() => setShowNoteModal(true)}
                        size="icon"
                        className="h-12 w-12 rounded-xl"
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {[
                        { id: 'all', label: 'Alla' },
                        { id: 'pinned', label: 'Fästa', icon: Pin },
                        { id: 'reminders', label: 'Påminnelser', icon: Calendar },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`
                                flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                                ${filter === tab.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                }
                            `}
                        >
                            {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Notes list */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <StickyNote className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">
                                {searchQuery ? 'Inga anteckningar matchar sökningen' : 'Inga anteckningar ännu'}
                            </p>
                            <Button onClick={() => setShowNoteModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Skapa din första anteckning
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {/* Pinned section */}
                        {pinnedNotes.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1">
                                    <Pin className="h-3 w-3" />
                                    FÄSTA
                                </div>
                                {pinnedNotes.map(note => (
                                    <NoteCard
                                        key={note.id}
                                        note={note}
                                        onClick={() => setSelectedNote(note)}
                                        hasOverdueReminder={hasOverdueReminder(note)}
                                    />
                                ))}
                            </>
                        )}

                        {/* Other notes */}
                        {unpinnedNotes.length > 0 && pinnedNotes.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium px-1 pt-2">
                                <StickyNote className="h-3 w-3" />
                                ÖVRIGA
                            </div>
                        )}
                        {unpinnedNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onClick={() => setSelectedNote(note)}
                                hasOverdueReminder={hasOverdueReminder(note)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Note detail modal */}
            <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <StickyNote className="h-5 w-5" />
                            Anteckning
                        </DialogTitle>
                    </DialogHeader>

                    {selectedNote && (
                        <div className="space-y-4 pt-2">
                            {/* Priority & Pin */}
                            <div className="flex items-center justify-between">
                                <Badge className={PRIORITIES[selectedNote.priority]?.color}>
                                    {PRIORITIES[selectedNote.priority]?.label}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTogglePin(selectedNote.id, selectedNote.is_pinned)}
                                >
                                    <Pin className={`h-4 w-4 ${selectedNote.is_pinned ? 'fill-current' : ''}`} />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap text-sm">
                                {selectedNote.content}
                            </div>

                            {/* Images */}
                            {selectedNote.images?.length > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedNote.images.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img.url}
                                            alt={img.caption || 'Note image'}
                                            className="rounded-lg object-cover aspect-square"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Tags */}
                            {selectedNote.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {selectedNote.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Linked entities */}
                            <div className="space-y-2">
                                {selectedNote.customer && (
                                    <Link
                                        to={`/kund/${selectedNote.customer.id}`}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                                    >
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>{formatCustomerName(selectedNote.customer.name)}</span>
                                    </Link>
                                )}
                                {selectedNote.job && (
                                    <Link
                                        to={`/jobb/${selectedNote.job.id}`}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                                    >
                                        <Wrench className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedNote.job.title}</span>
                                    </Link>
                                )}
                                {selectedNote.boat && (
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                                        <Ship className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedNote.boat.make} {selectedNote.boat.model}</span>
                                    </div>
                                )}
                            </div>

                            {/* Reminder */}
                            {selectedNote.reminder_date && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${hasOverdueReminder(selectedNote)
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        Påminnelse: {format(parseISO(selectedNote.reminder_date), 'd MMMM yyyy', { locale: sv })}
                                    </span>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(selectedNote.created_at), 'd MMM yyyy HH:mm', { locale: sv })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="destructive"
                                    className="flex-1 h-12"
                                    onClick={() => handleDelete(selectedNote.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Arkivera
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Quick note modal */}
            <QuickNoteModal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                onSuccess={() => {
                    setShowNoteModal(false);
                    fetchNotes();
                    toast.success('Anteckning sparad');
                }}
            />
        </div>
    );
};

// Note card component
function NoteCard({ note, onClick, hasOverdueReminder }) {
    return (
        <Card
            className={`cursor-pointer hover:shadow-md transition-all ${hasOverdueReminder ? 'border-red-300 bg-red-50/50' : ''
                }`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    {/* Pin indicator */}
                    {note.is_pinned && (
                        <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5 fill-current" />
                    )}

                    <div className="flex-1 min-w-0">
                        {/* Content preview */}
                        <p className="text-sm line-clamp-2 mb-2">
                            {note.content}
                        </p>

                        {/* Images indicator */}
                        {note.images?.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                <ImageIcon className="h-3 w-3" />
                                <span>{note.images.length} bild{note.images.length !== 1 ? 'er' : ''}</span>
                            </div>
                        )}

                        {/* Tags */}
                        {note.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {note.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                                        {tag}
                                    </Badge>
                                ))}
                                {note.tags.length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{note.tags.length - 3}</span>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
                                {/* Linked entity */}
                                {note.customer && (
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {note.customer.name?.split(' ')[0]}
                                    </span>
                                )}
                                {note.job && (
                                    <span className="flex items-center gap-1">
                                        <Wrench className="h-3 w-3" />
                                        Jobb
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Reminder */}
                                {note.reminder_date && (
                                    <span className={`flex items-center gap-1 ${hasOverdueReminder ? 'text-red-600' : ''}`}>
                                        <Calendar className="h-3 w-3" />
                                        {format(parseISO(note.reminder_date), 'd/M', { locale: sv })}
                                    </span>
                                )}
                                {/* Date */}
                                <span>{format(parseISO(note.created_at), 'd MMM', { locale: sv })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Priority indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${note.priority === 'urgent' ? 'bg-red-500' :
                        note.priority === 'high' ? 'bg-orange-500' :
                            note.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                </div>
            </CardContent>
        </Card>
    );
}

export default Notes_;
