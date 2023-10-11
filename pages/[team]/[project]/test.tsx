import NotionPagesOnboardingDialog from '@/components/dialogs/sources/onboarding/NotionPages';

const Data = () => {
  return (
    <NotionPagesOnboardingDialog
      open={true}
      // onOpenChange={(open) => {
      //   if (!open) {
      //     setSourceDialogOpen(undefined);
      //   }
      // }}
    />
  );
};

export default Data;
