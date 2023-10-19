import cn from 'classnames';
import { FC } from 'react';

type YouTubeProps = {
  src?: string;
  title?: string;
  className?: string;
};

export const YouTube: FC<YouTubeProps> = ({ src, title, className }) => {
  // If a regular YouTube URL is provided, transform to the appropriate
  // embed URL.
  let embedUrl = src;
  const watchId = src?.match(
    /^https?:\/\/(www.)?youtube.com\/watch\?v=([a-zA-Z0-9_.-]+)/,
  )?.[2];
  if (watchId) {
    embedUrl = 'https://www.youtube.com/embed/' + watchId;
  }

  return (
    <div
      className={cn(
        className,
        'not-prose relative h-0 w-full overflow-hidden rounded-md border-neutral-900 pb-[55%]',
      )}
      style={{ height: 0 }}
    >
      <iframe
        title={title}
        className="absolute top-0 left-0 h-full w-full"
        src={embedUrl}
        allowFullScreen
      ></iframe>
    </div>
  );
};
