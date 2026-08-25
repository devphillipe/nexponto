import { memo, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LocationDialogProps {
  latitude: number;
  longitude: number;
  /** Rótulo contextual, ex.: "Entrada — 08:02" */
  label?: string;
}

export const LocationDialog = memo(function LocationDialog({
  latitude,
  longitude,
  label,
}: LocationDialogProps) {
  const [open, setOpen] = useState(false);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const delta = 0.004; // zoom do bbox do OSM
  const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="touch-target size-9 text-primary hover:text-primary hover:bg-primary/10"
              aria-label={`Ver localização${label ? ` — ${label}` : ""}`}
            >
              <MapPin className="size-5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Ver localização</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            Localização do registro
          </DialogTitle>
          {label && <DialogDescription>{label}</DialogDescription>}
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border/60">
          <iframe
            title="Mapa da localização do registro de ponto"
            src={osmEmbedUrl}
            className="h-64 w-full sm:h-72"
            loading="lazy"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
          <Button asChild size="sm" className="gap-2">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              Abrir no Google Maps
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
