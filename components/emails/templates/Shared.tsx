import { Body, Head, Html, Preview, Tailwind } from '@react-email/components';
import { ReactNode, useMemo } from 'react';

export const Wrapper = ({
  preview,
  bodyClassName,
  withHtml,
  children,
}: {
  preview: string;
  bodyClassName: string;
  withHtml?: boolean;
  children: ReactNode;
}) => {
  const W = useMemo(() => {
    return withHtml ? WrapperWithHTML : WrapperWithoutHTML;
  }, [withHtml]);

  return (
    <W preview={preview} bodyClassName={bodyClassName}>
      {children}
    </W>
  );
};

export const WrapperWithHTML = ({
  preview,
  bodyClassName,
  children,
}: {
  preview: string;
  bodyClassName: string;
  children: ReactNode;
}) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className={bodyClassName}>{children}</Body>
      </Tailwind>
    </Html>
  );
};

export const WrapperWithoutHTML = ({ children }: { children: ReactNode }) => {
  return <Tailwind>{children}</Tailwind>;
};
