import { FC } from 'react';

type JiraIconProps = {
  className?: string;
};

export const JiraIcon: FC<JiraIconProps> = ({ className }) => {
  return (
    <svg viewBox="0 0 72 72" className={className}>
      <path
        d="M64.368 5H34.031a13.695 13.695 0 0013.695 13.695h5.588v5.395c.005 7.557 6.13 13.682 13.686 13.686V7.633A2.632 2.632 0 0064.368 5z"
        fill="currentColor"
      />
      <path
        d="M49.357 20.116H19.02c.004 7.556 6.129 13.681 13.686 13.686h5.588v5.413c.01 7.556 6.138 13.677 13.695 13.677V22.748a2.632 2.632 0 00-2.632-2.632z"
        fill="url(#prefix__paint0_linear_7923_210160)"
      />
      <path
        d="M34.338 35.224H4c0 7.563 6.131 13.695 13.695 13.695H23.3v5.395c.005 7.55 6.119 13.672 13.668 13.686V37.856a2.632 2.632 0 00-2.631-2.632z"
        fill="url(#prefix__paint1_linear_7923_210160)"
      />
      <defs>
        <linearGradient
          id="prefix__paint0_linear_7923_210160"
          x1={3251.05}
          y1={25.38}
          x2={1968.37}
          y2={1363.79}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.18} stopColor="color(display-p3 .7137 .7059 .7137)" />
          <stop offset={1} stopColor="currentColor" />
        </linearGradient>
        <linearGradient
          id="prefix__paint1_linear_7923_210160"
          x1={3236.03}
          y1={40.488}
          x2={1953.35}
          y2={1378.9}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.18} stopColor="color(display-p3 .7137 .7059 .7137)" />
          <stop offset={1} stopColor="currentColor" />
        </linearGradient>
      </defs>
    </svg>
  );
};
