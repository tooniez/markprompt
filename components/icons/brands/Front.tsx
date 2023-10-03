import { FC } from 'react';

type FrontIconProps = {
  className?: string;
};

export const FrontIcon: FC<FrontIconProps> = ({ className }) => {
  return (
    <svg viewBox="0 0 72 72" fill="none" className={className}>
      <path
        d="M11.928 13.439c0-6.29 5.116-11.389 11.427-11.389H60v16.207a5.705 5.705 0 01-5.713 5.695h-14.89a5.483 5.483 0 00-5.493 5.474v35.371a5.705 5.705 0 01-5.713 5.695H11.928V13.439z"
        fill="currentColor"
      />
      <path
        d="M24.703 29.564c0 8.165 6.642 14.784 14.834 14.784s14.834-6.62 14.834-14.784c0-8.165-6.642-14.784-14.834-14.784s-14.834 6.619-14.834 14.784z"
        fill="url(#prefix__paint0_linear_7870_72088)"
      />
      <path
        opacity={0.5}
        d="M24.703 29.564c0 8.165 6.642 14.784 14.834 14.784s14.834-6.62 14.834-14.784c0-8.165-6.642-14.784-14.834-14.784s-14.834 6.619-14.834 14.784z"
        fill="url(#prefix__paint1_linear_7870_72088)"
      />
      <defs>
        <linearGradient
          id="prefix__paint0_linear_7870_72088"
          x1={29.091}
          y1={18.48}
          x2={51.32}
          y2={40.941}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity={0.16} />
          <stop offset={0.861} stopColor="currentColor" />
        </linearGradient>
        <linearGradient
          id="prefix__paint1_linear_7870_72088"
          x1={29.091}
          y1={18.48}
          x2={51.32}
          y2={40.941}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity={0.16} />
          <stop offset={0.861} stopColor="currentColor" />
        </linearGradient>
      </defs>
    </svg>
  );
};
