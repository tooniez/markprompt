import { FC } from 'react';

type AtlassianIconProps = {
  className?: string;
};

export const AtlassianIcon: FC<AtlassianIconProps> = ({ className }) => {
  return (
    <svg viewBox="0 0 72 72" className={className}>
      <path
        d="M23.404 33.578a1.772 1.772 0 00-1.595-.68 1.76 1.76 0 00-1.408 1.006L5.187 64.258a1.838 1.838 0 00.083 1.767c.332.531.917.864 1.548.864h21.176a1.764 1.764 0 001.628-1.007c4.567-9.424 1.794-23.75-6.218-32.304z"
        fill="url(#prefix__paint0_linear_7923_210150)"
      />
      <path
        d="M34.558 5.968a39.977 39.977 0 00-2.342 39.529l10.198 20.385c.299.615.93 1.003 1.627 1.003h21.16c.63 0 1.196-.325 1.528-.863a1.756 1.756 0 00.066-1.76L37.634 5.954a1.718 1.718 0 00-3.093.01l.017.003z"
        fill="currentColor"
      />
      <defs>
        <linearGradient
          id="prefix__paint0_linear_7923_210150"
          x1={2678.65}
          y1={570.592}
          x2={550.817}
          y2={2860.06}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="currentColor" stopOpacity={0.4} />
          <stop offset={0.923} stopColor="currentColor" />
        </linearGradient>
      </defs>
    </svg>
  );
};
