import * as Accordion from '@radix-ui/react-accordion';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { ChangeEvent, FC } from 'react';
import { toast } from 'react-hot-toast';

import { useConfigContext } from '@/lib/context/config';
import useTeam from '@/lib/hooks/use-team';
import { canConfigureModel } from '@/lib/stripe/tiers';

import { ModelPicker } from './ModelPicker';
import { Row } from './PlaygroundDashboard';
import { UpgradeNote } from './UpgradeNote';
import { AccordionContent, AccordionTrigger } from '../ui/Accordion';
import Button from '../ui/Button';
import { SliderInput } from '../ui/SliderInput';
import { NoAutoTextArea } from '../ui/TextArea';

type ModelConfiguratorProps = {
  className?: string;
};

export const ModelConfigurator: FC<ModelConfiguratorProps> = () => {
  const { team } = useTeam();
  const { modelConfig, setModelConfig, resetModelConfigDefaults } =
    useConfigContext();

  return (
    <div className="flex flex-col gap-2">
      <Row label="Model">
        <ModelPicker />
      </Row>
      <Accordion.Root className="mt-2 w-full" type="single" collapsible>
        <Accordion.Item value="options">
          <AccordionTrigger>Advanced configuration</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              {team && !canConfigureModel(team) && (
                <UpgradeNote showDialog>
                  You can experiment with custom model configurations here. In
                  order to use them in production, please upgrade to the Pro
                  plan.
                </UpgradeNote>
              )}

              <Row className="mt-4" label="Prompt template" />
              <div className="-mt-1 flex w-full">
                <NoAutoTextArea
                  value={modelConfig.promptTemplate}
                  className="h-[400px] w-full"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setModelConfig({
                      ...modelConfig,
                      promptTemplate: event.target.value,
                    });
                  }}
                />
              </div>
              <Link
                href="/docs#templates"
                target="_blank"
                rel="noreferrer"
                className="button-ring flex w-min cursor-pointer flex-row items-center gap-2 truncate whitespace-nowrap rounded-md text-xs text-neutral-300"
              >
                <Info className="h-4 w-4 text-neutral-300" />
                <span className="subtle-underline">
                  Learn more about templates
                </span>
              </Link>

              <SliderInput
                label="Temperature"
                min={0}
                max={1}
                step={0.1}
                value={modelConfig.temperature}
                setValue={(value) => {
                  setModelConfig({ ...modelConfig, temperature: value });
                }}
              />
              <SliderInput
                label="Top P"
                min={0.1}
                max={1}
                step={0.01}
                value={modelConfig.topP}
                setValue={(value) => {
                  setModelConfig({ ...modelConfig, topP: value });
                }}
              />
              <SliderInput
                label="Frequency penalty"
                min={0}
                max={1}
                step={0.1}
                value={modelConfig.frequencyPenalty}
                setValue={(value) => {
                  setModelConfig({ ...modelConfig, frequencyPenalty: value });
                }}
              />
              <SliderInput
                label="Presence penalty"
                min={0}
                max={1}
                step={0.1}
                value={modelConfig.presencePenalty}
                setValue={(value) => {
                  setModelConfig({ ...modelConfig, presencePenalty: value });
                }}
              />
              <SliderInput
                label="Max tokens"
                min={50}
                max={1024}
                step={1}
                value={modelConfig.maxTokens}
                setValue={(value) => {
                  setModelConfig({ ...modelConfig, maxTokens: value });
                }}
              />
              <div className="mt-2 border-t border-neutral-900 pt-2" />

              <Button
                buttonSize="sm"
                variant="plain"
                onClick={() => {
                  resetModelConfigDefaults();
                  toast.success('Model defaults restored.');
                }}
              >
                Restore model defaults
              </Button>
            </div>
          </AccordionContent>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
};
