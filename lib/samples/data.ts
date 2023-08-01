import { UserUsageStats } from '@/pages/api/cron/weekly-update-email';

export const sampleUserUsageStats: UserUsageStats = {
  teamUsageStats: [
    {
      name: 'Sample team',
      slug: 'sample-team-slug',
      tierName: 'Pro',
      numMonthlyAllowedCompletions: 1000,
      numAllowedEmbeddings: 1_000_000,
      projectUsageStats: [
        {
          name: 'Sample project',
          slug: 'sample-project-slug',
          numEmbeddingTokens: 9421,
          numFiles: 199,
          numSections: 401,
          latestQuestions: ['What is Markprompt?', 'What is React?'],
          unansweredQuestions: ['What is Markprompt?', 'What is React?'],
          numQuestionsAsked: 103,
          numQuestionsUnanswered: 21,
          numQuestionsDownvoted: 3,
          numQuestionsUpvoted: 9,
          mostCitedSources: ['Home', 'Getting started'],
        },
        {
          name: 'Sample project 2',
          slug: 'sample-project-slug-2',
          numEmbeddingTokens: 1203,
          numFiles: 234,
          numSections: 401,
          latestQuestions: [],
          unansweredQuestions: [],
          numQuestionsAsked: 103,
          numQuestionsUnanswered: 21,
          numQuestionsDownvoted: 0,
          numQuestionsUpvoted: 0,
          mostCitedSources: ['Welcome'],
        },
      ],
    },
    {
      name: 'Sample team 2',
      slug: 'sample-team-slug-2',
      tierName: 'Pro',
      numMonthlyAllowedCompletions: 1000,
      numAllowedEmbeddings: 1_000_000,
      projectUsageStats: [
        {
          name: 'Sample project 2',
          slug: 'sample-project-slug-2',
          numEmbeddingTokens: 9421,
          numFiles: 199,
          numSections: 401,
          latestQuestions: [],
          unansweredQuestions: [],
          numQuestionsAsked: 103,
          numQuestionsUnanswered: 21,
          numQuestionsDownvoted: 3,
          numQuestionsUpvoted: 9,
          mostCitedSources: [],
        },
      ],
    },
  ],
};
export default sampleUserUsageStats;
