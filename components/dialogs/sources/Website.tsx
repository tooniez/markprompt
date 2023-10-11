import * as Dialog from '@radix-ui/react-dialog';
import { track } from '@vercel/analytics';
import {
  ErrorMessage,
  Field,
  Form,
  Formik,
  FormikErrors,
  FormikValues,
} from 'formik';
import dynamic from 'next/dynamic';
import { ChangeEvent, FC, ReactNode, useState } from 'react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import { ErrorLabel } from '@/components/ui/Forms';
import { NoAutoInput } from '@/components/ui/Input';
import { Note } from '@/components/ui/Note';
import { addSource, deleteSource } from '@/lib/api';
import useProject from '@/lib/hooks/use-project';
import useSources from '@/lib/hooks/use-sources';
import useTeam from '@/lib/hooks/use-team';
import useUsage from '@/lib/hooks/use-usage';
import useUser from '@/lib/hooks/use-user';
import { isWebsiteAccessible } from '@/lib/integrations/website';
import { isCustomPageFetcherEnabled } from '@/lib/stripe/tiers';
import { getLabelForSource, toNormalizedUrl } from '@/lib/utils';
import { Project } from '@/types/types';

import SourceDialog from './SourceDialog';

const Loading = <p className="p-4 text-sm text-neutral-500">Loading...</p>;

const DocsLimit = dynamic(() => import('@/components/files/DocsLimit'), {
  loading: () => Loading,
});

const _addSource = async (
  projectId: Project['id'],
  url: string,
  mutate: () => void,
) => {
  try {
    const newSource = await addSource(projectId, 'website', {
      url,
    });
    await mutate();
    toast.success(
      `The source ${getLabelForSource(
        newSource,
        true,
      )} has been added to the project.`,
    );
  } catch (e) {
    console.error(e);
    toast.error(`${e}`);
  }
};

type WebsiteSourceProps = {
  clearPrevious?: boolean;
  openPricingAsDialog?: boolean;
  onDidAddSource: () => void;
};

const WebsiteSource: FC<WebsiteSourceProps> = ({
  clearPrevious,
  onDidAddSource,
}) => {
  const { team } = useTeam();
  const { project } = useProject();
  const { user } = useUser();
  const { isInfiniteEmbeddingsTokensAllowance } = useUsage();
  const { sources, mutate } = useSources();
  const [website, setWebsite] = useState('');

  if (!user) {
    return <></>;
  }

  return (
    <>
      <Formik
        initialValues={{ website: '' }}
        validateOnBlur
        onSubmit={async (_values, { setSubmitting, setErrors }) => {
          if (!project || !website) {
            return;
          }

          let url = toNormalizedUrl(website);

          const useCustomPageFetcher = !!(
            team && isCustomPageFetcherEnabled(team)
          );
          let isAccessible = await isWebsiteAccessible(
            url,
            useCustomPageFetcher,
          );
          if (!isAccessible) {
            url = toNormalizedUrl(website, true);
            isAccessible = await isWebsiteAccessible(url, useCustomPageFetcher);
          }

          if (!isAccessible) {
            const errors: FormikErrors<FormikValues> = {
              website: `Website is not accessible. If your website has security
                  checks, this might be the reason. Please contact us at ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL} to discuss options.`,
            };
            setErrors(errors);
            return;
          }

          setSubmitting(true);
          if (clearPrevious) {
            for (const source of sources) {
              await deleteSource(project.id, source.id);
            }
          }
          track('connect website');
          await _addSource(project.id, url, mutate);
          setSubmitting(false);
          onDidAddSource();
        }}
      >
        {({ isSubmitting, isValid }) => (
          <Form className="h-full flex-grow">
            <div className="flex h-full flex-grow flex-col gap-2">
              <div className="h-flex-none mt-4 flex flex-col gap-1 px-4 pb-8">
                <p className="mb-1 flex-none text-sm font-medium text-neutral-300">
                  Website or sitemap URL
                </p>
                <div className="flex flex-none flex-row gap-2">
                  <Field
                    className="flex-grow"
                    type="text"
                    name="website"
                    placeholder="example.com, example.com/sitemap.xml"
                    inputSize="sm"
                    as={NoAutoInput}
                    disabled={isSubmitting}
                    value={website}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setWebsite(event.target.value);
                    }}
                  />
                  <Button
                    className="flex-none"
                    disabled={!isValid}
                    loading={isSubmitting}
                    variant="plain"
                    buttonSize="sm"
                    type="submit"
                  >
                    Connect
                  </Button>
                </div>
                <ErrorMessage name="website" component={ErrorLabel} />
                <Note size="sm" className="mt-4" type="warning">
                  Make sure the website allows you to index its content. Do not
                  build on top of other people&apos;s work unless you have
                  explicit authorization to do so.
                </Note>
                {!isInfiniteEmbeddingsTokensAllowance && (
                  <div className="mt-2 rounded-md border border-neutral-900">
                    <DocsLimit />
                  </div>
                )}
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
};

const WebsiteAddSourceDialog = ({
  open,
  onOpenChange,
  openPricingAsDialog,
  onDidAddSource,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  openPricingAsDialog?: boolean;
  onDidAddSource?: () => void;
  children?: ReactNode;
}) => {
  return (
    <SourceDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={children && <Dialog.Trigger asChild>{children}</Dialog.Trigger>}
      title="Connect website"
      description="Sync pages from a website."
    >
      <WebsiteSource
        openPricingAsDialog={openPricingAsDialog}
        onDidAddSource={() => {
          onOpenChange?.(false);
          onDidAddSource?.();
        }}
      />
    </SourceDialog>
  );
};

export default WebsiteAddSourceDialog;
