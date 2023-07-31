import {
  Button,
  Column,
  Container,
  Heading,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { format } from 'date-fns';
import { FC } from 'react';

import { UserUsageStats } from '@/pages/api/cron/weekly-update-email';

import { Wrapper } from './templates/Shared';
import { SocialSection } from './templates/SocialSection';

type InsightsEmailProps = {
  preview: string;
  withHtml: boolean;
  stats: UserUsageStats;
  from: Date;
  to: Date;
};

// We create the email component as a standalone component, instead of
// creating it in the page itself, to avoid hydration errors (we
// import the component dynamically with SSR = false).
export const InsightsEmail: FC<InsightsEmailProps> = ({
  preview,
  withHtml,
  stats,
  from,
  to,
}) => {
  return (
    <Wrapper
      preview={preview}
      bodyClassName="my-auto mx-auto bg-white font-sans"
      withHtml={withHtml}
    >
      <Container className="mx-auto w-full max-w-[720px] border-separate">
        <Section>
          <Img
            src="https://res.cloudinary.com/djp21wtxm/image/upload/v1689959311/Email_u1tegg.png"
            width={50}
            height={50}
            alt="Markprompt logo"
          />
        </Section>
        <Heading className="mt-8 text-xl font-bold">Weekly report</Heading>
        <Text className="mt-4 text-sm text-neutral-600">
          {format(from, 'LLL dd')} - {format(to, 'LLL dd, y')}
        </Text>
        <Hr className="mt-8 border-neutral-200" />
        {!stats.teamUsageStats || stats.teamUsageStats.length === 0 ? (
          <Text className="text-sm text-neutral-600">
            You are not a member of any team currently.
          </Text>
        ) : (
          stats.teamUsageStats.map((team, i) => {
            return (
              <Section key={`team-${i}`}>
                <Section className={i > 0 ? 'mt-8' : ''}>
                  <Heading className="mt-8 w-min truncate whitespace-nowrap text-lg font-bold">
                    {team.name}
                  </Heading>
                  <Text className="mb-0 text-sm text-neutral-600">
                    Plan: {team.tierName}
                  </Text>
                  <Text className="mt-2 text-sm text-neutral-600">
                    Projects: {team.projectUsageStats.length || 0}
                  </Text>
                </Section>
                {team.projectUsageStats?.map((project, j) => {
                  return (
                    <Section
                      key={`team-${i}-project-${j}`}
                      className="mt-4 mb-4 border-separate overflow-hidden rounded-lg border border-solid"
                      style={{
                        // backgroundColor: '#fafafa',
                        // borderColor: '#f5f5f5',
                        // background: 'rgb(245, 245, 245)',
                        background: 'rgb(245, 244, 245)',
                        borderColor: 'rgb(229, 229, 229)',
                        // borderRadius: '4px',
                        // marginRight: '50px',
                        // marginBottom: '30px',
                        padding: '24px 24px',
                      }}
                    >
                      <Row>
                        <Column>
                          <Heading className="w-min truncate whitespace-nowrap font-bold">
                            {project.name}
                          </Heading>
                        </Column>
                        <Column align="right">
                          <Button
                            pX={10}
                            pY={10}
                            className="flex-none rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white no-underline"
                            href={`https://markprompt.com/${team.slug}/${project.slug}`}
                          >
                            View in dashboard
                          </Button>
                        </Column>
                      </Row>
                      <Section
                        className="mt-6 border-separate rounded-md border border-solid"
                        style={{
                          // backgroundColor: '#fafafa',
                          // borderColor: '#f5f5f5',
                          background: 'rgb(250, 250, 250)',
                          borderColor: 'rgb(229, 229, 229)',
                          // borderRadius: '4px',
                          // marginRight: '50px',
                          // marginBottom: '30px',
                          padding: '24px 24px',
                        }}
                      >
                        <Row>
                          <Column className="p-4">
                            <Text className="mx-0 mt-0 mb-2 text-xl">📄</Text>
                            <Text className="m-0 text-sm font-bold">Files</Text>
                            <Text className="m-0 mt-2 text-sm text-neutral-600">
                              {project.numFiles}
                            </Text>
                          </Column>
                          {project.numQuestionsAsked > 0 && (
                            <Column className="p-4">
                              <Text className="mx-0 mt-0 mb-2 text-xl">💬</Text>
                              <Text className="m-0 text-sm font-bold">
                                Questions
                              </Text>
                              <Text className="m-0 mt-2 text-sm text-neutral-600">
                                {project.numQuestionsAsked}
                              </Text>
                            </Column>
                          )}
                          {project.numQuestionsUnanswered > 0 && (
                            <Column className="p-4">
                              <Text className="mx-0 mt-0 mb-2 text-xl">🤷‍♀️</Text>
                              <Text className="m-0 text-sm font-bold">
                                Unanswered
                              </Text>
                              <Text className="m-0 mt-2 text-sm text-neutral-600">
                                {project.numQuestionsUnanswered}
                              </Text>
                            </Column>
                          )}
                          {project.numQuestionsUpvoted > 0 && (
                            <Column className="px-4">
                              <Text className="mx-0 mt-0 mb-2 text-xl">👍</Text>
                              <Text className="m-0 text-sm font-bold">
                                Upvoted
                              </Text>
                              <Text className="m-0 mt-2 text-sm text-neutral-600">
                                {project.numQuestionsUpvoted}
                              </Text>
                            </Column>
                          )}
                          {project.numQuestionsDownvoted > 0 && (
                            <Column className="px-4">
                              <Text className="mx-0 mt-0 mb-2 text-xl">👎</Text>
                              <Text className="m-0 text-sm font-bold">
                                Downvoted
                              </Text>
                              <Text className="m-0 mt-2 text-sm text-neutral-600">
                                {project.numQuestionsDownvoted}
                              </Text>
                            </Column>
                          )}
                        </Row>
                      </Section>
                      {project.latestQuestions?.length > 0 && (
                        <>
                          <Heading className="mt-8 mb-4 w-min truncate whitespace-nowrap text-sm font-bold">
                            Recent questions{' '}
                            <Link
                              className="ml-2 text-sm font-normal text-violet-700 underline"
                              href={`https://markprompt.com/${team.slug}/${project.slug}/insights`}
                            >
                              See all
                            </Link>
                          </Heading>
                          {project.latestQuestions.map((question, k) => {
                            return (
                              <Text
                                key={`team-${i}-project-${j}-question-${k}`}
                                className="mb-0 mt-2 w-full overflow-hidden truncate text-sm text-neutral-900"
                              >
                                {/* • {question} */}a
                              </Text>
                            );
                          })}
                        </>
                      )}
                      {project.mostCitedSources?.length > 0 && (
                        <>
                          <Heading className="mt-6 mb-4 w-min truncate whitespace-nowrap text-sm font-bold">
                            Most cited sources{' '}
                            <Link
                              className="ml-2 text-sm font-normal text-violet-700 underline"
                              href={`https://markprompt.com/${team.slug}/${project.slug}/insights`}
                            >
                              See all
                            </Link>
                          </Heading>
                          {project.mostCitedSources.map((source, k) => {
                            return (
                              <Text
                                key={`team-${i}-project-${j}-question-${k}`}
                                className="mb-0 mt-2 w-full overflow-hidden truncate text-sm text-neutral-900"
                              >
                                {/* • {source} */}a
                              </Text>
                            );
                          })}
                        </>
                      )}
                    </Section>
                  );
                })}
              </Section>
            );
          })
        )}
        <SocialSection className="mt-8" excludeCTA />
        <Hr className="mt-8 border-neutral-200" />
        <Section className="mt-6">
          <Text className="text-xs text-neutral-500">
            Motif Land Inc, 2261 Market Street #4059, San Francisco CA, 94114
          </Text>
          <Text className="text-xs text-neutral-500">
            You are receiving this email because you signed up at{' '}
            <Link
              className="text-neutral-500 underline"
              href="https://markprompt.com"
            >
              markprompt.com
            </Link>
            . You can unsubscribe in your{' '}
            <Link
              className="text-neutral-500 underline"
              href="https://markprompt.com"
            >
              account settings
            </Link>
            .
          </Text>
        </Section>
      </Container>
    </Wrapper>
  );
};

export default InsightsEmail;
