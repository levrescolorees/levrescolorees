import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RotateCw, ZoomIn } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  aspect?: number;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/jpeg', 0.92);
  });
}

export default function ImageCropModal({ open, imageSrc, aspect = 16 / 9, onClose, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } catch {
      // fallback: send original
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Recortar Imagem</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 sm:h-80 bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            <Label className="font-body text-sm w-12 shrink-0">Zoom</Label>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={3}
              step={0.05}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
            <Label className="font-body text-sm w-12 shrink-0">Rotação</Label>
            <Slider
              value={[rotation]}
              onValueChange={([v]) => setRotation(v)}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={processing}>
            {processing ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
