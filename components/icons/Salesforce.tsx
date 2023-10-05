import { FC } from 'react';

type SalesforceIconProps = {
  className?: string;
};

export const SalesforceIcon: FC<SalesforceIconProps> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g clipPath="url(#prefix__clip0_7572_199409)">
        <path
          d="M10.008 5.416a4.226 4.226 0 013.045-1.306c1.588 0 2.965.882 3.706 2.197a5.193 5.193 0 012.092-.441c2.859 0 5.18 2.338 5.18 5.224 0 2.885-2.321 5.224-5.18 5.224-.353 0-.688-.035-1.024-.106a3.786 3.786 0 01-4.96 1.562 4.313 4.313 0 01-8.022-.194 4.178 4.178 0 01-.82.088c-2.215 0-4.006-1.818-4.006-4.05 0-1.5.803-2.807 2.003-3.513a4.608 4.608 0 01-.38-1.853 4.662 4.662 0 018.366-2.832z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_7572_199409">
          <path fill="none" d="M0 0h24v24H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
