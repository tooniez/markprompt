import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { GitHubIcon } from './GitHub';

describe('GitHubIcon', () => {
  it('should render', () => {
    const { container } = render(<GitHubIcon />);
    const el = container.querySelector('svg');
    expect(el).toBeInTheDocument();
    expectTypeOf(el).toEqualTypeOf<SVGSVGElement | null>();
  });
});
