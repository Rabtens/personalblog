import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';

interface BlogCardProps {
  id: string;
  title: string;
  content: string;
  coverImageUrl?: string | null;
  viewCount?: number;
  likeCount?: number;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string | null;
  publishedDate: string;
  readTime: string;
  featured?: boolean;
}

export default function BlogCard({
  id,
  title,
  content,
  coverImageUrl,
  viewCount = 0,
  likeCount = 0,
  authorName,
  authorUsername,
  authorAvatar,
  publishedDate,
  readTime,
  featured = false,
}: BlogCardProps) {
  const getExcerpt = (text: string) => {
    const cleaned = text.replace(/<[^>]*>/g, '');
    return cleaned.substring(0, 120) + (cleaned.length > 120 ? '...' : '');
  };

  return (
    <Link href={`/blog/${id}`}>
      <div
        className={`card group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer ${
          featured ? 'md:col-span-2' : ''
        }`}
      >
        {/* Cover Image */}
        {coverImageUrl && (
          <div className="relative h-48 overflow-hidden bg-[#1A1A2E]">
            <img
              src={coverImageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col">
          <h3 className="text-xl font-playfair font-bold text-[#EAEAEA] mb-2 group-hover:text-[#E94560] transition-colors line-clamp-2">
            {title}
          </h3>

          <p className="text-[#8892A4] text-sm mb-4 flex-1">
            {getExcerpt(content)}
          </p>

          {/* Author Info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-t border-[#2A2A4A] pt-4">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-8 h-8 rounded-full border border-[#2A2A4A]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#E94560] flex items-center justify-center text-xs font-bold">
                {authorName?.[0] || 'U'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#EAEAEA]">
                {authorName}
              </p>
              <p className="text-xs text-[#8892A4]">@{authorUsername}</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-xs text-[#8892A4]">
            <span>{readTime}</span>
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {viewCount}
            </span>
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart size={14} className="text-[#E94560]" />
                {likeCount}
              </span>
            )}
            <span>{publishedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
