import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Download, RefreshCw, Trash2, X, ChevronLeft, ChevronRight, Pause, Volume2, VolumeX, Maximize, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { VideoFormat, VideoStyle, MusicTrack } from './types';
import { FORMAT_OPTIONS, STYLE_OPTIONS, MUSIC_OPTIONS } from './types';

interface VideoHistoryItem {
  id: string;
  product_name: string | null;
  format: string;
  style: string;
  music_track: string;
  dhoom_score: number | null;
  video_url: string | null;
  script: any;
  status: string;
  created_at: string;
  completed_at: string | null;
}

type FilterType = 'all' | 'this_month' | 'facebook' | 'instagram';

const FILTERS: { value: FilterType; bn: string; en: string }[] = [
  { value: 'all', bn: 'সব', en: 'All' },
  { value: 'this_month', bn: 'এই মাস', en: 'This Month' },
  { value: 'facebook', bn: 'Facebook', en: 'Facebook' },
  { value: 'instagram', bn: 'Instagram', en: 'Instagram' },
];

const VideoHistory = () => {
  const { t } = useLanguage();
  const { activeWorkspace } = useAuth();
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox state
  const [lbPlaying, setLbPlaying] = useState(false);
  const [lbMuted, setLbMuted] = useState(true);
  const [lbTime, setLbTime] = useState(0);
  const lbVideoRef = useRef<HTMLVideoElement>(null);

  const fetchVideos = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('video_ads')
      .select('*')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setVideos(data);
    }
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = videos.filter(v => {
    if (filter === 'this_month') {
      const now = new Date();
      const created = new Date(v.created_at);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    if (filter === 'facebook') {
      return v.format === 'feed' || v.format === 'story';
    }
    if (filter === 'instagram') {
      return v.format === 'reels';
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await (supabase as any).from('video_ads').delete().eq('id', deleteId);
    if (error) {
      toast.error(t('মুছতে সমস্যা হয়েছে', 'Failed to delete'));
    } else {
      setVideos(prev => prev.filter(v => v.id !== deleteId));
      toast.success(t('ভিডিও মুছে ফেলা হয়েছে', 'Video deleted'));
      if (lightboxIdx !== null) setLightboxIdx(null);
    }
    setDeleteId(null);
    setDeleting(false);
  };

  const getFormatLabel = (format: string) => {
    const f = FORMAT_OPTIONS.find(o => o.value === format);
    return f ? t(f.label, f.labelEn) : format;
  };

  const getStyleLabel = (style: string) => {
    const s = STYLE_OPTIONS.find(o => o.value === style);
    return s ? t(s.label, s.labelEn) : style;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 70) return 'bg-brand-green/10 text-brand-green';
    if (score >= 50) return 'bg-brand-yellow/10 text-brand-yellow';
    return 'bg-muted text-muted-foreground';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Lightbox controls
  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLbPlaying(false);
    setLbMuted(true);
    setLbTime(0);
  };

  const closeLightbox = () => {
    setLightboxIdx(null);
    setLbPlaying(false);
  };

  const lbPrev = () => {
    if (lightboxIdx !== null && lightboxIdx > 0) {
      openLightbox(lightboxIdx - 1);
    }
  };

  const lbNext = () => {
    if (lightboxIdx !== null && lightboxIdx < filteredVideos.length - 1) {
      openLightbox(lightboxIdx + 1);
    }
  };

  const currentLbVideo = lightboxIdx !== null ? filteredVideos[lightboxIdx] : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard/video')}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-heading-bn text-foreground">
              {t('ভিডিও ইতিহাস', 'Video History')}
            </h1>
            <p className="text-sm text-muted-foreground font-heading-bn">
              {t(`মোট ${videos.length}টি ভিডিও`, `${videos.length} total videos`)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-heading-bn transition-all ${
                filter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(f.bn, f.en)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredVideos.length === 0 && (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🎬</span>
            <p className="text-lg font-heading-bn text-muted-foreground">
              {t('কোনো ভিডিও পাওয়া যায়নি', 'No videos found')}
            </p>
            <button
              onClick={() => navigate('/dashboard/video')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading-bn font-semibold"
            >
              {t('নতুন ভিডিও তৈরি করুন', 'Create New Video')}
            </button>
          </div>
        )}

        {/* Video Grid */}
        {!loading && filteredVideos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideos.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                onView={() => openLightbox(idx)}
                onDelete={() => setDeleteId(video.id)}
                onRemix={() => navigate('/dashboard/video')}
                getFormatLabel={getFormatLabel}
                getStyleLabel={getStyleLabel}
                getScoreColor={getScoreColor}
                formatDate={formatDate}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border"
            >
              <h3 className="text-lg font-bold font-heading-bn text-foreground mb-2">
                {t('নিশ্চিতভাবে মুছবেন?', 'Confirm delete?')}
              </h3>
              <p className="text-sm text-muted-foreground font-heading-bn mb-6">
                {t('এই ভিডিও মুছে ফেলা হবে এবং ফেরত আনা যাবে না।', 'This video will be permanently deleted.')}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-secondary text-foreground font-heading-bn text-sm hover:bg-secondary/80 transition-colors"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-heading-bn text-sm font-semibold hover:bg-destructive/90 transition-colors"
                >
                  {deleting ? '...' : t('মুছুন', 'Delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && currentLbVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl max-w-[900px] w-full max-h-[90vh] overflow-auto shadow-2xl border border-border"
            >
              {/* Lightbox header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold font-heading-bn text-foreground">
                    {currentLbVideo.product_name || t('ভিডিও', 'Video')}
                  </h3>
                  <p className="text-xs text-muted-foreground">{formatDate(currentLbVideo.created_at)}</p>
                </div>
                <button onClick={closeLightbox} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-destructive/10 transition-colors">
                  <X size={16} className="text-foreground" />
                </button>
              </div>

              {/* Lightbox content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Video player */}
                <div className="relative">
                  <div className={`bg-[#1C1B1A] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.2)] ${
                    currentLbVideo.format === 'feed' ? 'aspect-square' : 'aspect-[9/16] max-h-[500px]'
                  }`}>
                    {currentLbVideo.video_url ? (
                      <video
                        ref={lbVideoRef}
                        src={currentLbVideo.video_url}
                        className="w-full h-full object-cover"
                        muted={lbMuted}
                        loop
                        onTimeUpdate={() => setLbTime(lbVideoRef.current?.currentTime || 0)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-4xl block mb-2">🎬</span>
                          <p className="text-sm text-white/50 font-heading-bn">
                            {t('ভিডিও প্রিভিউ পাওয়া যায়নি', 'Video preview unavailable')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Controls overlay */}
                    {currentLbVideo.video_url && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            if (lbVideoRef.current) {
                              lbPlaying ? lbVideoRef.current.pause() : lbVideoRef.current.play();
                              setLbPlaying(!lbPlaying);
                            }
                          }} className="text-white">
                            {lbPlaying ? <Pause size={18} /> : <Play size={18} />}
                          </button>
                          <div className="flex-1 h-1 bg-white/20 rounded-full">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${(lbTime / 15) * 100}%` }} />
                          </div>
                          <span className="text-white text-[11px] font-mono">{Math.floor(lbTime)}s/15s</span>
                          <button onClick={() => setLbMuted(!lbMuted)} className="text-white">
                            {lbMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nav arrows */}
                  <div className="flex justify-between mt-3">
                    <button
                      onClick={lbPrev}
                      disabled={lightboxIdx === 0}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs text-muted-foreground self-center">
                      {lightboxIdx + 1} / {filteredVideos.length}
                    </span>
                    <button
                      onClick={lbNext}
                      disabled={lightboxIdx === filteredVideos.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm disabled:opacity-30 hover:bg-primary/10 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Dhoom Score */}
                  {currentLbVideo.dhoom_score && (
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-[3px] border-brand-green flex items-center justify-center">
                        <span className="text-lg font-bold text-brand-green">{currentLbVideo.dhoom_score}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold font-heading-bn text-foreground">{t('ধুম স্কোর', 'Dhoom Score')}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentLbVideo.dhoom_score >= 70 ? t('ভালো পারফরম্যান্স প্রত্যাশিত', 'Good performance expected') : t('উন্নতির সুযোগ আছে', 'Room for improvement')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Specs */}
                  <div className="bg-secondary rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('ফরম্যাট', 'Format')}</span>
                      <span className="text-foreground font-heading-bn">{getFormatLabel(currentLbVideo.format)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('স্টাইল', 'Style')}</span>
                      <span className="text-foreground font-heading-bn">{getStyleLabel(currentLbVideo.style)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('মিউজিক', 'Music')}</span>
                      <span className="text-foreground font-heading-bn">
                        {MUSIC_OPTIONS.find(m => m.value === currentLbVideo.music_track)
                          ? t(
                              MUSIC_OPTIONS.find(m => m.value === currentLbVideo.music_track)!.label,
                              MUSIC_OPTIONS.find(m => m.value === currentLbVideo.music_track)!.labelEn
                            )
                          : currentLbVideo.music_track}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('স্ট্যাটাস', 'Status')}</span>
                      <span className={`font-heading-bn ${currentLbVideo.status === 'completed' ? 'text-brand-green' : 'text-brand-yellow'}`}>
                        {currentLbVideo.status === 'completed' ? t('সম্পন্ন', 'Completed') : t('প্রক্রিয়াধীন', 'Processing')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {currentLbVideo.video_url && (
                      <a
                        href={currentLbVideo.video_url}
                        download={`addhoom-video-${currentLbVideo.product_name || 'video'}.mp4`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-heading-bn font-semibold text-sm"
                      >
                        <Download size={16} />
                        {t('MP4 ডাউনলোড করুন', 'Download MP4')}
                      </a>
                    )}
                    <button
                      onClick={() => { closeLightbox(); navigate('/dashboard/video'); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-heading-bn text-sm hover:bg-primary/10 transition-colors"
                    >
                      <RefreshCw size={14} />
                      {t('ভিন্ন স্টাইলে আবার বানান', 'Remake with different style')}
                    </button>
                    <button
                      onClick={() => setDeleteId(currentLbVideo.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-destructive text-sm hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t('মুছুন', 'Delete')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Card sub-component
interface VideoCardProps {
  video: VideoHistoryItem;
  onView: () => void;
  onDelete: () => void;
  onRemix: () => void;
  getFormatLabel: (f: string) => string;
  getStyleLabel: (s: string) => string;
  getScoreColor: (score: number | null) => string;
  formatDate: (d: string) => string;
  t: (bn: string, en: string) => string;
}

const VideoCard = ({ video, onView, onDelete, onRemix, getFormatLabel, getStyleLabel, getScoreColor, formatDate, t }: VideoCardProps) => {
  const [hovering, setHovering] = useState(false);
  const hoverVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (hovering && hoverVideoRef.current && video.video_url) {
      hoverVideoRef.current.currentTime = 0;
      hoverVideoRef.current.play().catch(() => {});
    } else if (hoverVideoRef.current) {
      hoverVideoRef.current.pause();
    }
  }, [hovering, video.video_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] overflow-hidden bg-card border border-border hover:border-primary/30 transition-all group"
    >
      {/* Thumbnail */}
      <div
        className={`relative bg-[#1C1B1A] cursor-pointer ${
          video.format === 'feed' ? 'aspect-square' : 'aspect-video'
        }`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onView}
      >
        {video.video_url ? (
          <video
            ref={hoverVideoRef}
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono">
          0:15
        </span>

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
            <Play size={20} className="text-primary-foreground ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0">
            <p className="text-[15px] font-bold font-heading-bn text-foreground truncate">
              {video.product_name || t('নামহীন ভিডিও', 'Untitled Video')}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(video.created_at)}</p>
          </div>
          {video.dhoom_score !== null && video.dhoom_score > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${getScoreColor(video.dhoom_score)}`}>
              {video.dhoom_score}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-1.5 mb-3">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-heading-bn text-muted-foreground">
            {getFormatLabel(video.format)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-heading-bn text-muted-foreground">
            {getStyleLabel(video.style)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={onView}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-xs font-heading-bn text-foreground hover:bg-primary/10 transition-colors"
          >
            <Play size={12} /> {t('দেখুন', 'View')}
          </button>
          {video.video_url && (
            <a
              href={video.video_url}
              download
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-xs font-heading-bn text-foreground hover:bg-primary/10 transition-colors"
            >
              <Download size={12} /> {t('ডাউনলোড', 'Download')}
            </a>
          )}
          <button
            onClick={onRemix}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary text-xs font-heading-bn text-foreground hover:bg-primary/10 transition-colors"
          >
            <RefreshCw size={12} /> {t('রিমিক্স', 'Remix')}
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1.5 rounded-lg bg-secondary text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoHistory;
