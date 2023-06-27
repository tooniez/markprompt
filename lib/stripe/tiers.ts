import merge from 'lodash.merge';

import { Team } from '@/types/types';

import { roundToLowerOrderDecimal } from '../utils';

type Price = {
  amount: number;
  priceId: string;
};

export type PlanDetails = {
  // When a team has not signed up for a tier, these options are
  // enabled by default, e.g. during a testing period.
  trial?: { expires?: string; details: TierDetails };
  // These tiers are offered as options to a team, in addition to
  // the default ones.
  tiers: Tier[];
};

export type TierDetails = {
  quotas?: { embeddings?: number; completions?: number };
  features?: {
    insights?: { type: 'basic' | 'advanced' };
    sectionsAPI?: { enabled: boolean };
    customModelConfig?: { enabled: boolean };
    customPageFetcher?: { enabled: boolean };
    canRemoveBranding?: boolean;
  };
  maxProjects?: number;
  maxTeamMembers?: number;
};

export type Tier = {
  id: 'hobby' | 'starter' | 'pro' | 'placeholder-enterprise' | string;
  name?: string;
  description?: string;
  items?: string[];
  price?: {
    monthly?: Price;
    yearly?: Price;
  };
  details?: TierDetails;
};

export type TeamTierInfo = Pick<Team, 'stripe_price_id' | 'plan_details'>;

const useTestPriceId = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';

export const DEFAULT_TIERS: Tier[] = [
  {
    id: 'hobby',
    name: 'Hobby',
    description: 'For personal and non-commercial projects',
    items: [
      '30K tokens* (≈ 25 documents)',
      '25 GPT-4 completions per month',
      'Public/private GitHub repos',
    ],
    details: {
      quotas: {
        completions: 25,
        embeddings: 30000,
      },
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small projects',
    items: [
      '120K tokens* (≈ 100 documents)',
      '200 GPT-4 completions per month',
      'Usage analytics',
    ],
    price: {
      monthly: {
        amount: 25,
        priceId: useTestPriceId
          ? 'price_1N8Wh6Cv3sM26vDeKjjg71C7'
          : 'price_1N8WfxCv3sM26vDeN9BnA5D3',
      },
      yearly: {
        amount: 20,
        priceId: useTestPriceId
          ? 'price_1N8Wh6Cv3sM26vDeNTZ2D1K2'
          : 'price_1N8WfxCv3sM26vDerkB8Tkmz',
      },
    },
    details: {
      quotas: {
        completions: 200,
        embeddings: 120_000,
      },
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For production',
    items: [
      '600K tokens* (≈ 500 documents)',
      '1000 GPT-4 completions per month',
      'Prompt templates',
      'Model customization',
      'Basic insights',
    ],
    price: {
      monthly: {
        amount: 120,
        priceId: useTestPriceId
          ? 'price_1N0TzLCv3sM26vDeQ7VxLKWP'
          : 'price_1N0U0ICv3sM26vDes1KHwQ4y',
      },
      yearly: {
        amount: 100,
        priceId: useTestPriceId
          ? 'price_1N0TzLCv3sM26vDeIwhDValY'
          : 'price_1N0U0ICv3sM26vDebBlSdU2k',
      },
    },
    details: {
      quotas: {
        completions: 1000,
        embeddings: 600_000,
      },
    },
  },
];

export const PLACEHOLDER_ENTERPRISE_TIER: Tier = {
  id: 'placeholder-enterprise',
  name: 'Enterprise',
  description: 'For production',
  items: [
    'Teams',
    'Integrations',
    'Advanced insights',
    'Unbranded prompts',
    'Unlimited completions',
    'Custom source processing',
    'SSO/SAML',
    'Dedicated support',
    'White glove onboarding',
  ],
};

export const getDefaultTierFromPriceId = (
  priceId: string,
): Tier | undefined => {
  for (const tier of DEFAULT_TIERS) {
    if (
      tier.price?.monthly?.priceId === priceId ||
      tier.price?.yearly?.priceId === priceId
    ) {
      return tier;
    }
  }
  return undefined;
};

const getCustomTier = (teamTierInfo: TeamTierInfo): Tier | undefined => {
  // Return the custom tier that the team has subscribed to. This means
  // there is a valid stripe_price_id which matches with one tier in the
  // list of offered custom tiers for this team.
  if (!teamTierInfo.stripe_price_id) {
    return undefined;
  }
  return (teamTierInfo.plan_details as PlanDetails)?.tiers?.find((t) => {
    return (
      t.price?.monthly?.priceId === teamTierInfo.stripe_price_id ||
      t.price?.yearly?.priceId === teamTierInfo.stripe_price_id
    );
  });
};

export const getOfferedCustomTiers = (teamTierInfo: TeamTierInfo): Tier[] => {
  return (teamTierInfo?.plan_details as PlanDetails)?.tiers || [];
};

const getProTier = (): Tier => {
  return DEFAULT_TIERS.find((t) => t.id === 'pro')!;
};

export const getTier = (teamTierInfo: TeamTierInfo): Tier => {
  const customTier = getCustomTier(teamTierInfo);
  if (customTier) {
    return customTier;
  }
  if (teamTierInfo.stripe_price_id) {
    const tier = DEFAULT_TIERS.find((t) => {
      return (
        t.price?.monthly?.priceId === teamTierInfo.stripe_price_id ||
        t.price?.yearly?.priceId === teamTierInfo.stripe_price_id
      );
    });
    // If the plan is deprecated, assume it is a pro plan.
    return tier || getProTier();
  }
  return DEFAULT_TIERS.find((t) => t.id === 'hobby')!;
};

export const getTierName = (tier: Tier) => {
  // Unnamed tiers / non-default tiers are custom enterprise tiers.
  return tier.name || 'Enterprise';
};

const getTierDetails = (teamTierInfo: TeamTierInfo): TierDetails => {
  // If team has signed up for a custom tier, return the associated tier
  // details. If not, return the trial tier if set (e.g. during a
  // trial period, before any stripe_price_id is set), merged with the
  // default team tier details, if it exists. The trial tier values
  // take precedence over the ones coming from the tier. If a custom tier
  // is set, the trial tier details are ignored.
  // Also, a custom tier includes all features of the pro team, so we merge
  // the custom/trial tier details with those of the Pro tier,
  // giving precedence to the former.
  const customTier = getCustomTier(teamTierInfo);
  if (customTier?.details) {
    const proTier = getProTier();
    return merge(proTier.details, customTier.details);
  }
  const tierDetails = getTier(teamTierInfo)?.details || {};
  const trialTier = (teamTierInfo.plan_details as PlanDetails)?.trial?.details;
  return merge(tierDetails, trialTier);
};

const isProOrCustomTier = (teamTierInfo: TeamTierInfo): boolean => {
  // A team is at least Pro if it is on the default Pro plan, or if
  // it is on a custom plan.
  const customTier = getCustomTier(teamTierInfo);
  if (customTier) {
    return true;
  }
  const defaultTier = getTier(teamTierInfo);
  if (defaultTier) {
    return defaultTier.id === 'pro';
  }
  return false;
};

export const tokensToApproxParagraphs = (numTokens: number): number => {
  return roundToLowerOrderDecimal(numTokens / 200);
};

export const canRemoveBranding = (teamTierInfo: TeamTierInfo) => {
  return !!getTierDetails(teamTierInfo).features?.canRemoveBranding;
};

export const canConfigureModel = (teamTierInfo: TeamTierInfo) => {
  return isProOrCustomTier(teamTierInfo);
};

export const canViewInsights = (teamTierInfo: TeamTierInfo) => {
  const insightsType = getTierDetails(teamTierInfo).features?.insights?.type;
  return insightsType === 'basic' || insightsType === 'advanced';
};

export const isCustomPageFetcherEnabled = (teamTierInfo: TeamTierInfo) => {
  return !!getTierDetails(teamTierInfo).features?.customPageFetcher?.enabled;
};

export const getMonthlyCompletionsAllowance = (
  teamTierInfo: TeamTierInfo,
): number => {
  return getTierDetails(teamTierInfo).quotas?.completions || 0;
};

export const canAccessSectionsAPI = (teamTierInfo: TeamTierInfo): boolean => {
  return !!getTierDetails(teamTierInfo).features?.sectionsAPI?.enabled;
};

export const canUseCustomModelConfig = (
  teamTierInfo: TeamTierInfo,
): boolean => {
  return !!getTierDetails(teamTierInfo).features?.customModelConfig?.enabled;
};

export const getEmbeddingTokensAllowance = (
  teamTierInfo: TeamTierInfo,
): number => {
  // This is an accumulated allowance, not a monthly allowance like
  // completions tokens.
  const tierDetails = getTierDetails(teamTierInfo);
  return tierDetails.quotas?.embeddings || 0;
};

const MAX_EMBEDDINGS_TOKEN_ALLOWANCE = 1_000_000_000;

// Plans with infinite embeddings tokens allowance still have a limit, not
// visible to the user.
export const isInifiniteEmbeddingsTokensAllowance = (numTokens: number) => {
  return numTokens >= MAX_EMBEDDINGS_TOKEN_ALLOWANCE;
};
