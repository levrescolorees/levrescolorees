import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import heroBannerDefault from '@/assets/hero-banner.jpg';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useTheme } from '@/components/ThemeProvider';
import type { HeroSlide } from '@/theme/defaultTheme';

const alignmentClasses: Record<HeroSlide['alignment'], string> = {
  left: 'items-start text-left',
  center: 'items-center text-center mx-auto',
  right: 'items-end text-right ml-auto',
};

const gradientByAlignment: Record<HeroSlide['alignment'], string> = {
  left: 'bg-gradient-to-r from-primary/55 via-primary/25 to-transparent',
  center: 'bg-gradient-to-b from-black/30 via-black/40 to-black/60',
  right: 'bg-gradient-to-l from-primary/55 via-primary/25 to-transparent',
};

const SlideContent = ({ slide }: { slide: HeroSlide }) => {
  const align = slide.alignment || 'left';
  return (
    <div className="container mx-auto px-4 relative z-10 w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`max-w-xl flex flex-col ${alignmentClasses[align]}`}
      >
        {slide.kicker ? (
          <span className="inline-block text-rose-glow text-sm font-body tracking-[0.2em] uppercase mb-4">
            {slide.kicker}
          </span>
        ) : null}
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-normal text-primary-foreground leading-tight mb-6">
          {slide.headline?.includes(',') ? (
            <>
              {slide.headline.split(',')[0]},<br />
              <span className="italic text-rose-glow">
                {slide.headline.split(',').slice(1).join(',').trim()}
              </span>
            </>
          ) : (
            slide.headline
          )}
        </h1>
        {slide.subheadline ? (
          <p className="text-primary-foreground/85 text-base md:text-lg font-body leading-relaxed mb-8 max-w-md">
            {slide.subheadline}
          </p>
        ) : null}
        <div className={`flex flex-col sm:flex-row gap-4 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
          {slide.ctaText && slide.ctaLink ? (
            <Link
              to={slide.ctaLink}
              className="inline-flex items-center justify-center bg-gradient-rose text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:opacity-90 transition-opacity shadow-rose"
            >
              {slide.ctaText}
            </Link>
          ) : null}
          {slide.ctaSecondaryText && slide.ctaSecondaryLink ? (
            <Link
              to={slide.ctaSecondaryLink}
              className="inline-flex items-center justify-center border-2 border-primary-foreground/40 text-primary-foreground font-body font-semibold text-sm tracking-wider uppercase px-8 py-4 rounded-sm hover:bg-primary-foreground/10 transition-colors"
            >
              {slide.ctaSecondaryText}
            </Link>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

const SlideBackground = ({ slide, eager }: { slide: HeroSlide; eager: boolean }) => {
  const desktop = slide.image || heroBannerDefault;
  const mobile = slide.imageMobile || desktop;
  return (
    <>
      <picture>
        <source media="(max-width: 767px)" srcSet={mobile} />
        <img
          src={desktop}
          alt={slide.headline || 'Banner'}
          className="w-full h-full object-cover"
          fetchPriority={eager ? 'high' : 'auto'}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      </picture>
      <div className={`absolute inset-0 ${gradientByAlignment[slide.alignment || 'left']}`} />
    </>
  );
};

const HeroBanner = () => {
  const { data: settings } = useStoreSettings();
  const { theme } = useTheme();

  // Build slides list with legacy fallback
  const themeSlides = theme?.components?.hero?.slides || [];
  const legacyHero = settings?.hero;
  const legacyImage = theme?.components?.images?.heroBanner;

  const slides: HeroSlide[] =
    themeSlides.length > 0
      ? themeSlides
      : [
          {
            id: 'legacy',
            image: legacyImage || '',
            headline: legacyHero?.headline || 'Seus lábios, sua assinatura.',
            subheadline:
              legacyHero?.subheadline ||
              'Cores vibrantes, texturas irresistíveis. Do varejo ao atacado, encontre o mix perfeito para brilhar — ou revender.',
            ctaText: legacyHero?.cta_text || 'Comprar Agora',
            ctaLink: legacyHero?.cta_link || '/colecoes',
            ctaSecondaryText: 'Comprar no Atacado',
            ctaSecondaryLink: '/atacado',
            alignment: 'left',
            kicker: 'Nova Coleção 2025',
          },
        ];

  const autoplay = theme?.components?.hero?.autoplay !== false;
  const intervalMs = theme?.components?.hero?.intervalMs || 5000;
  const multiple = slides.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    multiple && autoplay ? [Autoplay({ delay: intervalMs, stopOnInteraction: false })] : []
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  // Single slide (or no slides) → static
  if (!multiple) {
    const slide = slides[0];
    return (
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <SlideBackground slide={slide} eager />
        </div>
        <SlideContent slide={slide} />
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 min-h-[85vh] md:min-h-[90vh] flex items-center">
              <div className="absolute inset-0">
                <SlideBackground slide={slide} eager={idx === 0} />
              </div>
              <SlideContent slide={slide} />
            </div>
          ))}
        </div>
      </div>

      {/* Arrows */}
      <button
        aria-label="Slide anterior"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/40 hover:bg-background/70 text-foreground backdrop-blur flex items-center justify-center transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        aria-label="Próximo slide"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-background/40 hover:bg-background/70 text-foreground backdrop-blur flex items-center justify-center transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Ir para o slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === selectedIndex ? 'w-8 bg-primary-foreground' : 'w-2 bg-primary-foreground/50 hover:bg-primary-foreground/80'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroBanner;
