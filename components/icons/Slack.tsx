import { FC } from 'react';

type SlackIconProps = {
  className?: string;
};

export const SlackIcon: FC<SlackIconProps> = ({ className }) => {
  return (
    <svg className={className} viewBox="0 0 123 123">
      <path
        d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9C5.8 90.5 0 84.7 0 77.6c0-7.1 5.8-12.9 12.9-12.9h12.9v12.9zM32.3 77.6c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9V77.6z"
        fill="color(display-p3 .8784 .1176 .3529)"
      />
      <path
        d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9C32.3 5.8 38.1 0 45.2 0c7.1 0 12.9 5.8 12.9 12.9v12.9H45.2zM45.2 32.3c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2c0-7.1 5.8-12.9 12.9-12.9h32.3z"
        fill="color(display-p3 .2118 .7725 .9412)"
      />
      <path
        d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9H97V45.2zM90.5 45.2c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0c7.1 0 12.9 5.8 12.9 12.9v32.3z"
        fill="color(display-p3 .1804 .7137 .4902)"
      />
      <path
        d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9V97h12.9zM77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9H77.6z"
        fill="color(display-p3 .9255 .698 .1804)"
      />
    </svg>
  );
};