import { TeamSettingsLayout } from '@/components/layouts/TeamSettingsLayout';
import PlanPicker from '@/components/team/PlanPicker';
import useTeam from '@/lib/hooks/use-team';
import { getTier, getTierName } from '@/lib/stripe/tiers';

const Team = () => {
  const { team } = useTeam();

  return (
    <TeamSettingsLayout
      title="Plans"
      width="2xl"
      SubHeading={
        !team ? (
          <></>
        ) : (
          <p className="mb-6 text-sm text-neutral-500">
            You are currently on the{' '}
            <span className="font-semibold text-neutral-400">
              {getTierName(getTier(team))}
            </span>{' '}
            plan.
          </p>
        )
      }
    >
      <PlanPicker />
    </TeamSettingsLayout>
  );
};

export default Team;
