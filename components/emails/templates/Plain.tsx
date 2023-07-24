import { Container, Section, Link } from '@react-email/components';
import { FC } from 'react';

import { MarkdownContainer } from './MarkdownContainer';
import { Wrapper } from './Shared';

type PlainTemplate = {
  markdown: string;
  unsubscribeMarkdown: string;
  preview: string;
  withHtml?: boolean;
};

const container = {
  width: '100%',
  maxWidth: '100%',
};

const section = {
  width: '100%',
};

export const PlainTemplate: FC<PlainTemplate> = ({
  markdown,
  unsubscribeMarkdown,
  preview,
  withHtml,
}) => {
  return (
    <Wrapper
      preview={preview}
      bodyClassName="my-auto mx-auto bg-white p-0 w-full max-w-full font-sans"
      withHtml={withHtml}
    >
      <Container style={container}>
        <Section style={section}>
          <MarkdownContainer markdown={markdown} />
          <MarkdownContainer
            markdown={unsubscribeMarkdown}
            components={{
              a: (props: any) => <Link className="underline" {...props} />,
            }}
          />
        </Section>
        <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe!!</Link>
      </Container>
    </Wrapper>
  );
};
