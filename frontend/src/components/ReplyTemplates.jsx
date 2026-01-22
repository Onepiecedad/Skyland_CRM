import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { FileText, ChevronDown } from 'lucide-react';

// Predefined reply templates
const DEFAULT_TEMPLATES = [
    {
        id: 'thanks',
        label: 'Tacka för förfrågan',
        subject: 'Tack för din förfrågan',
        body: `Hej!\n\nTack för din förfrågan. Jag återkommer till dig inom kort med mer information.\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    },
    {
        id: 'quote',
        label: 'Skicka offert',
        subject: 'Offert från Marinmekaniker',
        body: `Hej!\n\nTack för ditt intresse. Här kommer offerten enligt överenskommelse:\n\n[Arbete/tjänst]:\n[Materialkostnad]:\n[Arbetstid]:\n\nTotal kostnad: \n\nOfferten gäller i 30 dagar.\n\nHör av dig om du har några frågor!\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    },
    {
        id: 'scheduled',
        label: 'Bekräfta bokning',
        subject: 'Bokningsbekräftelse',
        body: `Hej!\n\nJag bekräftar härmed din bokning:\n\nDatum: [datum]\nTid: [tid]\nPlats: [plats]\n\nVänligen meddela om du behöver ändra tiden.\n\nVi ses!\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    },
    {
        id: 'completed',
        label: 'Jobb slutfört',
        subject: 'Ditt jobb är klart',
        body: `Hej!\n\nJag ville bara meddela att jobbet nu är slutfört.\n\nUtfört arbete:\n- [beskrivning]\n\nFaktura följer separat.\n\nKontakta mig gärna om du har några frågor eller funderingar.\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    },
    {
        id: 'followup',
        label: 'Uppföljning',
        subject: 'Uppföljning av tidigare kontakt',
        body: `Hej!\n\nJag ville bara höra hur det har gått sedan vårt senaste möte/arbete.\n\nFinns det något mer jag kan hjälpa till med?\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    },
    {
        id: 'parts_ordered',
        label: 'Reservdelar beställda',
        subject: 'Reservdelar beställda',
        body: `Hej!\n\nJag har nu beställt reservdelarna som behövs för ditt jobb.\n\nBeräknad leveranstid: [X] dagar\n\nJag hör av mig så snart delarna kommit så vi kan boka in arbetet.\n\nMed vänliga hälsningar,\nThomas Guldager\nMarinmekaniker`
    }
];

export function ReplyTemplates({ onSelect, className = '' }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={className}>
                    <FileText className="h-4 w-4 mr-1.5" />
                    Mallar
                    <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Snabbmallar
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {DEFAULT_TEMPLATES.map((template) => (
                    <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="cursor-pointer"
                    >
                        <span className="text-sm">{template.label}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Hook to use templates
export function useReplyTemplates() {
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const applyTemplate = (template, customReplacements = {}) => {
        let body = template.body;
        let subject = template.subject;

        // Apply custom replacements
        Object.entries(customReplacements).forEach(([key, value]) => {
            body = body.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
            subject = subject.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
        });

        return { subject, body };
    };

    return {
        selectedTemplate,
        setSelectedTemplate,
        applyTemplate,
        templates: DEFAULT_TEMPLATES,
    };
}

export { DEFAULT_TEMPLATES };
